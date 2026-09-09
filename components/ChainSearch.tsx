'use client';
import { useMemo, useState } from 'react';
import { search, type SearchIndex } from '../src/lib/search/index';
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
 * Results show the name and nothing else. Never fame — that is the whole game.
 */
export default function ChainSearch({
  state, index, focused, onAddToBench, onPlace,
}: {
  state: ChainState;
  index: SearchIndex;
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
    // The card index. It was a plain white column, which is the one surface on
    // this screen that had no idea what world it was in — so it gets the
    // furniture of the thing it actually is: ruled stock, a red margin down
    // the left, and a hard ink edge where it meets the desk.
    <div
      className="index-card"
      style={{ width: 316, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '2px solid var(--ink)', position: 'relative' }}
    >
      <div style={{ padding: '18px 18px 14px 46px', borderBottom: '1.5px solid rgba(26,20,16,0.3)' }}>
        <div className="narrow" style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
          The card index
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel-2)', border: '1.5px solid var(--ink)', borderRadius: 0, padding: '10px 13px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4.5-4.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name a player..."
            className="read"
            style={{ flexGrow: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15 }}
          />
        </div>
        <div className="cond" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--dim)', marginTop: 8 }}>
          SEARCHING {state.pool.size.toLocaleString()} PLAYERS
        </div>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {results.map((p) => {
          // A player holds at most one slot. Saying so on the row is clearer
          // than leaving a Place button that silently does nothing.
          const inChain = state.filled.includes(p.id);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 10px 46px', borderBottom: '1px dotted rgba(26,20,16,0.28)', opacity: inChain ? 0.55 : 1 }}>
              <span className="read" style={{ fontSize: 15, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              {inChain ? (
                <span
                  className="cond"
                  style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--green)' }}
                >
                  IN CHAIN
                </span>
              ) : (
                <>
                  <button
                    onClick={() => onAddToBench(p.id)}
                    disabled={state.submitted}
                    className="narrow"
                    style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--soft)', borderRadius: 0, padding: '4px 9px', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: state.submitted ? 'not-allowed' : 'pointer' }}
                  >
                    Bench
                  </button>
                  {focused !== null && !state.submitted ? (
                    <button
                      onClick={() => onPlace(focused, p.id)}
                      className="narrow"
                      style={{ background: 'var(--ink)', border: '1.5px solid var(--ink)', color: 'var(--panel)', borderRadius: 0, padding: '4px 9px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                      Place
                    </button>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>

      {focused !== null ? (
        <div style={{ borderTop: '1.5px solid rgba(26,20,16,0.3)', padding: '18px 18px 18px 46px' }}>
          <div className="cond" style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', color: 'var(--muted)', marginBottom: 11 }}>
            THIS SLOT SITS BETWEEN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {neighbours.map((n) => (
              <div key={n.index} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: n.name ? 1 : 0.45 }}>
                <span style={{
                  width: 22, height: 3, borderRadius: 2, flexShrink: 0,
                  background: n.name ? 'var(--soft)' : 'repeating-linear-gradient(90deg, rgba(26,20,16,0.42) 0 3px, transparent 3px 7px)',
                }} />
                <span className="read" style={{ fontSize: 15, color: n.name ? 'var(--text)' : 'var(--soft)' }}>
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
