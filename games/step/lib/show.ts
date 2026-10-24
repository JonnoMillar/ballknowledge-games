import type { Grade } from '../../../src/lib/chain/grade';

/**
 * The show after the break, one template for every grade: the camera pushes
 * in on the card, it sways once while the light runs round its edge, then it
 * settles back. Deeper grades push further, sway wider, and light the stage.
 */
export type Show = { ms: number; push: number; sway: number; lit: number; pool: number; shadow: boolean };
export const SHOW: Record<Grade, Show> = {
  basic: { ms: 500, push: 1, sway: 0, lit: 0.55, pool: 0, shadow: false },
  decent: { ms: 800, push: 1.1, sway: 6, lit: 0.8, pool: 0, shadow: false },
  solid: { ms: 1000, push: 1.2, sway: 8, lit: 0.9, pool: 0, shadow: false },
  sharp: { ms: 1100, push: 1.3, sway: 9, lit: 1, pool: 0.8, shadow: false },
  elite: { ms: 1200, push: 1.35, sway: 10, lit: 1, pool: 1, shadow: true },
};

const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

/**
 * The show at time u (0 to 1): pure, so a frame is the same however it is
 * reached. In fast, held, out soft; zoom moves in log space so the push
 * feels even. The light orbits the case and the tilt follows it, so the
 * sheen is always on the edge turned towards you.
 */
export function showAt(s: Show, u: number) {
  const env = easeOut(clamp(u / 0.35)) * (1 - easeInOut(clamp((u - 0.7) / 0.3)));
  const a = -Math.PI / 2 + u * Math.PI * 1.8;
  return {
    push: Math.exp(Math.log(s.push) * env),
    rx: s.sway * 0.5 * Math.sin(a) * env,
    ry: s.sway * Math.cos(a) * env,
    lx: 50 + 62 * Math.cos(a),
    ly: 50 + 62 * Math.sin(a),
    lit: s.lit * Math.sin(Math.PI * clamp(u)),
    pool: s.pool * env,
  };
}
