'use client';
import { useMemo, useState } from 'react';
import { search, type SearchIndex } from '../src/lib/search/index';
import { isoForNation } from '../src/pipeline/nations';
import type { ChainState } from '../src/game/chainState';

/**
 * Search only. No suggestions, no recent searches, no default results.
 *
 * The pool is searched, never listed: any name rendered beside an open slot is
 * an answer to it, and on a chain that is far more dangerous than on an XI —
 * a blank has exactly two neighbours, so a single leaked name can be the whole
 * puzzle. `search()` returns [] for an empty query, and this component must
 * never add a list of its own.
 *
 * Results show name and nation. Never fame — that is the whole game.
 */
export default function ChainSearch({
  state, index, nations, focused, onAddToBench, onPlace,
}: {
  state: ChainState;
  index: SearchIndex;
  nations: Record<string, string>;
  /** The slot the player has clicked into, if any. */
  focused: number | null;
  onAddToBench: (playerId: string) => void;
  onPlace: (index: number, playerId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => search(index, query, 14), [index, query]);

  // Who the focused slot sits between. Names only — no hint about what would
  // link, because working that out is the puzzle.
  const neighbours = focused === null
    ? []
    : [focused - 1, focused + 1]
        .filter((i) => i >= 0 && i < state.filled.length)
        .map((i) => {
          const id = state.filled[i];
          return { index: i, name: id ? state.pool.get(id)?.name ?? null : null };
        });

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
            placeholder="Name a player..."
            style={{ flexGrow: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15 }}
          />
        </div>
        <div className="cond" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--dim)', marginTop: 8 }}>
          SEARCHING {state.pool.size.toLocaleString()} PLAYERS
        </div>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {results.map((p) => {
          const iso = isoForNation(p.nation, nations);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid rgba(29,41,66,0.5)' }}>
              {iso
                ? <span className={`fi fi-${iso}`} style={{ width: 18, height: 13, borderRadius: 1, flexShrink: 0 }} />
                : <span style={{ width: 18, height: 13, borderRadius: 1, background: 'var(--slot-border)', flexShrink: 0 }} />}
              <span style={{ fontSize: 14, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button
                onClick={() => onAddToBench(p.id)}
                style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--soft)', borderRadius: 4, padding: '4px 9px', fontSize: 12, cursor: 'pointer' }}
              >
                Bench
              </button>
              {focused !== null ? (
                <button
                  onClick={() => onPlace(focused, p.id)}
                  style={{ background: 'var(--green)', border: 'none', color: 'var(--bg)', borderRadius: 4, padding: '4px 9px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Place
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {focused !== null ? (
        <div style={{ borderTop: '1px solid var(--line)', padding: 18 }}>
          <div className="cond" style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 11 }}>
            THIS SLOT SITS BETWEEN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {neighbours.map((n) => (
              <div key={n.index} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: n.name ? 1 : 0.45 }}>
                <span style={{
                  width: 22, height: 3, borderRadius: 2, flexShrink: 0,
                  background: n.name ? 'var(--soft)' : 'repeating-linear-gradient(90deg, #33455f 0 3px, transparent 3px 7px)',
                }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: n.name ? 'var(--text)' : 'var(--soft)' }}>
                  {n.name ?? 'empty'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
