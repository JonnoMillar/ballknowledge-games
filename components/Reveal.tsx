'use client';
import { useEffect, useState } from 'react';
import Sticker, { solid, type Ground } from './Sticker';
import { shortClubName } from './ClubBadge';
import { depthRead, TIER_LABEL, type DepthRead } from '../src/lib/chain/tier';
import type { ChainResult, PinnedAnswer, SlotOutcome } from '../src/lib/chain/result';
import type { ClubView } from '../src/lib/clubs';
import type { PortraitImage } from '../src/lib/portraits';
import { clubColour } from '../src/lib/club-colours';
import type { Named } from '../src/lib/chain/client';

/**
 * The reveal, as a clock.
 *
 * Verdict inside four seconds, everything on the page inside seven. The
 * links are judged one after another; the verdict lands; on a scored board
 * the depth bars fill together; then the wall of who else fitted. It is a
 * handful of timers, not a timeline library: every beat is a state and the
 * board draws whatever state it is in, so a reload mid-reveal, reduced
 * motion, or a test can land on the finished board without playing it.
 */
export interface RevealPhase {
  /** Links up to this index have been judged; -1 is none. */
  stampedThrough: number;
  verdict: boolean;
  depth: boolean;
  wall: boolean;
}

export const LINK_EVERY = 350;
const FIRST_LINK = 300;
const AFTER_LINKS = 250;
const AFTER_VERDICT = 700;
const AFTER_DEPTH = 1600;
const AFTER_VERDICT_COMPLETION = 900;

export function useReveal(active: boolean, linkCount: number, completion: boolean): RevealPhase {
  const [phase, setPhase] = useState<RevealPhase>({ stampedThrough: -1, verdict: false, depth: false, wall: false });

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setPhase({ stampedThrough: linkCount - 1, verdict: true, depth: true, wall: true });
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    for (let i = 0; i < linkCount; i++) {
      at(FIRST_LINK + i * LINK_EVERY, () => setPhase((p) => ({ ...p, stampedThrough: i })));
    }
    const linksEnd = FIRST_LINK + linkCount * LINK_EVERY;
    const verdictAt = linksEnd + AFTER_LINKS;
    at(verdictAt, () => setPhase((p) => ({ ...p, verdict: true })));
    if (completion) {
      at(verdictAt + AFTER_VERDICT_COMPLETION, () => setPhase((p) => ({ ...p, depth: true, wall: true })));
    } else {
      at(verdictAt + AFTER_VERDICT, () => setPhase((p) => ({ ...p, depth: true })));
      at(verdictAt + AFTER_VERDICT + AFTER_DEPTH, () => setPhase((p) => ({ ...p, wall: true })));
    }
    return () => { timers.forEach(clearTimeout); };
  }, [active, linkCount, completion]);

  return phase;
}

/** The headline under the board. Typeset, not stamped. */
export function Verdict({ result, completion, streak, show }: {
  result: ChainResult;
  completion: boolean;
  /** The daily streak, once one exists. */
  streak?: number | null;
  show: boolean;
}) {
  const held = result.perfect;
  const platesHeld = result.slots.filter((s) => s.held).length;
  const cluesOnly = completion && result.made === result.total && !held;
  const head = held ? 'Chain held' : cluesOnly ? 'Not solved' : 'Chain broke';
  const sub = completion
    ? held
      ? 'Every link a real one, every plate answered.'
      : cluesOnly
        ? 'Every link held, but a plate was answered by someone it did not ask for.'
        : `${platesHeld} of ${result.slots.length} plates held.`
    : held
      ? 'Every link a real one.'
      : `${result.made} of ${result.total} links held.`;

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

/** How deep one pick went, as a bar that fills toward the deep end. */
export function DepthBar({ slot, run }: { slot: SlotOutcome; run: boolean }) {
  const read: DepthRead | null = slot.held ? depthRead(slot.depth) : null;
  if (!read) {
    return (
      <div className={`depth depth--none ${run ? 'is-run' : ''}`}>
        <span className="depth__label">{slot.held ? 'Only way in' : 'No link'}</span>
      </div>
    );
  }
  const pct = read.fieldSize <= 1 ? 100 : Math.round((read.deeperThan / (read.fieldSize - 1)) * 100);
  return (
    <div className={`depth depth--${read.tier} ${run ? 'is-run' : ''}`}>
      <span className="depth__track" aria-hidden>
        <span className="depth__fill" style={{ width: run ? `${Math.max(pct, 4)}%` : 0 }} />
      </span>
      <span className="depth__label">{TIER_LABEL[read.tier]}</span>
      <span className="depth__note">
        {read.fieldSize <= 1
          ? 'the only one who fit'
          : read.deeperThan === 0
            ? `the obvious one of ${read.fieldSize}`
            : `deeper than ${read.deeperThan} of ${read.fieldSize} who fit`}
      </span>
    </div>
  );
}

/** The tag under a completion plate: found it, held anyway, or nothing. */
export function PlateTag({ slot, run }: { slot: SlotOutcome; run: boolean }) {
  const found = slot.obvious && slot.playerId === slot.obvious.id;
  const label = found ? 'You found it' : slot.held ? 'Yours held too' : null;
  if (!label) return null;
  return (
    <div className={`depth depth--${found ? 'deep' : 'shout'} ${run ? 'is-run' : ''}`}>
      <span className="depth__label">{label}</span>
    </div>
  );
}

const wallGround = (clubs: readonly string[]): Ground => {
  const [a, b] = clubs;
  if (!a) return solid('var(--ink)');
  return { a: clubColour(a), b: clubColour(b ?? a), liveA: true, liveB: true };
};

/** Who else fitted, or the ones the board had in mind. */
export function Wall({ result, completion, images, clubs, players, show }: {
  result: ChainResult;
  completion: boolean;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubView>;
  players: ReadonlyMap<string, Named>;
  show: boolean;
}) {
  const clubName = (id: string) => shortClubName(clubs[id]?.name ?? id);
  const entries: { key: string; answer: PinnedAnswer; heading?: string; tag: string | null }[] = completion
    ? result.slots.flatMap((slot) => slot.obvious ? [{
        key: `p${slot.index}`,
        answer: { ...slot.obvious, score: 0, either: false, slotIndex: slot.index, fieldSize: slot.fieldSize, mine: slot.playerId === slot.obvious.id },
        heading: `Slot ${slot.index + 1}`,
        tag: slot.playerId === slot.obvious.id ? 'You found it' : slot.held ? 'Yours held too' : null,
      }] : [])
    : result.pinboard.map((answer) => ({
        key: answer.id,
        answer,
        // Everyone on the wall is deep by construction, so saying so on
        // each one says nothing. Only the one you found gets a tag.
        tag: answer.mine ? 'You found it' : null,
      }));

  if (entries.length === 0) return null;
  return (
    <section className={`wall ${show ? 'is-shown' : ''}`}>
      <h3 className="wall__head display">{completion ? 'The ones we had in mind' : 'Who else fitted'}</h3>
      <div className="wall__row">
        {entries.map(({ key, answer, heading, tag }, i) => (
          <div key={key} className="wall__item" style={{ ['--i' as string]: i }}>
            {heading ? <span className="wall__slot">{heading}</span> : null}
            <Sticker
              player={players.get(answer.id) ?? { id: answer.id, name: answer.name }}
              image={images[answer.id]}
              ground={wallGround(answer.clubs)}
            />
            <span className="wall__clubs">
              {answer.either
                ? 'Fits either gap'
                : answer.clubs.length === 2
                  ? `${clubName(answer.clubs[0]!)} and ${clubName(answer.clubs[1]!)}`
                  : answer.clubs[0] ? clubName(answer.clubs[0]) : ''}
            </span>
            {tag ? <span className="wall__tag">{tag}</span> : null}
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
