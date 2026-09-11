'use client';
import { useEffect, useState } from 'react';
import type { SlotDepth } from '../src/lib/chain/score';
import type { SlotOutcome } from '../src/lib/chain/result';
import type { Player } from '../src/lib/chemistry/types';
import type { PortraitImage } from '../src/lib/portraits';
import { plateName } from '../src/lib/short-name';

/**
 * The depth column — how far down you dug for this pick, as a countdown.
 *
 * The reference is the Pointless tower. The number starts at the size of the
 * field — everyone who would have completed this link — and counts DOWN at a
 * constant tick to the rank of the one you found, the fill draining with it,
 * until it stops dead. Lower is deeper. 1 means nobody in the field is more
 * obscure than your pick, and the tower floods gold.
 *
 * The old gauge was a four-pixel track with a three-pixel marker, on which
 * 6th of 16 and 14th of 16 were fifty pixels apart and indistinguishable. A
 * countdown that could have stopped at any moment and stopped HERE is the
 * same fact with the tension left in.
 *
 * The tick is constant, whatever the field size, because a stop you can time
 * is no stop at all. It is clamped so a field of 16 is readable and a field of
 * 254 is a blur that ends — and a famous pick stopping almost at once is
 * exactly the joke it should be.
 *
 * Under the tower is THE FLOOR: the deepest answer that was sitting there,
 * as a face, a name and a score. That is what the countdown was heading for,
 * and it replaces two paragraphs that used to say the same thing.
 *
 * No names are shown until the sheet is sealed, so even the field size
 * cannot help anyone solve it.
 */

/** The deepest answer for this slot, at the foot of the column. */
export interface Floor {
  id: string;
  /** Already shortened for a nameplate — see `plateName`. */
  name: string;
  score: number;
  /** The player found it themselves: it is their own face down there. */
  mine: boolean;
}

/** Everything a column needs, computed once by the sealed sheet. */
export interface ColumnSpec {
  /** Null when the pick did not link — the tower is stamped instead of run. */
  depth: SlotDepth | null;
  floor: Floor | null;
  image: PortraitImage | undefined;
}

/**
 * What one slot's column shows, from what the sealed sheet measured.
 *
 * The floor is the player's own pick when their rank is 1 — nobody in the
 * field is deeper, whatever `best`'s fame floor says — or when `best` IS
 * their pick. Otherwise it is `best`. The two disagree only in the fame-floor
 * tail (see HANDOFF), and "you are the floor" is the reading that is true of
 * the field the column just counted.
 */
export function columnSpecFor(
  outcome: SlotOutcome,
  pool: ReadonlyMap<string, Player>,
  images: Record<string, PortraitImage>,
): ColumnSpec {
  const depth = outcome.held ? outcome.depth : null;
  const mine = outcome.playerId !== null && outcome.held
    && (depth?.rank === 1 || outcome.best?.id === outcome.playerId);
  let floor: Floor | null = null;
  if (mine && outcome.playerId) {
    const me = pool.get(outcome.playerId);
    floor = { id: outcome.playerId, name: plateName(outcome.playerId, me?.name ?? outcome.playerId), score: depth?.score ?? 0, mine: true };
  } else if (outcome.best) {
    floor = { id: outcome.best.id, name: plateName(outcome.best.id, outcome.best.name), score: outcome.best.score, mine: false };
  }
  return { depth, floor, image: floor ? images[floor.id] : undefined };
}

const TOWER_H = 120;

/**
 * The countdown's timing, so the sheet can schedule what follows it from
 * its own single set of timers rather than waiting on a callback.
 */
export function columnSchedule(depth: SlotDepth | null): { ticks: number; every: number; total: number } {
  if (!depth || depth.rank === null) return { ticks: 0, every: 0, total: 420 };
  const ticks = Math.max(0, depth.fieldSize - depth.rank);
  const every = Math.max(46, Math.min(170, 1500 / Math.max(ticks, 1)));
  // A beat on the starting number, the run, and the landing before the floor.
  return { ticks, every, total: 380 + ticks * every + 260 };
}

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}TH`;
  return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH'}`;
};

export default function DepthColumn({ spec, run, instant = false }: {
  spec: ColumnSpec;
  /** False while the string is still running: the tower waits in pencil. */
  run: boolean;
  /**
   * Land on the rank at once. The live board, after the sealed sheet is put
   * away, shows the columns as they ended up — replaying the countdown there
   * would be a second reveal of a result already known.
   */
  instant?: boolean;
}) {
  const { depth, floor, image } = spec;
  const field = depth?.fieldSize ?? 0;
  const target = depth?.rank ?? null;
  const [n, setN] = useState(field);
  const [landed, setLanded] = useState(false);
  const [showFloor, setShowFloor] = useState(false);

  useEffect(() => {
    if (!run) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { every, total } = columnSchedule(depth);
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (target === null) {
      // No link, no countdown: the die goes on and the floor comes up.
      timers.push(setTimeout(() => setShowFloor(true), total));
      return () => timers.forEach(clearTimeout);
    }

    if (reduced || instant) {
      setN(target); setLanded(true); setShowFloor(true);
      return;
    }

    let k = field;
    const tick = () => {
      k -= 1;
      setN(k);
      if (k > target) timers.push(setTimeout(tick, every));
      else {
        setLanded(true);
        timers.push(setTimeout(() => setShowFloor(true), 260));
      }
    };
    if (field > target) timers.push(setTimeout(tick, 380));
    else { setLanded(true); timers.push(setTimeout(() => setShowFloor(true), 260)); }

    return () => timers.forEach(clearTimeout);
  }, [run, instant, depth, field, target]);

  const jackpot = landed && target === 1;
  const noLink = target === null;

  return (
    <div style={{ width: 116, marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* THE TOWER. In pencil until its turn, like an empty plate. */}
      <div
        style={{
          position: 'relative', width: 116, height: TOWER_H, overflow: 'hidden',
          border: run ? '2.5px solid var(--ink)' : '1.5px dashed rgba(26,20,16,0.34)',
          background: run ? 'var(--panel-2)' : 'transparent',
          transition: 'border-color 200ms ease, background-color 200ms ease',
          animation: landed && !instant ? 'column-land 360ms cubic-bezier(0.3,1.3,0.4,1) both' : undefined,
        }}
      >
        {run && !noLink ? (
          <>
            <div
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                height: `${jackpot ? 100 : (field > 0 ? (n / field) * 100 : 0)}%`,
                background: 'linear-gradient(148deg, #e6cb8c, #a8791f 44%, #dcb968 70%, #85601a)',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35)',
                transition: jackpot ? 'height 420ms cubic-bezier(0.2,0.9,0.3,1)' : undefined,
              }}
            />
            {/* Rungs up the side, so the fill has a scale to be read against. */}
            <div
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, zIndex: 1, opacity: 0.55,
                background: 'repeating-linear-gradient(180deg, rgba(26,20,16,0.4) 0 1px, transparent 1px 100%)',
                backgroundSize: `100% ${(TOWER_H - 5) / Math.max(field, 1)}px`,
              }}
            />
            {/* Keyed on the number so each tick restarts its own nudge. */}
            <div
              key={n}
              className="slab"
              style={{
                position: 'absolute', inset: 0, zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 42, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                color: jackpot ? '#fffdf7' : 'var(--ink)',
                textShadow: jackpot ? '0 2px 0 rgba(70,48,6,0.55)' : '0 1px 0 rgba(255,253,247,0.6)',
                animation: landed ? undefined : 'column-tick 90ms ease-out',
              }}
            >
              {n}
            </div>
            {jackpot ? (
              <div
                style={{
                  position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
                  background: 'radial-gradient(circle, rgba(255,253,247,0.95), rgba(230,203,140,0.4) 50%, transparent 72%)',
                  animation: instant ? undefined : 'column-flash 700ms ease-out both',
                }}
              />
            ) : null}
          </>
        ) : null}

        {run && noLink ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              className="narrow"
              style={{
                border: '2.4px solid var(--accent)', color: 'var(--accent)', padding: '5px 10px',
                fontSize: 13, fontWeight: 700, letterSpacing: '0.16em',
                ['--lean' as string]: '-9deg',
                animation: instant ? 'stamp-in 1ms both' : 'stamp-in 380ms cubic-bezier(0.3,1.2,0.4,1) 200ms both',
                position: 'absolute', left: '50%', top: '50%', whiteSpace: 'nowrap',
              }}
            >
              NO LINK
            </div>
          </div>
        ) : null}
      </div>

      {/* The reading. Reserved height whether landed or not, so the row does
          not reflow under the string. */}
      <div style={{ minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, opacity: landed || (run && noLink) ? 1 : 0, transition: 'opacity 240ms ease' }}>
        {noLink ? (
          <div className="read" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--soft)' }}>scores nothing</div>
        ) : (
          <>
            <div className="narrow" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--gold)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {jackpot ? 'NOBODY DEEPER' : target !== null ? `${ordinal(target)} MOST OBSCURE` : ''}
            </div>
            <div className="narrow" style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              OF {field} WHO FIT
            </div>
            <div className="read" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--soft)' }}>
              worth {depth?.score ?? 0}
            </div>
          </>
        )}
      </div>

      {/* THE FLOOR. */}
      {floor ? (
        <div
          style={{
            width: 116, paddingTop: 8, borderTop: '1.5px dashed rgba(26,20,16,0.3)',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: showFloor ? 1 : 0, transition: 'opacity 320ms ease',
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
              background: '#e6ded0',
              border: `2px solid ${floor.mine ? 'var(--gold)' : 'var(--ink)'}`,
              boxShadow: floor.mine ? '0 0 0 2px rgba(168,121,31,0.3)' : undefined,
            }}
          >
            {image ? (
              <img
                src={image.url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: image.fit === 'cover' ? '50% 18%' : '50% 8%', display: 'block' }}
              />
            ) : (
              <svg style={{ position: 'absolute', inset: 0, margin: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,16,0.3)" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            )}
          </div>
          <div className="narrow" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: floor.mine ? 'var(--gold)' : 'var(--muted)' }}>
              {floor.mine ? 'You found it' : 'The floor · deepest here'}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em', display: 'flex', gap: 3 }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: floor.mine ? 'var(--gold)' : 'var(--ink)' }}>
                {floor.name.toUpperCase()}
              </span>
              <span style={{ flexShrink: 0, color: 'var(--gold)' }}>· {floor.score}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
