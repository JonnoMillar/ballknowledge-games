'use client';
import { useMemo, useState } from 'react';
import { search, type SearchIndex } from '../src/lib/search/index';
import { adjacentSlots } from '../src/lib/puzzle/edges';
import type { GameState } from '../src/game/state';

/**
 * Search only. No suggestions, no recent searches, no default results.
 *
 * The pool is searched, never listed: any name rendered beside an open slot is
 * an answer to it. `search()` returns [] for an empty query, and this component
 * must never add a list of its own.
 *
 * Results show the name and nothing else. Never fame — that is the whole game.
 */
export default function SearchPanel({
  state, index, focusedSlot, onAddToBench, onPlace,
}: {
  state: GameState;
  index: SearchIndex;
  focusedSlot: string | null;
  onAddToBench: (playerId: string) => void;
  onPlace: (slotId: string, playerId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(index, query, 14), [index, query]);

  // Who this slot is adjacent to, and whether they are on the pitch yet.
  // NOT what the link "must" be — the board prescribes nothing. Where the links
  // fall is the player's decision; the only target is 100 chemistry.
  const neighbours = focusedSlot
    ? adjacentSlots(state.formation, focusedSlot).map((n) => ({
        slot: n,
        name: state.placed[n] ? state.pool.get(state.placed[n]!)!.name : null,
      }))
    : [];

  return (
    <div style={{ width: 316, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--line)' }}>
      <div style={{ padding: '18px 18px 14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div className="cond" style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.2em', color: 'var(--muted)', marginBottom: 10 }}>
          SEARCH
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 5, padding: '10px 13px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b7396" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4.5-4.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={focusedSlot ? `Name a ${focusedSlot}...` : 'Name a player...'}
            style={{ flexGrow: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15 }}
          />
        </div>
        <div className="cond" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--dim)', marginTop: 8 }}>
          SEARCHING {state.pool.size.toLocaleString()} PLAYERS
        </div>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {results.map((p) => {
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid rgba(29,41,66,0.5)' }}>
              <span style={{ fontSize: 14, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button
                onClick={() => onAddToBench(p.id)}
                style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--soft)', borderRadius: 4, padding: '4px 9px', fontSize: 12, cursor: 'pointer' }}
              >
                Bench
              </button>
              {focusedSlot ? (
                <button
                  onClick={() => onPlace(focusedSlot, p.id)}
                  style={{ background: 'var(--green)', border: 'none', color: 'var(--bg)', borderRadius: 4, padding: '4px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {focusedSlot}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {focusedSlot ? (
        <div style={{ borderTop: '1px solid var(--line)', padding: 18 }}>
          <div className="cond" style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 11 }}>
            {focusedSlot} CONNECTS TO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {neighbours.map((n) => (
              <div key={n.slot} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: n.name ? 1 : 0.45 }}>
                <span style={{
                  width: 22, height: 3, borderRadius: 2, flexShrink: 0,
                  background: n.name ? 'var(--soft)' : 'repeating-linear-gradient(90deg, #33455f 0 3px, transparent 3px 7px)',
                }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: n.name ? 'var(--text)' : 'var(--soft)' }}>
                  {n.name ?? n.slot}
                </span>
                {!n.name && (
                  <span className="cond" style={{ marginLeft: 'auto', fontSize: 12, letterSpacing: '0.1em', color: 'var(--muted)' }}>
                    EMPTY
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
