'use client';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { StickerFace, solid } from '../../../components/Sticker';
import { MAX_POINTS, POINTS, RUNGS, pointsOf, rangeOf, type Rung } from '../lib/score';
import type { PlateMark } from '../../../src/lib/chain/share';
import type { ItkRound } from '../lib/types';

/**
 * The day's result. The ink route runs through the five careers, adding up
 * each one's points as it passes, then down to your card, alone and large:
 * this is what you got. Only then does the album page of every result come
 * in below, yours stuck in its slot, the others empty with their art faded,
 * so you can see what the next one up would have taken.
 */

const art = (rung: Rung) => `/spoofed/ranks/${rung.toLowerCase()}.webp`;

/** The podium is cased in the Deep Cuts metals: gold, silver, bronze. */
const METAL: Partial<Record<Rung, string>> = { Fabrizio: 'rare', Agent: 'uncommon', Scout: 'common' };

export function ResultSticker({ rung, points }: { rung: Rung; points: number }) {
  const metal = METAL[rung];
  const paper = (
    <span className="rs__paper">
      <img className="rs__art" src={art(rung)} alt="" />
      <span className="rs__name display">{rung}</span>
      <span className="rs__score">{points}<small>/{MAX_POINTS}</small></span>
    </span>
  );
  return metal ? (
    <span className={`rs rs--${rung.toLowerCase()} slab slab--${metal}`}>
      <span className="slab__face" aria-hidden><span className="slab__inlay" /><span className="slab__glint" /></span>
      {paper}
    </span>
  ) : (
    <span className={`rs rs--${rung.toLowerCase()} rs--plain`}>{paper}</span>
  );
}

/** The five careers, each with its mark and what it scored. Click one to look at it again. */
function Careers({ rounds, marks, onReview, pipRef, pipDelay }: {
  rounds: readonly ItkRound[];
  marks: readonly PlateMark[];
  onReview: (i: number) => void;
  pipRef: (i: number, el: HTMLElement | null) => void;
  pipDelay: (i: number) => number | undefined;
}) {
  return (
    <ol className="itk-end__row">
      {rounds.map((r, i) => {
        const at = pipDelay(i) === undefined ? undefined : { animationDelay: `${pipDelay(i)}ms` };
        return (
          <li key={i}>
            <button type="button" className="itk-end__card" onClick={() => onReview(i)} aria-label={`Review career ${i + 1}`}>
              <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} />
              <span ref={(el) => pipRef(i, el)} className={`itk-end__mark itk-pip itk-pip--${marks[i]}`} style={at} aria-hidden />
              <span className="itk-end__pts" style={at} aria-hidden>+{POINTS[marks[i]!]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** A polyline with its corners rounded off, as an SVG path. */
function rounded(pts: { x: number; y: number }[], r: number): string {
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, p, z] = [pts[i - 1]!, pts[i]!, pts[i + 1]!];
    const inLen = Math.hypot(p.x - a.x, p.y - a.y);
    const outLen = Math.hypot(z.x - p.x, z.y - p.y);
    const k = Math.min(r, inLen / 2, outLen / 2);
    if (!inLen || !outLen) continue;
    d += ` L ${p.x - ((p.x - a.x) / inLen) * k} ${p.y - ((p.y - a.y) / inLen) * k}`;
    d += ` Q ${p.x} ${p.y} ${p.x + ((z.x - p.x) / outLen) * k} ${p.y + ((z.y - p.y) / outLen) * k}`;
  }
  const end = pts[pts.length - 1]!;
  return `${d} L ${end.x} ${end.y}`;
}

/** When the route starts drawing, and how long it takes to reach your card. */
const ROUTE_AT = 350;
const ROUTE_MS = 1700;

/** After your card lands: the actions, then the rest of the album. */
const ACTIONS_AFTER = 500;
const OTHERS_AFTER = 1000;

export function AlbumReveal({ rounds, marks, rung, day, onReview, actions }: {
  rounds: readonly ItkRound[];
  marks: readonly PlateMark[];
  rung: Rung;
  day: number;
  onReview: (i: number) => void;
  actions: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pips = useRef<(HTMLElement | null)[]>([]);
  const hero = useRef<HTMLDivElement>(null);
  const [route, setRoute] = useState<{ d: string; w: number; h: number; at: number[] } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      if (!box.current || !hero.current || pips.current.some((p) => !p)) return;
      const b = box.current.getBoundingClientRect();
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, top: r.top - b.top };
      };
      const pts = pips.current.map((p) => centre(p!));
      const s = centre(hero.current);
      const last = pts[pts.length - 1]!;
      const row = box.current.querySelector('.itk-end__row')!.getBoundingClientRect();
      const gutter = Math.min(row.right - b.left + 8, b.width - 2);
      // Past the fifth career the route runs like a map line: out to the margin, down, back
      // along the gap above your card, and into it from the top. It never crosses a career.
      const lane = (last.y + s.top) / 2 + 10;
      const tail = [{ x: gutter, y: last.y }, { x: gutter, y: lane }, { x: s.x, y: lane }, { x: s.x, y: s.top - 3 }];
      const line = [...pts, ...tail];
      const dist = (a: { x: number; y: number }, z: { x: number; y: number }) => Math.hypot(z.x - a.x, z.y - a.y);
      const cum = [0];
      for (let i = 1; i < line.length; i++) cum.push(cum[i - 1]! + dist(line[i - 1]!, line[i]!));
      const total = cum[cum.length - 1]!;
      setRoute({
        d: rounded(line, 12),
        w: b.width,
        h: b.height,
        at: cum.slice(0, pts.length).map((c) => c / total),
      });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const passed = (i: number) => (route ? ROUTE_AT + ROUTE_MS * route.at[i]! : undefined);
  // The running total after each career; each figure lands on the one before as the route passes.
  const totals = marks.map((_, i) => pointsOf(marks.slice(0, i + 1)));
  const landed = ROUTE_AT + ROUTE_MS;
  // Figure i shows from career i-1 (the 0 from the start) until the next career takes over.
  const tick = (i: number) => (route ? {
    ['--in' as string]: `${i ? passed(i - 1) : 0}ms`,
    ['--out' as string]: i < totals.length ? `${passed(i)}ms` : '1e6ms',
  } : undefined);
  return (
    <div
      ref={box}
      className={`rv-album ${route ? 'is-ready' : ''}`}
      style={{
        ['--landed' as string]: `${landed}ms`,
        ['--actions' as string]: `${landed + ACTIONS_AFTER}ms`,
        ['--others' as string]: `${landed + OTHERS_AFTER}ms`,
      }}
    >
      <p className="rv-tally">
        <span className="rv-tally__day">Spoofed #{day}</span>
        <span className="rv-tally__count display" role="img" aria-label={`${totals[totals.length - 1]} out of ${MAX_POINTS}`}>
          {[0, ...totals].map((t, i) => (
            <span key={i} className="rv-tally__n" style={tick(i)}>{t}</span>
          ))}
          <small>/{MAX_POINTS}</small>
        </span>
      </p>
      <Careers rounds={rounds} marks={marks} onReview={onReview} pipRef={(i, el) => { pips.current[i] = el; }} pipDelay={passed} />
      {route ? (
        <svg className="rv-album__route" width={route.w} height={route.h} viewBox={`0 0 ${route.w} ${route.h}`} aria-hidden>
          <path d={route.d} pathLength={1} style={{ animationDelay: `${ROUTE_AT}ms`, animationDuration: `${ROUTE_MS}ms` }} />
        </svg>
      ) : null}
      <div ref={hero} className="rv-hero">
        <ResultSticker rung={rung} points={totals[totals.length - 1]!} />
      </div>
      <div className="itk-end__actions">{actions}</div>
      <ol className="rv-album__page" aria-label="Every result">
        {RUNGS.map((x) => (
          <li key={x} className={`rv-slot ${METAL[x] ? 'is-podium' : ''} ${x === rung ? 'is-yours' : ''}`}>
            <span className="rv-slot__space">
              <img className="rv-slot__art" src={art(x)} alt="" />
              {x === rung ? <ResultSticker rung={rung} points={totals[totals.length - 1]!} /> : null}
            </span>
            <span className="rv-slot__name display">{x}</span>
            <span className="rv-slot__range">{rangeOf(x)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
