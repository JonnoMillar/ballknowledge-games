import sidesJson from './data/sides.json';
import type { Side } from './lib/types';

/**
 * Bluff's team sheets (games/bluff/data/sides.json, built by
 * `npm run bluff:sides`). Imported, not read at runtime, so file tracing
 * ships it. A round is one side, dealt at random within the year range.
 */
const SIDES = sidesJson as Side[];

const yearOf = (s: Side) => +s.date.slice(0, 4);

export const SIDE_COUNT = SIDES.length;

/** The years there are sides for: the range the front page offers. */
export const YEARS = { first: Math.min(...SIDES.map(yearOf)), last: Math.max(...SIDES.map(yearOf)) };

/** A side in the range the phone hasn't dealt lately; a repeat only once the range is used up. */
export function deal(from: number, to: number, exclude: readonly string[], rand: () => number = Math.random): Side | null {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const inRange = SIDES.filter((s) => yearOf(s) >= lo && yearOf(s) <= hi);
  const skip = new Set(exclude);
  const fresh = inRange.filter((s) => !skip.has(s.key));
  const pool = fresh.length ? fresh : inRange;
  return pool[Math.floor(rand() * pool.length)] ?? null;
}
