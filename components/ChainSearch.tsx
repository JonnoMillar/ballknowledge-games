'use client';
import { useMemo, useState } from 'react';
import PlayerCard from './PlayerCard';
import { tiltFor } from './swing';
import { neighboursOf } from '../src/lib/chain/score';
import { search, type SearchIndex } from '../src/lib/search/index';
import { NEUTRAL } from '../src/lib/club-colours';
import type { ChainState } from '../src/game/chainState';
import type { PortraitImage } from '../src/lib/portraits';

/**
 * Search only. No suggestions, no recent searches, no default results.
 *
 * The pool is searched, never listed: any name rendered beside an open slot is
 * an answer to it, and on a chain that is far more dangerous than on an XI —
 * a blank has exactly two neighbours, so a single leaked name can be the whole
 * puzzle. `search()` returns [] for an empty query, and this component must
 * never add a list of its own.
 *
 * Results show the print and the name and nothing else. Never fame — that is
 * the whole game.
 *
 * The results are an album page, not a list. The rail was a column of names
 * with buttons beside them, which on a screen made of paper and prints was
 * the one thing that looked like a form. The card that comes back for a name
 * is the same mounted print that will hang on the board — the kit, the face,
 * the plate name — so pulling a player out of the index is picking a
 * photograph out of an album, and it can be dragged straight onto a plate.
 */

/** A compact print is 92 wide; three of them and two gutters, plus the
    margin the red rule needs on the left, the rail's own ink edge and a few
    pixels so a print leaning over never tips the row to two across. */
const CARD = 92;
const GAP = 12;
const RAIL = 46 + CARD * 3 + GAP * 2 + 18 + 2 + 6;

/**
 * The page before anything is on it.
 *
 * Six sets of photo corners, the way an album page waits. Not dashed boxes —
 * a dashed rectangle is a control — and not a sentence: the corners say what
 * goes here, and the search box above says how.
 */
function EmptyPage() {
  const corner = (angle: number) => (
    <span
      style={{
        position: 'absolute', width: 12, height: 12,
        borderTop: '2px solid rgba(26,20,16,0.16)', borderLeft: '2px solid rgba(26,20,16,0.16)',
        transform: `rotate(${angle}deg)`,
        ...(angle === 0 ? { top: 0, left: 0 } : angle === 90 ? { top: 0, right: 0 } : angle === 180 ? { bottom: 0, right: 0 } : { bottom: 0, left: 0 }),
      }}
    />
  );
  return (
    <div aria-hidden style={{ display: 'flex', flexWrap: 'wrap', gap: `${GAP + 14}px ${GAP}px`, padding: '26px 18px 22px 46px' }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ position: 'relative', width: CARD, height: 120, transform: `rotate(${tiltFor(`corner-${i}`, 1.4)}deg)` }}>
          {corner(0)}{corner(90)}{corner(180)}{corner(270)}
        </div>
      ))}
    </div>
  );
}

export default function ChainSearch({
  state, index, images, focused, onAddToBench, onPlace,
}: {
  state: ChainState;
  index: SearchIndex;
  images: Record<string, PortraitImage>;
  /** The slot the player has clicked into, if any. */
  focused: number | null;
  onAddToBench: (playerId: string) => void;
  onPlace: (index: number, playerId: string) => void;
}) {
  const [query, setQuery] = useState('');
  // Fifteen: three across, five down, one album page.
  const results = useMemo(() => search(index, query, 15), [index, query]);

  // Who the focused slot sits between. Names only — no hint about what would
  // link, because working that out is the puzzle.
  const neighbours = focused === null
    ? []
    : neighboursOf(focused, state.filled.length, state.puzzle.closed)
        .map(({ slot: i }) => {
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
      style={{ width: RAIL, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '2px solid var(--ink)', position: 'relative' }}
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

      <div style={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {results.length === 0 ? (
          <EmptyPage />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${GAP + 6}px ${GAP}px`, padding: '22px 18px 22px 46px' }}>
            {results.map((p) => {
              // A player holds at most one slot. Saying so under the print is
              // clearer than leaving a Place button that silently does nothing.
              const inChain = state.filled.includes(p.id);
              return (
                <div key={p.id} style={{ width: CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: inChain ? 0.5 : 1 }}>
                  {/* `slotId="index"` keeps this draggable's id distinct from
                      the same player's print on the shortlist, and tells the
                      drop handler where it came from. */}
                  <PlayerCard
                    player={p}
                    variant="library"
                    slotId="index"
                    images={images}
                    obscurity={null}
                    compact
                    ring={NEUTRAL}
                    tilt={tiltFor(`index-${p.id}`, 2)}
                  />
                  {/* The full name, because the plate carries the surname
                      and the index is where Rio and Anton part ways. */}
                  <div className="read" title={p.name} style={{ fontSize: 11, lineHeight: 1.2, color: 'var(--soft)', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  {inChain ? (
                    <span className="cond" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--green)' }}>
                      IN CHAIN
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => onAddToBench(p.id)}
                        disabled={state.submitted}
                        className="narrow"
                        style={{ background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--soft)', borderRadius: 0, padding: '3px 7px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: state.submitted ? 'not-allowed' : 'pointer' }}
                      >
                        Bench
                      </button>
                      {focused !== null && !state.submitted ? (
                        <button
                          onClick={() => onPlace(focused, p.id)}
                          className="narrow"
                          style={{ background: 'var(--ink)', border: '1.5px solid var(--ink)', color: 'var(--panel)', borderRadius: 0, padding: '3px 7px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                        >
                          Place
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
