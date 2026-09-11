'use client';
import { useEffect, useId, useLayoutEffect, useRef } from 'react';

/**
 * The red string.
 *
 * A conspiracy board is the right reference for this screen because it is a
 * picture of exactly what the game asks for: not "are these two men famous"
 * but "what connects them". So the reveal does not colour a bar in — it runs
 * a length of twine from one pin to the next, one at a time, and you watch
 * the case being made.
 *
 * The first version was a 2.6px stroke with a dashed strand over it, and on
 * parchment it read as a dotted computer line. What makes this one an object:
 *
 * 1. **It has weight.** A blurred shadow under a dark core with a lighter
 *    twist over it, four and a half pixels across. Twine, not a rule.
 * 2. **It is tied.** A loop round the pin head at each end. String that meets
 *    a pin at a point is drawn to it; string that wraps the pin was tied by
 *    someone.
 * 3. **It goes on slack and is pulled taut.** The span is drawn hanging, the
 *    stamp lands, and only then does the rope spring tight with an overshoot.
 *    Cause, then effect — which is what makes the stamp the verdict rather
 *    than decoration.
 * 4. **A broken link snaps.** The rope parts in the middle and both ends drop.
 *    This is the only honest way to draw a failure here: the link was
 *    attempted and it did not hold.
 *
 * Each span is driven by a PHASE rather than a resolved index, because the
 * sealed sheet needs to say "drawn but not yet judged" — the beat between the
 * rope going on and the stamp coming down is the whole tension of the thing.
 */

export interface Anchor { x: number; y: number }

/** Where one span of the string has got to. */
export type SpanPhase = 'idle' | 'slack' | 'taut' | 'snapped';

const DRAW_MS = 520;
const TIGHTEN_MS = 520;
/** How much of the slack hang is left once the rope is pulled tight. */
const TAUT = 0.18;

const CORE = '#8e2416';
const TWIST = '#c8442c';
const LIGHT = '#eea28a';

/**
 * Twine hanging between two pins. `slack` runs from 1 (just hung) to 0 (as
 * tight as it goes); longer spans hang further. Kept shallow enough that the
 * rope stays clear of the die stamped between the prints below it.
 */
export function sagPath(a: Anchor, b: Anchor, slack: number, bow?: Bow): string {
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = (span * 0.075 + 5) * slack + 1.5;
  // A quadratic's midpoint sits halfway to the control point, hence the ×2.
  const off = bow
    ? { x: bow.x * (CLEAR + 24 * slack) * 2, y: 0 }
    : { x: 0, y: sag * 2 };
  return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2 + off.x} ${(a.y + b.y) / 2 + off.y} ${b.x} ${b.y}`;
}

/**
 * Which way a standing span is routed, as a unit vector pointing away from
 * the board. On a ring the sides run pin to pin down the OUTSIDE of the
 * cards; drawn straight they would cross every face on the way. `CLEAR` is
 * how far the taut rope sits off the pins' line — past the card's edge.
 */
export interface Bow { x: number; y: number }
const CLEAR = 68;

/** The route for each span: hanging, or bowed out round the cards. */
export function bowsFor(anchors: readonly Anchor[], spans: readonly [Anchor, Anchor][]): (Bow | undefined)[] {
  const cx = anchors.reduce((t, p) => t + p.x, 0) / Math.max(anchors.length, 1);
  return spans.map(([a, b]) => {
    if (Math.abs(b.y - a.y) <= Math.abs(b.x - a.x)) return undefined;
    return { x: (a.x + b.x) / 2 < cx ? -1 : 1, y: 0 };
  });
}

/** The loop the twine takes round a pin head. `dir` is which way it leaves. */
export function wrapPath(a: Anchor, dir: 1 | -1): string {
  const r = 6.2;
  return `M ${a.x - dir * r} ${a.y + 1} A ${r} ${r} 0 1 ${dir > 0 ? 1 : 0} ${a.x + dir * r} ${a.y + 1}`;
}

/** One dead end, hanging off its pin after the break. */
export function frayedPath(from: Anchor, to: Anchor, bow?: Bow): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (bow) {
    // Off the pin the way the rope was routed, then it drops.
    const ex = from.x + bow.x * CLEAR * 0.8;
    const ey = from.y + Math.abs(dy) * 0.22 + 18;
    return `M ${from.x} ${from.y} Q ${from.x + bow.x * CLEAR * 1.1} ${from.y + Math.abs(dy) * 0.05} ${ex} ${ey}`;
  }
  // Stops well short of centre, and falls: the tension that was holding it
  // up is gone, so what is left is length and gravity.
  const ex = from.x + dx * 0.36;
  const ey = from.y + dy * 0.36 + Math.hypot(dx, dy) * 0.34 + 14;
  return `M ${from.x} ${from.y} Q ${from.x + dx * 0.22} ${from.y + 8} ${ex} ${ey}`;
}

/**
 * How slack the rope is at progress `p` of the tightening, 0..1.
 *
 * A back-ease: it passes THROUGH the taut position, goes tighter still, and
 * settles back. A transition that eased to the target and stopped would read
 * as the string shrinking; the overshoot is what reads as a pull.
 */
export function springSlack(p: number): number {
  const c1 = 1.7;
  const e = 1 + (c1 + 1) * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  return 1 + (TAUT - 1) * e;
}

/** The four strands of one length of rope, sharing a path. */
function Rope({ d, shadowFilter, pathsRef }: {
  d: string;
  shadowFilter: string;
  pathsRef?: (els: SVGPathElement[]) => void;
}) {
  const els = useRef<SVGPathElement[]>([]);
  const at = (i: number) => (el: SVGPathElement | null) => {
    if (el) els.current[i] = el;
    if (els.current.length === 4) pathsRef?.(els.current);
  };
  return (
    <>
      <path ref={at(0)} d={d} stroke="rgba(60,20,10,0.42)" strokeWidth="5.2" fill="none" strokeLinecap="round" transform="translate(1.5, 3)" filter={shadowFilter} />
      <path ref={at(1)} d={d} stroke={CORE} strokeWidth="4.6" fill="none" strokeLinecap="round" />
      {/* The twist: a lighter strand in short dashes over the core, and a
          highlight on top of that. With round caps the dashes overlap the
          core's edge, which is the whole difference between rope and a
          stroke with a dotted line on it. */}
      <path ref={at(2)} d={d} stroke={TWIST} strokeWidth="3.2" fill="none" strokeLinecap="round" strokeDasharray="5 6.5" />
      <path ref={at(3)} d={d} stroke={LIGHT} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeDasharray="2.2 9.3" strokeDashoffset="-1.5" opacity="0.75" />
    </>
  );
}

function Segment({ a, b, phase, shadowFilter, bow }: {
  a: Anchor;
  b: Anchor;
  phase: SpanPhase;
  shadowFilter: string;
  bow?: Bow;
}) {
  const paths = useRef<SVGPathElement[]>([]);
  const frame = useRef(0);

  // Drawn from one pin to the other, once, when the span first goes on. The
  // solid strands reveal by dash offset; the dashed ones cannot without
  // breaking their pattern, so they fade up as the draw finishes.
  useLayoutEffect(() => {
    if (phase !== 'slack') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const p of paths.current) {
      const dashed = p.getAttribute('stroke-dasharray');
      if (reduced) continue;
      if (dashed) {
        p.style.opacity = '0';
        p.style.transition = `opacity 200ms ease ${DRAW_MS - 160}ms`;
        requestAnimationFrame(() => { p.style.opacity = p.getAttribute('opacity') ?? '1'; });
      } else {
        const L = p.getTotalLength() + 4;
        p.style.strokeDasharray = `${L}`;
        p.style.strokeDashoffset = `${L}`;
        p.style.transition = `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(0.4, 0.05, 0.25, 1)`;
        requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; });
      }
    }
  }, [phase]);

  // The pull. Written straight to the nodes per frame, like the swing: sixty
  // React renders a second for a `d` attribute nothing else reads is not
  // worth it.
  useEffect(() => {
    if (phase !== 'taut') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const set = (slack: number) => {
      const d = sagPath(a, b, slack, bow);
      for (const p of paths.current) {
        p.setAttribute('d', d);
        // The draw-in's dash settings would clip the new, shorter path.
        if (!p.getAttribute('stroke-dasharray')) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }
      }
    };
    if (reduced) { set(TAUT); return; }
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / TIGHTEN_MS);
      set(springSlack(p));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    // Frames stop in a hidden tab; make sure it ends taut regardless.
    const settle = setTimeout(() => { cancelAnimationFrame(frame.current); set(TAUT); }, TIGHTEN_MS + 60);
    return () => { cancelAnimationFrame(frame.current); clearTimeout(settle); };
  }, [phase, a, b, bow]);

  if (phase === 'idle') return null;

  if (phase === 'snapped') {
    // Both loose ends, dropping into place where the taut run was.
    return (
      <g style={{ animation: 'string-part 420ms cubic-bezier(0.2,0.9,0.3,1) both' }}>
        <path d={wrapPath(a, 1)} stroke={CORE} strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <Rope d={frayedPath(a, b, bow)} shadowFilter={shadowFilter} />
        <Rope d={frayedPath(b, a, bow)} shadowFilter={shadowFilter} />
      </g>
    );
  }

  return (
    <g>
      <path d={wrapPath(a, 1)} stroke={CORE} strokeWidth="4.2" fill="none" strokeLinecap="round" />
      <Rope d={sagPath(a, b, 1, bow)} shadowFilter={shadowFilter} pathsRef={(els) => { paths.current = els; }} />
      {phase === 'taut' ? (
        <path d={wrapPath(b, -1)} stroke={CORE} strokeWidth="4.2" fill="none" strokeLinecap="round" style={{ animation: 'frayed-in 160ms ease-out both' }} />
      ) : null}
    </g>
  );
}

export default function RedString({ anchors, phases, closed = false }: {
  /** Pin positions, in the coordinate space of the SVG's own box. */
  anchors: readonly Anchor[];
  /** One per span — one shorter than `anchors`, or the same length on a ring. */
  phases: readonly SpanPhase[];
  /** A ring: one more span runs from the last pin back to the first. */
  closed?: boolean;
}) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  if (anchors.length < 2) return null;
  const spans: [Anchor, Anchor][] = anchors.slice(0, -1).map((a, i) => [a, anchors[i + 1]!]);
  if (closed && anchors.length > 2) spans.push([anchors[anchors.length - 1]!, anchors[0]!]);
  const bows = bowsFor(anchors, spans);

  return (
    <svg
      aria-hidden
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 4, overflow: 'visible',
      }}
    >
      <defs>
        <filter id={`rope-shadow-${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      {spans.map(([a, b], i) => (
        <Segment
          key={i}
          a={a}
          b={b}
          phase={phases[i] ?? 'idle'}
          bow={bows[i]}
          shadowFilter={`url(#rope-shadow-${id})`}
        />
      ))}
    </svg>
  );
}
