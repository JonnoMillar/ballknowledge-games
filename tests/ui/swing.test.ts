import { describe, expect, it } from 'vitest';
import { stepSwing, tiltTarget, tiltFor, type SwingState } from '../../components/swing';

/**
 * The drag physics.
 *
 * Everything here is about ONE claim: the card behaves like a weight on a
 * spring rather than like a CSS transition. A transition eases toward its
 * target and stops dead; a weight overshoots, comes back past centre and
 * settles. That difference is the entire reason the code is a per-frame
 * integrator instead of three lines of CSS, so it is the thing worth pinning
 * down — and it cannot be checked in the browser, because requestAnimationFrame
 * does not run in a hidden tab.
 */

/** Run the spring for `ms` at 60fps against a fixed target. */
function run(from: SwingState, target: number, ms: number): SwingState {
  let s = from;
  for (let t = 0; t < ms; t += 1000 / 60) s = stepSwing(s, target, 1 / 60);
  return s;
}

/** Every angle the spring passes through, one per frame. */
function trace(from: SwingState, target: number, ms: number): number[] {
  let s = from;
  const out: number[] = [];
  for (let t = 0; t < ms; t += 1000 / 60) {
    s = stepSwing(s, target, 1 / 60);
    out.push(s.angle);
  }
  return out;
}

const REST: SwingState = { angle: 0, angular: 0 };

describe('tiltTarget', () => {
  it('leans the way the hand is moving', () => {
    expect(tiltTarget(1)).toBeGreaterThan(0);
    expect(tiltTarget(-1)).toBeLessThan(0);
  });

  it('hangs straight when the hand is still', () => {
    expect(tiltTarget(0)).toBe(0);
  });

  it('clamps, so a flick cannot spin the card over', () => {
    expect(tiltTarget(50)).toBeLessThanOrEqual(15);
    expect(tiltTarget(-50)).toBeGreaterThanOrEqual(-15);
  });
});

describe('stepSwing', () => {
  it('moves toward the target without arriving instantly', () => {
    const after = run(REST, 10, 30);
    expect(after.angle).toBeGreaterThan(0);
    expect(after.angle).toBeLessThan(10);
  });

  it('reaches the target while the hand keeps moving', () => {
    expect(run(REST, 10, 800).angle).toBeCloseTo(10, 1);
  });

  /**
   * The one that matters. Hold a lean, then stop the hand: the card must swing
   * PAST upright before it settles. Without this the whole thing is a tween
   * with extra steps.
   */
  it('overshoots past centre when the hand stops', () => {
    const leaning = run(REST, 12, 800);
    const angles = trace(leaning, 0, 900);
    expect(Math.min(...angles)).toBeLessThan(-0.4);
  });

  it('settles, rather than swinging forever', () => {
    const leaning = run(REST, 12, 800);
    const settled = run(leaning, 0, 2500);
    expect(Math.abs(settled.angle)).toBeLessThan(0.05);
    expect(Math.abs(settled.angular)).toBeLessThan(0.5);
  });

  /**
   * A backgrounded tab hands back one enormous frame. Integrated raw, a step
   * that large sends the spring to several thousand degrees and the card is
   * never seen again; the clamp inside stepSwing is what stops it.
   */
  it('survives a dropped frame without exploding', () => {
    const s = stepSwing({ angle: 0, angular: 0 }, 15, 4.5);
    expect(Number.isFinite(s.angle)).toBe(true);
    expect(Math.abs(s.angle)).toBeLessThan(90);
  });

  it('does not gain energy over a long idle run', () => {
    // Explicit Euler at this stiffness diverges here; semi-implicit does not.
    const s = run({ angle: 6, angular: 0 }, 0, 20000);
    expect(Math.abs(s.angle)).toBeLessThan(0.01);
  });
});

describe('tiltFor', () => {
  it('gives the same card the same lean every time', () => {
    expect(tiltFor('slot-2')).toBe(tiltFor('slot-2'));
  });

  it('stays inside the spread it was asked for', () => {
    for (let i = 0; i < 500; i++) {
      expect(Math.abs(tiltFor(`slot-${i}`, 2))).toBeLessThanOrEqual(2);
    }
  });

  /**
   * The hash is multiplied into a signed 32-bit value; taking the modulo
   * without `>>> 0` first leaves negatives negative and quietly throws away
   * the positive half of the range, so every card leans the same way.
   */
  it('leans both ways', () => {
    const angles = Array.from({ length: 200 }, (_, i) => tiltFor(`card-${i}`));
    expect(angles.some((a) => a > 0.3)).toBe(true);
    expect(angles.some((a) => a < -0.3)).toBe(true);
  });
});
