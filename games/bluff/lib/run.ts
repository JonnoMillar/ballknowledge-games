import { seeded } from '../../../src/lib/seeded';
import { canPlant, groupAt, slotAt, type At, type Group } from './match';
import type { Named, Side } from './types';

/**
 * Find the mole: the daily run's planted XI (docs/daily-run.md, section 13).
 * One real XI a day from sides.json with one name swapped for a "Help the
 * faker" pick of its position, so the fairness work (same club that season,
 * or same nation and era) is the one Odd Man Out already does. A committed
 * schedule, topped up by the run-days cron.
 *
 * Rules, each a named constant:
 * - the side is from RUN_MOLE_FIRST on (the 16 to 26s know these careers);
 * - its match is not back within RUN_MOLE_GAP days (either team's XI);
 * - the mole replaces an outfielder (keeper picks are thin, some quirky);
 * - the mole is never famous enough to be a tell: no more famous than the
 *   XI's upper quartile, no less famous than its least famous starter.
 */
export const RUN_MOLE_START = '2026-11-13';
export const RUN_MOLE_FIRST = '2010';
export const RUN_MOLE_GAP = 120;
const GROUPS: readonly Group[] = ['DEF', 'MID', 'FWD'];
/** Found on the first tap, on the second; else nothing. */
export const MOLE_POINTS = [100, 50] as const;
export const MOLE_TAPS = MOLE_POINTS.length;

/** A run day: the side, the slot the mole takes, and the mole's pool id. */
export interface RunMoleDay { date: string; side: string; at: [number, number]; fake: string }

/** A pool fame (sitelinks) lookup; only the schedule builder and tests need it. */
export type Fame = ReadonlyMap<string, number>;

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86_400_000).toISOString().slice(0, 10);
const between = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 86_400_000);

/** One match, whichever team's XI: the date and both teams. */
const matchOf = (s: Side) => `${s.date}|${[s.team, s.opponent].sort().join('|')}`;

export const runPool = (sides: readonly Side[]): Side[] => sides.filter((s) => s.date >= RUN_MOLE_FIRST);

/** The fame band a mole must sit in for this XI: [least famous starter, upper quartile]. */
function band(side: Side, fame: Fame): [number, number] {
  const fs = side.lines.flat().flatMap((p) => (p.id && fame.has(p.id) ? [fame.get(p.id)!] : [])).sort((a, b) => a - b);
  return [fs[0] ?? 0, fs[Math.floor(fs.length * 0.75)] ?? Infinity];
}

/** The moles that fit one slot. */
export function molesFor(side: Side, at: At, fame: Fame): Named[] {
  if (at[0] === 0 || !slotAt(side, at)) return [];
  const [lo, hi] = band(side, fame);
  return (side.help[groupAt(side, at)] ?? []).filter((p) => canPlant(side, p) && fame.has(p.id) && fame.get(p.id)! >= lo && fame.get(p.id)! <= hi);
}

/** What is wrong with one day, given the days before it. Empty when it keeps every promise. */
export function problems(sides: readonly Side[], fame: Fame, day: RunMoleDay, before: readonly RunMoleDay[]): string[] {
  const pool = runPool(sides);
  const side = pool.find((s) => s.key === day.side);
  if (!side) return [`${day.date}: ${day.side} is not a run side`];
  const out: string[] = [];
  if (side.date >= day.date) out.push(`${day.date}: a match not yet played`);
  if (!molesFor(side, day.at, fame).some((p) => p.id === day.fake)) out.push(`${day.date}: ${day.fake} does not fit ${day.at.join(':')}`);
  const m = matchOf(side);
  const byKey = new Map(pool.map((s) => [s.key, s]));
  for (const d of before) {
    const o = byKey.get(d.side);
    if (o && matchOf(o) === m && between(d.date, day.date) < RUN_MOLE_GAP) out.push(`${day.date}: ${m} back within ${RUN_MOLE_GAP} days`);
  }
  return out;
}

/** One day: the longest-unused match, a random outfield slot that has moles, a random mole. Throws if nothing fits. */
export function composeDay(sides: readonly Side[], fame: Fame, date: string, before: readonly RunMoleDay[]): RunMoleDay {
  const rand = seeded(`run-mole:${date}`);
  const pool = runPool(sides).filter((s) => s.date < date);
  const byKey = new Map(pool.map((s) => [s.key, s]));
  const lastUsed = new Map<string, string>();
  for (const d of before) { const s = byKey.get(d.side); if (s) lastUsed.set(matchOf(s), d.date); }
  const order = pool
    .filter((s) => !lastUsed.has(matchOf(s)) || between(lastUsed.get(matchOf(s))!, date) >= RUN_MOLE_GAP)
    .map((s) => ({ s, k: lastUsed.get(matchOf(s)) ?? '0000', r: rand() }))
    .sort((a, b) => a.k.localeCompare(b.k) || a.r - b.r)
    .map((x) => x.s);
  for (const side of order) {
    const slots = side.lines.flatMap((line, l) => line.map((_, k): At => [l, k])).filter((at) => GROUPS.includes(groupAt(side, at)) && molesFor(side, at, fame).length);
    if (!slots.length) continue;
    const at = slots[Math.floor(rand() * slots.length)]!;
    const moles = molesFor(side, at, fame);
    return { date, side: side.key, at: [at[0], at[1]], fake: moles[Math.floor(rand() * moles.length)]!.id };
  }
  throw new Error(`run mole: no side fits ${date}`);
}

/** The schedule from RUN_MOLE_START through `through`, keeping the days already there. */
export function extend(sides: readonly Side[], fame: Fame, days: readonly RunMoleDay[], through: string): RunMoleDay[] {
  const out = [...days];
  for (let d = out.length ? addDays(out[out.length - 1]!.date, 1) : RUN_MOLE_START; d <= through; d = addDays(d, 1)) out.push(composeDay(sides, fame, d, out));
  return out;
}

/** "Champions League final 2021", "World Cup 2018, round of 16": the match, with its year once. */
export const matchName = (side: Pick<Side, 'comp' | 'date'>) => (/\d{4}/.test(side.comp) ? side.comp : `${side.comp} ${side.date.slice(0, 4)}`);

/** The task's score from the taps, in order: 100 first time, 50 second, else 0. */
export const moleScore = (taps: readonly boolean[]): number => {
  const i = taps.indexOf(true);
  return i >= 0 && i < MOLE_TAPS ? MOLE_POINTS[i]! : 0;
};
