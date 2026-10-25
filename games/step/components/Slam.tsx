'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { StickerFace, Figure, neutral, type Ground } from '../../../components/Sticker';
import Slab from '../../../components/Slab';
import { GRADES, GRADE_WORD, gradeRank, type Grade } from '../../../src/lib/chain/grade';
import type { CardNews } from '../../../src/lib/collection';
import type { Verdict } from '../lib/types';
import { SHOW, showAt } from '../lib/show';

/** The pick's flight from the gap, one case landing after another, a case's fall, the pause, the develop. */
const FLY = 420;
const EVERY = 360;
const LAND = 300;
const HOLD = 320;
const DEVELOP = 460;
/** The flight back into the gap on Next. */
const BACK = 440;

type Phase = 'stack' | 'develop' | 'show' | 'done';

/**
 * The verdict as a pack opening, with one sticker throughout. On Lock the
 * pick lifts out of the strip's gap and drops to the stage; empty cases
 * slam down on it, Basic first and climbing a grade a time, stopping at the
 * grade earned (more cases, deeper pick). Then the top case's empty well
 * develops into the player: the silhouette fades off the sticker, its club
 * colours come in, the case flashes once, and that case is the card. A miss
 * is one blank case that develops into the pick, greyed, with a ✕.
 *
 * Then the show (SHOW): the camera pushes in, the card sways with the light
 * running round its case, and settles. On Next (`leave`) the case fades and
 * the sticker shrinks back into the gap, so the strip reads as a chain.
 * Every beat is a state, the show one clock, so reduced motion, a tap to
 * skip, or a verdict that was already there on load all land on the end.
 */
export default function Slam({ verdict, ground, news, play, hole, leave = false, onDone, onLeft }: {
  verdict: Verdict;
  ground: Ground;
  news?: CardNews;
  /** False for a verdict that was there on load: show the card, no ceremony. */
  play: boolean;
  /** The gap the pick flies from and back to (the strip keeps its outline). */
  hole?: () => Element | null;
  /** Next was pressed: fly the sticker back into the gap, then onLeft. */
  leave?: boolean;
  onDone: () => void;
  onLeft?: () => void;
}) {
  const held = verdict.held && verdict.grade !== null;
  const tiers: (Grade | null)[] = held ? GRADES.slice(0, gradeRank(verdict.grade!) + 1) : [null];
  const [landed, setLanded] = useState(play ? 0 : tiers.length);
  const [phase, setPhase] = useState<Phase>(play ? 'stack' : 'done');
  const done = useRef(onDone);
  done.current = onDone;
  const left = useRef(onLeft);
  left.current = onLeft;
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const flight = useRef<Animation | null>(null);

  const sticker = () => root.current?.querySelector<HTMLElement>('.step-slam__card .slab__well > .sticker') ?? null;

  const finish = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    flight.current?.cancel();
    STAGE.forEach((p) => root.current?.style.removeProperty(p));
    setLanded(tiers.length); setPhase('done'); done.current();
  };

  // On Lock: the sticker starts over the gap and lands in the card's well, before the first case.
  useLayoutEffect(() => {
    if (!play || reduced()) return;
    const el = sticker();
    const from = hole?.()?.getBoundingClientRect();
    if (!el || !from) return;
    flight.current = el.animate(
      [{ transform: between(el.getBoundingClientRect(), from) }, { transform: 'translateY(-14px)', boxShadow: LIFTED, offset: 0.75 }, { transform: 'none' }],
      { duration: FLY, easing: 'cubic-bezier(0.45, 0, 0.3, 1)' },
    );
    // Strict mode runs this twice: measure the second time untransformed.
    return () => flight.current?.cancel();
  }, []);

  // On Next: the case fades and the sticker shrinks back into the gap.
  useEffect(() => {
    if (!leave) return;
    const el = sticker();
    const to = hole?.()?.getBoundingClientRect();
    if (!el || !to || reduced()) { left.current?.(); return; }
    const end = between(el.getBoundingClientRect(), to);
    const a = el.animate([{ transform: 'none' }, { transform: 'translateY(-14px)', boxShadow: LIFTED, offset: 0.2 }, { transform: end }], {
      duration: BACK, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards',
    });
    a.onfinish = () => left.current?.();
    return () => a.cancel();
  }, [leave]);

  // The show: one clock, every frame computed from it (showAt), nothing kept between frames.
  useEffect(() => {
    if (phase !== 'show' || !held) return;
    const s = SHOW[verdict.grade!];
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const u = (now - t0) / s.ms;
      if (u >= 1) { finish(); return; }
      const f = showAt(s, u);
      const st = root.current?.style;
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
    if (!play) return;
    if (reduced()) { finish(); return; }
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    for (let i = 0; i < tiers.length; i++) at(FLY + i * EVERY, () => { setLanded(i + 1); navigator.vibrate?.(i === tiers.length - 1 ? 28 : 12); });
    const developAt = FLY + (tiers.length - 1) * EVERY + LAND + HOLD;
    at(developAt, () => setPhase('develop'));
    at(developAt + DEVELOP, held ? () => setPhase('show') : finish);
    return () => timers.current.forEach(clearTimeout);
    // One ceremony per verdict: `play` only ever goes from true to false.
  }, [play]);

  // Until the well develops the sticker is the pick on a plain ground; then its club colours come in from the corners.
  const veil = phase === 'stack' || phase === 'develop' ? <Silhouette className="step-slam__veil" /> : null;
  return (
    <div
      ref={root}
      className={`step-slam is-${phase} ${leave ? 'is-leaving' : ''} ${held ? `step-slam--${verdict.grade}` : 'step-slam--missed'}`}
      onClick={phase === 'done' ? undefined : finish}
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

/** What the show writes on the root, cleared when it ends or is skipped. */
const STAGE = ['--push', '--rx', '--ry', '--lx', '--ly', '--lit', '--pool'];

/** The stack is untidy on purpose: each case lands a little off the one under it. */
const TILTS = [-4, 3, -2, 4];

const LIFTED = '0 14px 28px rgba(20, 18, 16, 0.3)';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The transform that puts an element laid out at `at` over `to` instead (origin top left). */
function between(at: DOMRect, to: DOMRect) {
  return `translate(${to.left - at.left}px, ${to.top - at.top}px) scale(${to.width / at.width})`;
}

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
