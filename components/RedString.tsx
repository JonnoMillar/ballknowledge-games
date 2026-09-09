'use client';
import { useEffect, useState } from 'react';

/**
 * The red string.
 *
 * A conspiracy board is the right reference for this screen because it is a
 * picture of exactly what the game asks for: not "are these two men famous"
 * but "what connects them". So the reveal does not colour a bar in — it runs
 * a length of twine from one pin to the next, one at a time, and you watch
 * the case being made.
 *
 * Three rules keep it from looking like a decorated line chart:
 *
 * 1. **It sags.** Twine has weight. A straight segment between two pins is a
 *    connector; a catenary is a physical object someone tied.
 * 2. **It is drawn, not faded.** Stroke-dashoffset runs from one pin to the
 *    other, so the string arrives with a direction — which is what makes a
 *    staggered sequence read as a chain being followed rather than as items
 *    appearing in a list.
 * 3. **A broken link snaps.** The string goes on taut, holds for a beat, then
 *    parts in the middle and both ends drop. This is the only honest way to
 *    draw a failure here: the link was attempted and it did not hold.
 */

export interface Anchor { x: number; y: number }

const DRAW_MS = 620;
const HOLD_MS = 260;

/** Where the string hangs between two pins. Longer spans sag further. */
function sagPath(a: Anchor, b: Anchor): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = Math.hypot(dx, dy);
  const sag = span * 0.11 + 7;
  return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + sag * 2} ${b.x} ${b.y}`;
}

/** One dead end, hanging off its pin after the break. */
function frayedPath(from: Anchor, to: Anchor): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Stops well short of centre, and falls: the tension that was holding it
  // horizontal is gone, so what is left is length and gravity.
  const endX = from.x + dx * 0.34;
  const endY = from.y + dy * 0.34 + Math.hypot(dx, dy) * 0.3 + 12;
  return `M ${from.x} ${from.y} Q ${from.x + dx * 0.2} ${from.y + 6} ${endX} ${endY}`;
}

function Segment({
  a, b, held, delay, length,
}: {
  a: Anchor;
  b: Anchor;
  held: boolean;
  delay: number;
  /** Generous over-estimate of the path length; only has to exceed it. */
  length: number;
}) {
  const [snapped, setSnapped] = useState(false);

  useEffect(() => {
    if (held) return;
    const t = setTimeout(() => setSnapped(true), delay + DRAW_MS + HOLD_MS);
    return () => clearTimeout(t);
  }, [held, delay]);

  const draw = {
    strokeDasharray: length,
    strokeDashoffset: length,
    animation: `string-draw ${DRAW_MS}ms cubic-bezier(0.4, 0.05, 0.25, 1) ${delay}ms forwards`,
  } as const;

  if (snapped) {
    // Both loose ends, fading up in place of the taut run.
    return (
      <g style={{ animation: 'frayed-in 260ms ease-out both' }}>
        {[frayedPath(a, b), frayedPath(b, a)].map((d, i) => (
          <g key={i}>
            <path d={d} stroke="rgba(90,26,14,0.34)" strokeWidth="3.4" fill="none" strokeLinecap="round" transform="translate(0.8, 1.8)" />
            <path d={d} stroke="#a52f1b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d={d} stroke="#e07a63" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="1.6 3.6" opacity="0.5" />
          </g>
        ))}
      </g>
    );
  }

  const d = sagPath(a, b);
  return (
    <g style={held ? { animation: `string-tighten 520ms cubic-bezier(0.3,1.4,0.4,1) ${delay + DRAW_MS - 90}ms both` } : undefined}>
      {/* The string's own shadow on the board, a couple of pixels down. */}
      <path d={d} stroke="rgba(90,26,14,0.30)" strokeWidth="3.6" fill="none" strokeLinecap="round" transform="translate(1, 2.4)" style={draw} />
      <path d={d} stroke="#a52f1b" strokeWidth="2.6" fill="none" strokeLinecap="round" style={draw} />
      {/* The twist. A dashed lighter thread over the solid one is the whole
          difference between twine and a stroke. */}
      <path d={d} stroke="#e58068" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeDasharray="1.7 3.7" opacity="0.55" style={{ ...draw, strokeDasharray: undefined, animation: `frayed-in 300ms ease-out ${delay + DRAW_MS - 200}ms both` }} />
    </g>
  );
}

export default function RedString({
  anchors, held, resolved, beat, delay = 0,
}: {
  /** Pin positions, in the coordinate space of the SVG's own box. */
  anchors: readonly Anchor[];
  /** Whether each link held, one shorter than `anchors`. */
  held: readonly boolean[];
  /** Segments up to and including this index are allowed to run. -1 for none. */
  resolved: number;
  beat: number;
  delay?: number;
}) {
  if (anchors.length < 2) return null;

  return (
    <svg
      aria-hidden
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 4, overflow: 'visible',
      }}
    >
      {anchors.slice(0, -1).map((a, i) => {
        if (i > resolved) return null;
        const b = anchors[i + 1]!;
        return (
          <Segment
            key={i}
            a={a}
            b={b}
            held={held[i] ?? false}
            delay={delay + i * beat}
            length={Math.hypot(b.x - a.x, b.y - a.y) * 1.5 + 80}
          />
        );
      })}
    </svg>
  );
}
