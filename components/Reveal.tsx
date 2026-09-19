'use client';
import { useEffect, useState } from 'react';
import Sticker, { solid, type Ground } from './Sticker';
import { shortClubName } from './ClubBadge';
import type { ChainResult, SlotOutcome } from '../src/lib/chain/result';
import type { ClubView } from '../src/lib/clubs';
import type { PortraitImage } from '../src/lib/portraits';
import { clubColour } from '../src/lib/club-colours';
import type { Named } from '../src/lib/chain/client';

/**
 * The reveal, as a clock.
 *
 * Verdict inside four seconds, everything on the page inside six. The
 * links are judged one after another; the verdict lands; then the tags
 * under the plates and the answers the board had in mind. It is a handful
 * of timers, not a timeline library: every beat is a state and the board
 * draws whatever state it is in, so a reload mid-reveal, reduced motion,
 * or a test can land on the finished board without playing it.
 */
export interface RevealPhase {
  /** Links up to this index have been judged; -1 is none. */
  stampedThrough: number;
  verdict: boolean;
  /** The tags under the plates and the wall of answers. */
  wall: boolean;
}

export const LINK_EVERY = 350;
const FIRST_LINK = 300;
const AFTER_LINKS = 250;
const AFTER_VERDICT = 900;

export function useReveal(active: boolean, linkCount: number): RevealPhase {
  const [phase, setPhase] = useState<RevealPhase>({ stampedThrough: -1, verdict: false, wall: false });

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPhase({ stampedThrough: linkCount - 1, verdict: true, wall: true });
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    for (let i = 0; i < linkCount; i++) {
      at(FIRST_LINK + i * LINK_EVERY, () => setPhase((p) => ({ ...p, stampedThrough: i })));
    }
    const verdictAt = FIRST_LINK + linkCount * LINK_EVERY + AFTER_LINKS;
    at(verdictAt, () => setPhase((p) => ({ ...p, verdict: true })));
    at(verdictAt + AFTER_VERDICT, () => setPhase((p) => ({ ...p, wall: true })));
    return () => { timers.forEach(clearTimeout); };
  }, [active, linkCount]);

  return phase;
}

/** The headline under the board. Typeset, not stamped. */
export function Verdict({ result, streak, show }: {
  result: ChainResult;
  /** The daily streak, once one exists. */
  streak?: number | null;
  show: boolean;
}) {
  const held = result.perfect;
  const platesHeld = result.slots.filter((s) => s.held).length;
  const cluesOnly = result.made === result.total && !held;
  const head = held ? 'Chain held' : cluesOnly ? 'Not solved' : 'Chain broke';
  const sub = held
    ? 'Every link a real one, every plate answered.'
    : cluesOnly
      ? 'Every link held, but a plate was answered by someone it did not ask for.'
      : `${platesHeld} of ${result.slots.length} plates held.`;

  return (
    <section className={`verdict ${show ? 'is-shown' : ''} ${held ? 'verdict--held' : 'verdict--broke'}`} aria-live="polite">
      <h2 className="verdict__head display">{head}</h2>
      <p className="verdict__sub">
        {sub}
        {streak != null && streak > 0 && held ? <span className="verdict__streak"> Day {streak} of your streak.</span> : null}
      </p>
    </section>
  );
}

/** The tag under a plate: found it, held anyway, or nothing. */
export function PlateTag({ slot, run }: { slot: SlotOutcome; run: boolean }) {
  const found = slot.obvious && slot.playerId === slot.obvious.id;
  const label = found ? 'You found it' : slot.held ? 'Yours held too' : null;
  if (!label) return null;
  return (
    <div className={`plate-tag ${found ? 'plate-tag--found' : ''} ${run ? 'is-run' : ''}`}>
      <span className="plate-tag__label">{label}</span>
    </div>
  );
}

const wallGround = (clubs: readonly string[]): Ground => {
  const [a, b] = clubs;
  if (!a) return solid('var(--ink)');
  return { a: clubColour(a), b: clubColour(b ?? a), liveA: true, liveB: true };
};

/** The ones the board had in mind, one per plate. */
export function Wall({ result, images, clubs, players, show }: {
  result: ChainResult;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
  players: ReadonlyMap<string, Named>;
  show: boolean;
}) {
  const clubName = (id: string) => shortClubName(clubs[id]?.name ?? id);
  const entries = result.slots.flatMap((slot) => slot.obvious ? [{
    slot,
    answer: slot.obvious,
    tag: slot.playerId === slot.obvious.id ? 'You found it' : slot.held ? 'Yours held too' : null,
  }] : []);

  if (entries.length === 0) return null;
  return (
    <section className={`wall ${show ? 'is-shown' : ''}`}>
      <h3 className="wall__head display">The ones we had in mind</h3>
      <div className="wall__row">
        {entries.map(({ slot, answer, tag }, i) => (
          <div key={slot.index} className="wall__item" style={{ ['--i' as string]: i }}>
            <span className="wall__slot">Plate {slot.index + 1}</span>
            <Sticker
              player={players.get(answer.id) ?? { id: answer.id, name: answer.name }}
              image={images[answer.id]}
              ground={wallGround(answer.clubs)}
            />
            <span className="wall__clubs">
              {answer.clubs.length === 2
                ? `${clubName(answer.clubs[0]!)} and ${clubName(answer.clubs[1]!)}`
                : answer.clubs[0] ? clubName(answer.clubs[0]) : ''}
            </span>
            {tag ? <span className={`wall__tag ${tag === 'You found it' ? 'wall__tag--found' : ''}`}>{tag}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Copy the share line. Says so when it could not. */
export function ShareButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2200);
  }
  return (
    <button type="button" className="seal" onClick={copy}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Share'}
    </button>
  );
}
