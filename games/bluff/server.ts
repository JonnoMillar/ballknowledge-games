import runJson from './data/run.json';
import sidesJson from './data/sides.json';
import { MOLE_TAPS, type RunMoleDay } from './lib/run';
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

// ── Find the mole: the daily run's planted XI ──────────────────────────────

const RUN = new Map((runJson as unknown as RunMoleDay[]).map((d) => [d.date, d]));
const BY_KEY = new Map(SIDES.map((s) => [s.key, s]));
const utcTomorrow = (now: Date) => new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

/** The run's XI as the page sees it: names only, the mole in place, never which one until it is over. */
export interface RunMoleView {
  date: string;
  team: string;
  opponent: string;
  score: string | null;
  comp: string;
  /** The match's date. */
  played: string;
  formation: string;
  /** Names only, back to front: no ids, numbers or anything the mole would lack. */
  lines: string[][];
  taps: { at: [number, number]; right: boolean }[];
  /** Once found, both taps spent or the clock out. */
  reveal: { at: [number, number]; fake: string; real: string } | null;
}

const isAt = (x: unknown): x is [number, number] => Array.isArray(x) && x.length === 2 && x.every((n) => Number.isInteger(n) && n >= 0);

/**
 * The day's XI judged as far as the taps go. `out`: the clock ran out. The
 * body is public input, checked; a day is only served from its date (up to
 * UTC tomorrow, for time zones ahead).
 */
export function runMole(date: unknown, taps: readonly unknown[], out: unknown, now = new Date()): RunMoleView | null {
  if (typeof date !== 'string' || date > utcTomorrow(now)) return null;
  const day = RUN.get(date);
  const side = day && BY_KEY.get(day.side);
  const fake = side && Object.values(side.help).flat().find((p) => p!.id === day.fake);
  if (!day || !side || !fake) return null;
  const isMole = (at: readonly number[]) => at[0] === day.at[0] && at[1] === day.at[1];
  const judged: RunMoleView['taps'] = [];
  for (const t of taps.slice(0, MOLE_TAPS)) {
    if (!isAt(t) || !side.lines[t[0]]?.[t[1]] || judged.some((j) => j.at[0] === t[0] && j.at[1] === t[1])) return null;
    judged.push({ at: [t[0], t[1]], right: isMole(t) });
    if (isMole(t)) break;
  }
  const over = out === true || judged.length >= MOLE_TAPS || judged.some((j) => j.right);
  return {
    date, team: side.team, opponent: side.opponent, score: side.score, comp: side.comp, played: side.date, formation: side.formation,
    lines: side.lines.map((line, l) => line.map((s, k) => (isMole([l, k]) ? fake.name : s.name))),
    taps: judged,
    reveal: over ? { at: day.at, fake: fake.name, real: side.lines[day.at[0]]![day.at[1]]!.name } : null,
  };
}
