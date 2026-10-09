'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { StickerFace, solid } from '../Sticker';
import { RUNGS, type Rung } from '../../src/lib/itk/score';
import type { PlateMark } from '../../src/lib/chain/share';
import type { ItkSet } from '../../src/server/itk';

/**
 * The day's result, revealed. Prototype: three ways in, switchable on the
 * end screen, so Jonno can pick one in motion.
 *
 * - album: the ink route runs through the five careers and on into your slot
 *   on an album page of every result, the ones you missed left empty.
 * - pack: a sticker packet; the seal tears off and your result slides out.
 * - peel: your result lies under its backing paper, which peels off the way
 *   the fakes do.
 */
export type RevealStyle = 'album' | 'pack' | 'peel';

/** The podium is cased in the Deep Cuts metals: gold, silver, bronze. */
const METAL: Partial<Record<Rung, string>> = { Fabrizio: 'rare', Agent: 'uncommon', Scout: 'common' };

export function ResultSticker({ rung, marks, day }: { rung: Rung; marks: readonly PlateMark[]; day: number }) {
  const metal = METAL[rung];
  const paper = (
    <span className="rs__paper">
      <span className="rs__eyebrow">ITK #{day}</span>
      <span className="rs__name display">{rung}</span>
      <span className="rs__grid" aria-hidden>
        {marks.map((m, i) => <span key={i} className={`rs__pip itk-pip--${m}`} />)}
      </span>
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

/** The five careers, each with its mark. Click one to look at it again. */
export function Careers({ set, marks, onReview, pipRef, pipDelay }: {
  set: ItkSet;
  marks: readonly PlateMark[];
  onReview: (i: number) => void;
  pipRef?: (i: number, el: HTMLElement | null) => void;
  pipDelay?: (i: number) => number | undefined;
}) {
  return (
    <ol className="itk-end__row">
      {set.rounds.map((r, i) => (
        <li key={i}>
          <button type="button" className="itk-end__card" onClick={() => onReview(i)} aria-label={`Review career ${i + 1}`}>
            <StickerFace player={r.player} image={r.image ?? undefined} ground={solid(r.ground)} />
            <span
              ref={pipRef ? (el) => pipRef(i, el) : undefined}
              className={`itk-end__mark itk-pip itk-pip--${marks[i]}`}
              style={pipDelay?.(i) !== undefined ? { animationDelay: `${pipDelay(i)}ms` } : undefined}
              aria-hidden
            />
          </button>
        </li>
      ))}
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

/** When the route starts drawing, and how long it takes to reach your slot. */
const ROUTE_AT = 350;
const ROUTE_MS = 1700;

export function AlbumReveal({ set, marks, rung, day, onReview }: {
  set: ItkSet;
  marks: readonly PlateMark[];
  rung: Rung;
  day: number;
  onReview: (i: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pips = useRef<(HTMLElement | null)[]>([]);
  const slot = useRef<HTMLSpanElement>(null);
  const page = useRef<HTMLOListElement>(null);
  const [route, setRoute] = useState<{ d: string; w: number; h: number; at: number[] } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      if (!box.current || !slot.current || pips.current.some((p) => !p)) return;
      const b = box.current.getBoundingClientRect();
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, top: r.top - b.top };
      };
      const pts = pips.current.map((p) => centre(p!));
      const s = centre(slot.current);
      const last = pts[pts.length - 1]!;
      const pg = page.current!.getBoundingClientRect();
      const gutter = pg.right - b.left + 8;
      // Past the fifth career the route runs like a map line: out to the margin, down, along
      // the gap above your row, and into your slot from the top. It never crosses a slot.
      const firstRow = s.top - (pg.top - b.top) < 4;
      const lane = firstRow ? (last.y + s.top) / 2 : s.top - 11;
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

  const landed = ROUTE_AT + ROUTE_MS;
  return (
    <div ref={box} className={`rv-album ${route ? 'is-ready' : ''}`} style={{ ['--landed' as string]: `${landed}ms` }}>
      <Careers
        set={set}
        marks={marks}
        onReview={onReview}
        pipRef={(i, el) => { pips.current[i] = el; }}
        pipDelay={(i) => (route ? ROUTE_AT + ROUTE_MS * route.at[i]! : undefined)}
      />
      {route ? (
        <svg className="rv-album__route" width={route.w} height={route.h} viewBox={`0 0 ${route.w} ${route.h}`} aria-hidden>
          <path d={route.d} pathLength={1} style={{ animationDelay: `${ROUTE_AT}ms`, animationDuration: `${ROUTE_MS}ms` }} />
        </svg>
      ) : null}
      <ol ref={page} className="rv-album__page" aria-label="Results">
        {RUNGS.map((x) => (
          <li key={x} className={`rv-slot ${METAL[x] ? 'is-podium' : ''} ${x === rung ? 'is-yours' : ''}`}>
            <span ref={x === rung ? slot : undefined} className="rv-slot__space">
              {x === rung ? <ResultSticker rung={rung} marks={marks} day={day} /> : null}
            </span>
            <span className="rv-slot__name display">{x}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PackReveal({ rung, marks, day }: { rung: Rung; marks: readonly PlateMark[]; day: number }) {
  return (
    <div className="rv-pack">
      <div className="rv-pack__out"><ResultSticker rung={rung} marks={marks} day={day} /></div>
      <div className="rv-pack__bag" aria-hidden>
        <span className="rv-pack__seal rv-pack__seal--top" />
        <span className="rv-pack__label">
          <span className="rv-pack__mark display">ITK</span>
          <span className="rv-pack__day">#{day}</span>
        </span>
        <span className="rv-pack__seal rv-pack__seal--bottom" />
      </div>
    </div>
  );
}

export function PeelReveal({ rung, marks, day }: { rung: Rung; marks: readonly PlateMark[]; day: number }) {
  return (
    <div className="rv-peel">
      <ResultSticker rung={rung} marks={marks} day={day} />
      <span className="rv-peel__back" aria-hidden>
        <span className="rv-peel__print display">ITK</span>
      </span>
    </div>
  );
}
