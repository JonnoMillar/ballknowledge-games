'use client';
import { useEffect, useRef } from 'react';

/**
 * A picture swinging from the fingers that are carrying it.
 *
 * The obvious version of this is a CSS transition on `rotate` driven by
 * pointer position, and it is wrong in a way that is hard to name until you
 * hold the two side by side: a transition eases toward a target and stops, so
 * the card leans while you move and snaps upright the instant you stop. Real
 * weight does not do that. It overshoots, comes back past centre, and settles.
 *
 * So this is a spring integrated per frame rather than a tween. The pointer's
 * horizontal velocity sets where the card WANTS to hang; a damped spring is
 * what actually gets it there, and the overshoot on the way is the whole
 * point — it is the only part a player would notice if it were missing.
 *
 * The transform is written straight to the node. Sixty state updates a second
 * would re-render the drag overlay, the card and its photo on every frame for
 * a value nothing else reads.
 */

/** Degrees of lean at full tilt. Beyond about 16 it stops reading as weight. */
const MAX_TILT = 15;
/** Velocity (px/ms) that earns full tilt. A brisk drag is roughly 1.5. */
const FULL_TILT_AT = 1.9;
const STIFFNESS = 168;
const DAMPING = 15.5;
/** How fast the measured velocity decays when the pointer stops moving. */
const VELOCITY_DECAY = 0.86;
/** Lag, in pixels of trail per px/ms of speed. The card follows the hand. */
const TRAIL = 5.5;

/** Where the card wants to hang, given how fast the hand is moving. */
export function tiltTarget(vx: number): number {
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, (vx / FULL_TILT_AT) * MAX_TILT));
}

/** Angle and angular velocity, in degrees and degrees per second. */
export interface SwingState { angle: number; angular: number }

/**
 * One step of the spring.
 *
 * Semi-implicit Euler: acceleration from the CURRENT offset, then position
 * from the NEW velocity. Explicit Euler — position first, from the old
 * velocity — gains energy at this stiffness and shakes itself apart within a
 * second or two, which looks like the card developing a tremor.
 *
 * Pulled out of the animation frame so it can be driven by a test. A spring
 * whose only home is a requestAnimationFrame closure cannot be checked at
 * all: rAF does not run in a hidden tab, so the one property that matters —
 * that it overshoots and comes back rather than easing to a stop — is
 * unobservable exactly where it would be observed.
 */
export function stepSwing(s: SwingState, target: number, dt: number): SwingState {
  const step = Math.min(0.032, dt);
  const accel = STIFFNESS * (target - s.angle) - DAMPING * s.angular;
  const angular = s.angular + accel * step;
  return { angular, angle: s.angle + angular * step };
}

export interface SwingOptions {
  /** Off while nothing is being dragged, so the loop is not running idle. */
  active: boolean;
  /** Scale at rest. The lift is a static part of the same transform. */
  scale?: number;
}

/**
 * Attach the returned ref to the element that should swing. It must be free
 * to own its own `transform`; put positioning on a parent.
 */
export function useSwing({ active, scale = 1 }: SwingOptions) {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!active) {
      node.style.transform = '';
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      node.style.transform = `scale(${scale})`;
      return;
    }

    // Pivot above the top edge: a picture carried between finger and thumb
    // hangs from a point that is not on the card. Rotating about its own
    // centre reads as a spinning tile instead.
    node.style.transformOrigin = '50% -14%';
    node.style.willChange = 'transform';

    let swing: SwingState = { angle: 0, angular: 0 };
    let vx = 0;         // px/ms, smoothed
    let vy = 0;
    let lastX: number | null = null;
    let lastY: number | null = null;
    let lastMove = 0;
    let last = 0;

    const onMove = (e: PointerEvent) => {
      const now = e.timeStamp;
      if (lastX !== null && lastY !== null && now > lastMove) {
        const dt = Math.min(48, now - lastMove);
        // Blend rather than replace: a single frame's delta is noisy enough
        // that the card twitches on it.
        vx = vx * 0.45 + ((e.clientX - lastX) / dt) * 0.55;
        vy = vy * 0.45 + ((e.clientY - lastY) / dt) * 0.55;
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastMove = now;
    };

    window.addEventListener('pointermove', onMove, { passive: true });

    const tick = (t: number) => {
      if (!last) last = t;
      // Clamped so a dropped frame or a backgrounded tab cannot integrate a
      // half-second step and fling the card off its own axis.
      const dt = Math.min(0.032, (t - last) / 1000);
      last = t;

      // The pointer stopping produces no further events, so velocity has to
      // decay on its own or the card hangs at a lean forever.
      if (t - lastMove > 40) {
        vx *= VELOCITY_DECAY;
        vy *= VELOCITY_DECAY;
      }

      swing = stepSwing(swing, tiltTarget(vx), dt);

      const trailX = Math.max(-14, Math.min(14, -vx * TRAIL));
      const trailY = Math.max(-12, Math.min(12, -vy * TRAIL));

      node.style.transform =
        `translate3d(${trailX.toFixed(2)}px, ${trailY.toFixed(2)}px, 0) ` +
        `rotate(${swing.angle.toFixed(2)}deg) scale(${scale})`;

      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('pointermove', onMove);
      node.style.willChange = '';
    };
  }, [active, scale]);

  return ref;
}

/**
 * A stable, tiny rotation for a card at a given position.
 *
 * Nothing on a real board hangs straight, but random() per render would make
 * every card jump on every keystroke in the search box. Hashing the index
 * gives the same scatter every time from nothing but the position.
 */
export function tiltFor(seed: number | string, spread = 1.9): number {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // >>> 0 first: the multiply leaves a signed 32-bit value and a negative
  // numerator turns the modulo negative, which halves the spread.
  return (((h >>> 0) % 2000) / 1000 - 1) * spread;
}
