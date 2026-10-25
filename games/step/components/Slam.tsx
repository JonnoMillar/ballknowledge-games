'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StickerFace, Figure, neutral, type Ground } from '../../../components/Sticker';
import Slab from '../../../components/Slab';
import { GRADES, GRADE_WORD, gradeRank, type Grade } from '../../../src/lib/chain/grade';
import type { CardNews } from '../../../src/lib/collection';
import type { Verdict } from '../lib/types';
import { SHOW, showAt } from '../lib/show';

/** Between one case landing and the next, a case's fall, the pause, the develop, a miss's case fading off at the end. */
const EVERY = 360;
const LAND = 300;
const HOLD = 320;
const DEVELOP = 460;
const SETTLE = 320;

type Phase = 'stack' | 'develop' | 'show' | 'settle' | 'done';

/**
 * The verdict as a pack opening, in the strip's gap: the pick stays where it
 * was chosen and everything happens round it. Empty cases slam down on it,
 * Basic first and climbing a grade a time, stopping at the grade earned
 * (more cases, deeper pick). Then the top case's empty well develops into
 * the player: the silhouette lifts off the sticker, its club colours come
 * in, the case flashes once. A miss is one blank case that develops into
 * the pick, greyed, with a ✕.
 *
 * Then the show (SHOW): the camera pushes in, the card sways with the light
 * running round its case, and settles, and the card stays in the gap in its
 * case. A miss's grey case fades off, leaving the greyed pick (onDone either
 * way). Every beat is a state, the show one clock, so reduced motion or a
 * tap to skip land on the end. `play` false is the card at rest in its case
 * (a verdict already judged; the preview poses the show on it).
 */
export default function Slam({ verdict, ground, news, play, onDone }: {
  verdict: Verdict;
  ground: Ground;
  news?: CardNews;
  play: boolean;
  onDone: () => void;
}) {
  const held = verdict.held && verdict.grade !== null;
  const tiers: (Grade | null)[] = held ? GRADES.slice(0, gradeRank(verdict.grade!) + 1) : [null];
  const [landed, setLanded] = useState(play ? 1 : tiers.length);
  const [phase, setPhase] = useState<Phase>(play ? 'stack' : 'done');
  const done = useRef(onDone);
  done.current = onDone;
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const finish = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    STAGE.forEach((p) => root.current?.style.removeProperty(p));
    setLanded(tiers.length); setPhase('done');
    done.current();
  };

  // The show: one clock, every frame computed from it (showAt), nothing kept between frames.
  useEffect(() => {
    if (phase !== 'show' || !held) return;
    const s = SHOW[verdict.grade!];
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const u = (now - t0) / s.ms;
      const st = root.current?.style;
      if (u >= 1) { finish(); return; }
      const f = showAt(s, u);
      st?.setProperty('--push', f.push.toFixed(4));
      st?.setProperty('--rx', `${f.rx.toFixed(2)}deg`);
      st?.setProperty('--ry', `${f.ry.toFixed(2)}deg`);
      st?.setProperty('--lx', `${f.lx.toFixed(1)}%`);
      st?.setProperty('--ly', `${f.ly.toFixed(1)}%`);
      st?.setProperty('--lit', f.lit.toFixed(3));
      st?.setProperty('--pool', f.pool.toFixed(3));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'settle') return;
    const t = window.setTimeout(finish, SETTLE);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (!play) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    navigator.vibrate?.(12);
    for (let i = 1; i < tiers.length; i++) at(i * EVERY, () => { setLanded(i + 1); navigator.vibrate?.(i === tiers.length - 1 ? 28 : 12); });
    const developAt = (tiers.length - 1) * EVERY + LAND + HOLD;
    at(developAt, () => setPhase('develop'));
    at(developAt + DEVELOP, () => setPhase(held ? 'show' : 'settle'));
    return () => timers.current.forEach(clearTimeout);
    // One ceremony per verdict: `play` only ever goes from true to false.
  }, [play]);

  // Until the well develops the sticker is the pick on a plain ground; then its club colours come in from the corners.
  const veil = phase === 'stack' || phase === 'develop' ? <Silhouette className="step-slam__veil" /> : null;
  return (
    <div
      ref={root}
      className={`step-slam is-${phase} ${held ? `step-slam--${verdict.grade}` : 'step-slam--missed'}`}
      onClick={play && phase !== 'done' ? finish : undefined}
    >
      {held ? <span className="step-slam__pool" aria-hidden /> : null}
      {held && SHOW[verdict.grade!].shadow ? <span className="step-slam__shadow" aria-hidden /> : null}
      <div className="step-slam__card">
        {held ? (
          <div className="tilt">
            <Slab grade={verdict.grade!} player={verdict.pick} image={verdict.pick.image ?? undefined} ground={phase === 'stack' ? neutral() : ground} news={news}>
              {veil}
            </Slab>
          </div>
        ) : (
          <Case grade={null}>
            <StickerFace player={verdict.pick} image={verdict.pick.image ?? undefined} ground={neutral()} className="sticker--still" />
            {veil}
            <span className="step-miss" aria-hidden>✕</span>
          </Case>
        )}
      </div>
      {/* The top case becomes the card when the well develops; the ones under it fade. */}
      {phase === 'stack' || phase === 'develop' ? tiers.slice(0, phase === 'stack' ? landed : tiers.length - 1).map((g, i) => (
        <Case
          key={i}
          grade={g}
          className={`step-slam__case ${phase === 'stack' && i === landed - 1 ? 'is-top' : ''}`}
          tilt={i === tiers.length - 1 ? 0 : TILTS[i % TILTS.length]!}
        >
          <Silhouette />
        </Case>
      )) : null}
    </div>
  );
}

/** What the show writes on the root, cleared when it ends. */
const STAGE = ['--push', '--rx', '--ry', '--lx', '--ly', '--lit', '--pool'];

/** The stack is untidy on purpose: each case lands a little off the one under it. */
const TILTS = [-4, 3, -2, 4];

/** The empty sticker an unopened case holds. */
function Silhouette({ className = '' }: { className?: string }) {
  return (
    <span className={`sticker sticker--empty sticker--still ${className}`} aria-hidden>
      <span className="sticker__photo"><Figure tone="var(--silhouette-figure)" /></span>
      <span className="sticker__plate"><span className="sticker__hint">?</span></span>
    </span>
  );
}

/** A case: a grade's material and name around its well, the same size as the card. A miss's is blank. */
function Case({ grade, className = '', tilt = 0, children }: { grade: Grade | null; className?: string; tilt?: number; children: ReactNode }) {
  return (
    <div className={`slab slab--${grade ?? 'blank'} slab--md ${className}`} style={{ ['--tilt' as string]: `${tilt}deg` }}>
      <span className="slab__face" aria-hidden><span className="slab__inlay" /><span className="slab__glint" /></span>
      <span className="slab__label display">{grade ? GRADE_WORD[grade] : '?'}</span>
      <span className="slab__well">{children}</span>
    </div>
  );
}
