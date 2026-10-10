'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp, distance, type Spot } from '../lib/pitch';

/**
 * The pitch, in metres: one SVG user unit is one metre, goal at the top.
 * Three uses: aiming (a pin to place), the reveal (zoom onto the pin and
 * the true spot, rings, the line) and full time (all six pairs).
 */
interface Box { x: number; y: number; w: number; h: number }
interface Pair { pin: Spot; at: Spot }

/** The whole half, with room for the goal above the line. */
const FULL: Box = { x: -1.5, y: -3, w: 71, h: 57 };
/** While a thumb drags, the pin sits this far above it, in screen pixels. */
const LIFT = 48;
const ZOOM_MS = 420;
const HOLD_MS = 1300;
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const viewBox = (b: Box) => `${b.x} ${b.y} ${b.w} ${b.h}`;
const ease = (t: number) => 1 - (1 - t) ** 3;
const lerp = (a: Box, b: Box, t: number): Box => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });

/** A box round the pin and the spot, in the pitch's proportions. */
function focusOn({ pin, at }: Pair): Box {
  const h = Math.max(18, distance(pin, at) + 10);
  const w = (h * FULL.w) / FULL.h;
  return { x: (pin.x + at.x) / 2 - w / 2, y: (pin.y + at.y) / 2 - h / 2, w, h };
}

interface Props {
  label: string;
  /** Aiming: the pin so far, and what to do when it moves. */
  pin?: Spot | null;
  onPin?: (s: Spot) => void;
  onEnter?: () => void;
  /** The reveal of one throw. */
  reveal?: Pair | null;
  /** Full time: every throw. */
  all?: Pair[];
}

export default function Pitch({ label, pin = null, onPin, onEnter, reveal = null, all }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [box, setBox] = useState<Box>(FULL);
  const [drag, setDrag] = useState<'touch' | 'mouse' | null>(null);

  const rx = reveal?.pin.x, ry = reveal?.pin.y, ax = reveal?.at.x, ay = reveal?.at.y;
  useEffect(() => {
    setBox(FULL);
    if (rx === undefined || ry === undefined || ax === undefined || ay === undefined) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const near = focusOn({ pin: { x: rx, y: ry }, at: { x: ax, y: ay } });
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = now - t0;
      if (t < ZOOM_MS) setBox(lerp(FULL, near, ease(t / ZOOM_MS)));
      else if (t < ZOOM_MS + HOLD_MS) setBox(near);
      else if (t < 2 * ZOOM_MS + HOLD_MS) setBox(lerp(near, FULL, ease((t - ZOOM_MS - HOLD_MS) / ZOOM_MS)));
      else { setBox(FULL); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [rx, ry, ax, ay]);

  function toSpot(e: PointerEvent<SVGSVGElement>, kind: 'touch' | 'mouse'): Spot | null {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY - (kind === 'touch' ? LIFT : 0)).matrixTransform(ctm.inverse());
    return clamp({ x: p.x, y: p.y });
  }
  function down(e: PointerEvent<SVGSVGElement>) {
    if (!onPin) return;
    const kind = e.pointerType === 'mouse' ? 'mouse' : 'touch';
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(kind);
    const s = toSpot(e, kind);
    if (s) onPin(s);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!onPin || !drag) return;
    const s = toSpot(e, drag);
    if (s) onPin(s);
  }
  function key(e: KeyboardEvent<SVGSVGElement>) {
    if (!onPin) return;
    if (e.key === 'Enter') { e.preventDefault(); onEnter?.(); return; }
    const d = ARROWS[e.key];
    if (!d) return;
    e.preventDefault();
    const step = e.shiftKey ? 2 : 0.5;
    const from = pin ?? { x: 34, y: 20 };
    onPin(clamp({ x: from.x + d[0] * step, y: from.y + d[1] * step }));
  }

  const lines = `${uid}-lines`;
  const half = `${uid}-half`;
  const magClip = `${uid}-mag`;
  // The magnifier (about 96 px across at phone width) sits in the top corner
  // away from the pin, so neither the thumb nor the lens covers it.
  const mag = drag === 'touch' && pin ? { x: pin.x < 34 ? 58 : 10, y: 9, r: 9 } : null;

  return (
    <div className="pitch">
      <svg
        ref={svg}
        className={`pitch__svg${onPin ? ' pitch__svg--aim' : ''}`}
        viewBox={viewBox(box)}
        role="img"
        aria-label={label}
        tabIndex={onPin ? 0 : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={key}
      >
        <defs>
          <g id={lines}><Lines /></g>
          <clipPath id={half}><rect x={0} y={0} width={68} height={52.5} /></clipPath>
          {mag ? <clipPath id={magClip}><circle cx={mag.x} cy={mag.y} r={mag.r} /></clipPath> : null}
        </defs>
        <rect className="pitch__grass" x={FULL.x} y={FULL.y} width={FULL.w} height={FULL.h} />
        <use href={`#${lines}`} />

        {reveal ? <Rings at={reveal.at} clip={half} /> : null}
        {reveal ? <line className="pitch__trail" x1={reveal.pin.x} y1={reveal.pin.y} x2={reveal.at.x} y2={reveal.at.y} /> : null}
        {reveal ? <PinMark at={reveal.pin} /> : null}
        {reveal ? <Ball at={reveal.at} /> : null}

        {all?.map((p, i) => (
          <g key={i}>
            <line className="pitch__trail pitch__trail--still" x1={p.pin.x} y1={p.pin.y} x2={p.at.x} y2={p.at.y} />
            <Ball at={p.at} still />
            <PinMark at={p.pin} n={i + 1} />
          </g>
        ))}

        {pin && !reveal ? <PinMark at={pin} /> : null}

        {mag && pin ? (
          <g className="pitch__mag" aria-hidden>
            <g clipPath={`url(#${magClip})`}>
              <circle className="pitch__magground" cx={mag.x} cy={mag.y} r={mag.r} />
              <g transform={`translate(${mag.x} ${mag.y}) scale(2.5) translate(${-pin.x} ${-pin.y})`}>
                <use href={`#${lines}`} />
                <PinMark at={pin} />
              </g>
            </g>
            <circle className="pitch__magring" cx={mag.x} cy={mag.y} r={mag.r} />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

/** The markings of the attacking half, to scale. */
export function Lines() {
  return (
    <g className="pitch__lines">
      <rect x={0} y={0} width={68} height={52.5} />
      <rect x={30.34} y={-2} width={7.32} height={2} />
      <rect x={24.84} y={0} width={18.32} height={5.5} />
      <rect x={13.84} y={0} width={40.32} height={16.5} />
      <path d="M26.69 16.5 A9.15 9.15 0 0 0 41.31 16.5" />
      <path d="M24.85 52.5 A9.15 9.15 0 0 1 43.15 52.5" />
      <path d="M0 1 A1 1 0 0 0 1 0" />
      <path d="M67 0 A1 1 0 0 0 68 1" />
      <circle className="pitch__dot" cx={34} cy={11} r={0.3} />
      <circle className="pitch__dot" cx={34} cy={52.5} r={0.3} />
    </g>
  );
}

/** The pin: a flat red disc centred exactly on its spot. */
export function PinMark({ at, n }: { at: Spot; n?: number }) {
  return (
    <g className="pitch__pin">
      <circle cx={at.x} cy={at.y} r={1.25} />
      {n ? <text className="pitch__num" x={at.x} y={at.y + 0.6}>{n}</text> : null}
    </g>
  );
}

export function Ball({ at, still }: { at: Spot; still?: boolean }) {
  return (
    <g className={`pitch__ball${still ? ' pitch__ball--still' : ''}`}>
      <circle cx={at.x} cy={at.y} r={1} />
      <circle className="pitch__balldot" cx={at.x} cy={at.y} r={0.35} />
    </g>
  );
}

/** Outer, inner and bullseye, shaded stronger toward the middle. */
export function Rings({ at, clip, className = '' }: { at: Spot; clip?: string; className?: string }) {
  return (
    <g className={`pitch__rings ${className}`} clipPath={clip ? `url(#${clip})` : undefined}>
      <circle className="pitch__ring pitch__ring--outer" cx={at.x} cy={at.y} r={10} />
      <circle className="pitch__ring pitch__ring--inner" cx={at.x} cy={at.y} r={5} />
      <circle className="pitch__ring pitch__ring--bull" cx={at.x} cy={at.y} r={2} />
    </g>
  );
}
