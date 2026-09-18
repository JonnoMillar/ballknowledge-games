'use client';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';

/**
 * The lines on the sealed sheet, drawn as ink rather than laid out as CSS.
 *
 * On the live board the rule between two cards is a dotted border on a div:
 * it is simply there. On the sealed sheet nothing is there until it is
 * drawn. A pen runs a dotted line from one card towards the die, the die
 * comes down, the line takes the die's colour and carries on to the next
 * card. When every link has held, one solid stroke runs the whole chain in
 * a single motion — under each die, into and out of each card — and the
 * loop is closed. That stroke is the reveal's one flourish and it is made
 * of the same material as everything else on the sheet: a line, drawn.
 *
 * Geometry is measured, not computed: every card cell and every crest box
 * reports its rect, and a link's path runs from the edge of one cell to
 * the centre of its crest to the edge of the next cell. The same code
 * draws a line, a square ring and a loop of six, and will draw a diagonal
 * the day a layout has one.
 *
 * The drawing is GSAP: one timeline in LockIn owns the whole reveal, and
 * this component hands it tweens to place. A dotted line cannot be drawn
 * with the dash-offset trick — its dashes ARE the dots — so each dotted
 * path is revealed through a mask whose solid twin is drawn instead.
 */

export interface Point { x: number; y: number }

export interface InkHandle {
  /** Draw link `li`'s dotted line as far as its die (`'crest'`) or its end. */
  draw(li: number, to: 'crest' | 'end', duration: number, ease: string): gsap.core.Tween;
  /** The dotted line takes a colour: the die's. */
  tint(li: number, colour: string, duration: number): gsap.core.Tween;
  /**
   * The seal: a solid stroke drawn along every link in order, as one
   * motion. `onPass` fires as the pen reaches each die.
   */
  seal(duration: number, ease: string, onPass?: (li: number) => void): gsap.core.Tween;
  /** The dotted layer goes, leaving the seal. */
  fade(duration: number): gsap.core.Tween;
}

interface LinkPath {
  d: string;
  /** How far along the path the die sits, 0..1. */
  crestAt: number;
  length: number;
}

/**
 * Where a line to the die meets the cell: the point on the cell's edge
 * nearest the die. For a card beside its die that is straight across at
 * the die's height; for one above or below, straight down at its x — so
 * the line is level with the rule the live board drew, not a diagonal to
 * the cell's centre. A die inside the cell (never, today) gets the ray
 * from the centre instead.
 */
function edgeToward(r: DOMRect, toward: Point): Point {
  const inside = toward.x > r.left && toward.x < r.right && toward.y > r.top && toward.y < r.bottom;
  if (!inside) {
    return {
      x: Math.min(r.right, Math.max(r.left, toward.x)),
      y: Math.min(r.bottom, Math.max(r.top, toward.y)),
    };
  }
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const tx = dx === 0 ? Infinity : (r.width / 2) / Math.abs(dx);
  const ty = dy === 0 ? Infinity : (r.height / 2) / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

const ChainInk = forwardRef<InkHandle, {
  /** The box every measurement is relative to; the SVG fills it. */
  box: RefObject<HTMLDivElement | null>;
  /** The slot cells, by slot index. */
  cells: RefObject<(HTMLElement | null)[]>;
  /** The crest boxes, by link index. */
  crests: RefObject<(HTMLElement | null)[]>;
  /** Which slots each link joins. */
  pairs: readonly [number, number][];
  /** The colour a link is drawn in before its die has decided. */
  pencil: string;
  /** The seal's ink. */
  ink: string;
  onReady?: () => void;
}>(function ChainInk({ box, cells, crests, pairs, pencil, ink, onReady }, ref) {
  const [paths, setPaths] = useState<LinkPath[]>([]);
  const masks = useRef<(SVGPathElement | null)[]>([]);
  const dots = useRef<(SVGPathElement | null)[]>([]);
  const seals = useRef<(SVGPathElement | null)[]>([]);
  const dotLayer = useRef<SVGGElement>(null);
  const readyOnce = useRef(false);
  // Keyed off the instance so two sheets on one page could not share masks.
  const id = useRef(`ink-${Math.random().toString(36).slice(2, 8)}`).current;

  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current?.getBoundingClientRect();
      if (!b) return;
      const next: LinkPath[] = [];
      for (const [li, [a, c]] of pairs.entries()) {
        const A = cells.current?.[a]?.getBoundingClientRect();
        const B = cells.current?.[c]?.getBoundingClientRect();
        const K = crests.current?.[li]?.getBoundingClientRect();
        if (!A || !B || !K) return;
        const crest = { x: K.left + K.width / 2 - b.left, y: K.top + K.height / 2 - b.top };
        const rel = (r: DOMRect) => new DOMRect(r.left - b.left, r.top - b.top, r.width, r.height);
        const start = edgeToward(rel(A), crest);
        const end = edgeToward(rel(B), crest);
        const l1 = dist(start, crest);
        const l2 = dist(crest, end);
        next.push({
          d: `M ${start.x} ${start.y} L ${crest.x} ${crest.y} L ${end.x} ${end.y}`,
          crestAt: l1 / (l1 + l2),
          length: l1 + l2,
        });
      }
      setPaths((prev) => {
        const same = prev.length === next.length && prev.every((p, i) => p.d === next[i]!.d);
        return same ? prev : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    // Fonts settle after first paint; one late pass catches the reflow.
    const late = setTimeout(measure, 300);
    return () => { ro.disconnect(); clearTimeout(late); };
  }, [box, cells, crests, pairs]);

  useLayoutEffect(() => {
    if (paths.length === pairs.length && paths.length > 0 && !readyOnce.current) {
      readyOnce.current = true;
      onReady?.();
    }
  }, [paths, pairs.length, onReady]);

  useImperativeHandle(ref, () => ({
    draw(li, to, duration, ease) {
      const el = masks.current[li] ?? null;
      const p = paths[li];
      const target = to === 'crest' ? 1 - (p?.crestAt ?? 0.5) : 0;
      return gsap.to(el, { attr: { 'stroke-dashoffset': target }, duration, ease });
    },
    tint(li, colour, duration) {
      return gsap.to(dots.current[li] ?? null, { stroke: colour, duration, ease: 'power1.inOut' });
    },
    seal(duration, ease, onPass) {
      const total = paths.reduce((t, p) => t + p.length, 0);
      const starts: number[] = [];
      paths.reduce((t, p) => { starts.push(t); return t + p.length; }, 0);
      const passed = new Set<number>();
      const state = { at: 0 };
      return gsap.to(state, {
        at: total, duration, ease,
        onUpdate: () => {
          paths.forEach((p, li) => {
            const done = Math.min(1, Math.max(0, (state.at - starts[li]!) / p.length));
            seals.current[li]?.setAttribute('stroke-dashoffset', String(1 - done));
            if (!passed.has(li) && done >= p.crestAt) { passed.add(li); onPass?.(li); }
          });
        },
      });
    },
    fade(duration) {
      return gsap.to(dotLayer.current, { opacity: 0, duration, ease: 'power1.out' });
    },
  }), [paths]);

  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}
    >
      <defs>
        {paths.map((p, li) => (
          <mask key={li} id={`${id}-${li}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <path
              ref={(el) => { masks.current[li] = el; }}
              d={p.d}
              pathLength={1}
              stroke="#fff"
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="1"
              strokeDashoffset="1"
            />
          </mask>
        ))}
      </defs>
      <g ref={dotLayer}>
        {paths.map((p, li) => (
          <path
            key={li}
            ref={(el) => { dots.current[li] = el; }}
            d={p.d}
            mask={`url(#${id}-${li})`}
            stroke={pencil}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0 5.6"
            fill="none"
          />
        ))}
      </g>
      <g>
        {paths.map((p, li) => (
          <path
            key={li}
            ref={(el) => { seals.current[li] = el; }}
            d={p.d}
            pathLength={1}
            stroke={ink}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            strokeDashoffset="1"
            fill="none"
          />
        ))}
      </g>
    </svg>
  );
});

export default ChainInk;
