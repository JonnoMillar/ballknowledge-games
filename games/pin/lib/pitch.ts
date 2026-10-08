/**
 * Pitch pin's geometry.
 *
 * Metres on a nominal 105 × 68 m pitch, attacking half only, drawn with the
 * goal at the top: x across from the attacker's left touchline (0 to 68),
 * y out from the goal line (0 to 52.5). Both data sources stretch every
 * pitch to one size, so these are nominal metres.
 */
export interface Spot { x: number; y: number }

export const WIDTH = 68;
export const HALF = 52.5;
/** The lazy pin: the penalty spot. Par is what it would score. */
export const SPOT: Spot = { x: 34, y: 11 };

/** StatsBomb: 120 × 80, attacking toward x = 120, y = 0 on the attacker's left. */
export function fromStatsBomb(sx: number, sy: number): Spot {
  return { x: (sy * WIDTH) / 80, y: ((120 - sx) * 105) / 120 };
}

/** Understat: 0 to 1, X = 1 at the goal attacked, Y = 0 on the attacker's right (flipped against StatsBomb). */
export function fromUnderstat(X: number, Y: number): Spot {
  return { x: (1 - Y) * WIDTH, y: (1 - X) * 105 };
}

export const distance = (a: Spot, b: Spot): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mirror = (s: Spot): Spot => ({ x: WIDTH - s.x, y: s.y });
export const clamp = (s: Spot): Spot => ({ x: Math.min(WIDTH, Math.max(0, s.x)), y: Math.min(HALF, Math.max(0, s.y)) });
export const inHalf = (s: Spot): boolean => s.x >= 0 && s.x <= WIDTH && s.y >= 0 && s.y <= HALF;
/** Inside the penalty area: 16.5 m out and 20.16 m either side of the middle. */
export const inArea = (s: Spot): boolean => s.y <= 16.5 && Math.abs(s.x - WIDTH / 2) <= 20.16;
/** One decimal place, for what is written to disk. */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * The wrong-side note. A goal remembered from a side-on camera often comes
 * back mirrored; when the pin is well off but near the mirror image, say so.
 * Returns the mirrored distance, or null when the note does not apply.
 */
export function mirrorNote(pin: Spot, at: Spot): number | null {
  const d = distance(pin, at);
  const m = distance(pin, mirror(at));
  return d > 5 && m < d / 2 ? m : null;
}
