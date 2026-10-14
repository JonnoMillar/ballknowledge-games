'use client';
import { useEffect, useRef, useState } from 'react';
import { StickerFace, Figure, neutral, type Ground } from '../../../components/Sticker';
import Slab from '../../../components/Slab';
import { GRADES, GRADE_WORD, gradeRank, type Grade } from '../../../src/lib/chain/grade';
import type { CardNews } from '../../../src/lib/collection';
import type { Verdict } from '../lib/types';

/** Between one case landing and the next, then the pause before the top one breaks, then the break. */
const EVERY = 360;
const HOLD = 420;
const BREAK = 620;

/**
 * The verdict as a pack opening. Empty cases slam down one on another,
 * Plastic first and climbing a grade a time, stopping at the grade the pick
 * earned; the top one cracks down the middle and its halves fall away to
 * show the card. The deeper the pick, the more cases land, so an Elite takes
 * longest. A miss is one blank case that cracks and drops to nothing.
 *
 * Timers, not a timeline: every beat is a state, so reduced motion, a tap to
 * skip, or a verdict that was already there on load all land on the end.
 */
export default function Slam({ verdict, ground, news, play, onDone }: {
  verdict: Verdict;
  ground: Ground;
  news?: CardNews;
  /** False for a verdict that was there on load: show the card, no ceremony. */
  play: boolean;
  onDone: () => void;
}) {
  const held = verdict.held && verdict.grade !== null;
  const tiers: (Grade | null)[] = held ? GRADES.slice(0, gradeRank(verdict.grade!) + 1) : [null];
  const [landed, setLanded] = useState(play ? 1 : tiers.length);
  const [phase, setPhase] = useState<'stack' | 'break' | 'done'>(play ? 'stack' : 'done');
  const done = useRef(onDone);
  done.current = onDone;

  const finish = () => { setLanded(tiers.length); setPhase('done'); done.current(); };

  useEffect(() => {
    if (!play) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
    navigator.vibrate?.(12);
    for (let i = 1; i < tiers.length; i++) at(i * EVERY, () => { setLanded(i + 1); navigator.vibrate?.(i === tiers.length - 1 ? 28 : 12); });
    const breakAt = tiers.length * EVERY + HOLD;
    at(breakAt, () => setPhase('break'));
    at(breakAt + BREAK, finish);
    return () => timers.forEach(clearTimeout);
    // One ceremony per verdict: `play` only ever goes from true to false.
  }, [play]);

  const top = tiers[landed - 1] ?? null;
  return (
    <div
      className={`step-slam is-${phase} ${held ? `step-slam--${verdict.grade}` : 'step-slam--missed'}`}
      onClick={phase === 'done' ? undefined : finish}
    >
      <div className="step-slam__card">
        {held
          ? <Slab grade={verdict.grade!} player={verdict.pick} image={verdict.pick.image ?? undefined} ground={ground} news={news} />
          : (
            <div className="step-slam__miss">
              <StickerFace player={verdict.pick} image={verdict.pick.image ?? undefined} ground={neutral()} className="sticker--still step-gap--missed" />
              <span className="step-miss" aria-hidden>✕</span>
            </div>
          )}
      </div>
      {phase === 'stack' ? tiers.slice(0, landed).map((g, i) => (
        <Case key={i} grade={g} className={`step-slam__case ${i === landed - 1 ? 'is-top' : ''}`} tilt={i === tiers.length - 1 ? 0 : TILTS[i % TILTS.length]!} />
      )) : null}
      {phase === 'break' ? (
        <>
          <Case grade={top} className="step-slam__half step-slam__half--l" tilt={0} />
          <Case grade={top} className="step-slam__half step-slam__half--r" tilt={0} />
        </>
      ) : null}
    </div>
  );
}

/** The stack is untidy on purpose: each case lands a little off the one under it. */
const TILTS = [-4, 3, -2, 4];

/** An empty case: a grade's material and name around a silhouette, the same size as the card it hides. */
function Case({ grade, className, tilt }: { grade: Grade | null; className: string; tilt: number }) {
  return (
    <div className={`slab slab--${grade ?? 'blank'} slab--md ${className}`} style={{ ['--tilt' as string]: `${tilt}deg` }} aria-hidden>
      <span className="slab__face"><span className="slab__inlay" /><span className="slab__glint" /></span>
      <span className="slab__label display">{grade ? GRADE_WORD[grade] : '?'}</span>
      <span className="slab__well">
        <span className="sticker sticker--empty sticker--still">
          <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
          <span className="sticker__plate"><span className="sticker__hint">?</span></span>
        </span>
      </span>
    </div>
  );
}
