import rolesJson from '../data/roles.json';
import { seeded } from '../../../src/lib/seeded';
import { canPlant, groupAt, slotAt, type At, type Group } from './match';
import { FITS, slotRole, type Role } from './roles';
import type { Named, Side } from './types';

/**
 * Find the mole: the daily run's planted XIs (docs/daily-run.md, section 13).
 * Real XIs from sides.json, each with one name swapped for a "Help the
 * faker" pick of its position, so the fairness work (same club that season,
 * or same nation and era) is the one Odd Man Out already does. A committed
 * schedule, topped up by the run-days cron.
 *
 * Rules, each a named constant:
 * - MOLES_A_DAY XIs a day, from different matches (Jonno, 2026-11-16: two);
 * - the side is from RUN_MOLE_FIRST on (the 16 to 26s know these careers);
 * - its match is not back within RUN_MOLE_GAP days (either team's XI);
 * - the mole replaces an outfielder (keeper picks are thin, some quirky);
 * - the mole plays where the slot is (lib/roles.ts): a holding midfielder's
 *   slot never gets a playmaker (Jonno, 2026-11-16: James Rodríguez in
 *   Casemiro's slot was a giveaway);
 * - the mole is never famous enough to be a tell: no more famous than the
 *   XI's upper quartile, no less famous than its least famous starter.
 */
export const RUN_MOLE_START = '2026-11-13';
export const RUN_MOLE_FIRST = '2010';
/** 159 matches from 2010 at two a day: 60 days keeps a match from coming back within two months. */
export const RUN_MOLE_GAP = 60;
export const MOLES_A_DAY = 2;
const GROUPS: readonly Group[] = ['DEF', 'MID', 'FWD'];
/** Found on the first tap, on the second; else nothing. */
export const MOLE_POINTS = [100, 50] as const;
export const MOLE_TAPS = MOLE_POINTS.length;

/** One planted XI: the side, the slot the mole takes, and the mole's pool id. */
export interface RunMole { side: string; at: [number, number]; fake: string }
/** A run day: its XIs, in the order they are played. */
export interface RunMoleDay { date: string; moles: RunMole[] }

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

/** Infobox roles (data/roles.json) plus every slot each player started in across the sides: built once per sides list. */
const ROLES = rolesJson as Record<string, Role[]>;
const rolesCache = new WeakMap<readonly Side[], Map<string, Set<Role>>>();
export function rolesOf(sides: readonly Side[]): Map<string, Set<Role>> {
  let m = rolesCache.get(sides);
  if (m) return m;
  m = new Map(Object.entries(ROLES).map(([id, rs]) => [id, new Set(rs)]));
  for (const s of sides) for (const line of s.lines) for (const p of line) {
    const r = slotRole(p.pos);
    if (p.id && r) (m.get(p.id) ?? m.set(p.id, new Set()).get(p.id)!).add(r);
  }
  rolesCache.set(sides, m);
  return m;
}

/** Does this player play where the slot is? Unknown roles never fit. */
export function playsThere(roles: ReadonlyMap<string, ReadonlySet<Role>>, id: string, pos: string): boolean {
  const want = slotRole(pos);
  const has = roles.get(id);
  return !!want && !!has && FITS[want].some((r) => has.has(r));
}

/** The moles that fit one slot. `sides` is the whole list, for the roles players started in. */
export function molesFor(side: Side, at: At, fame: Fame, sides: readonly Side[] = [side]): Named[] {
  const slot = slotAt(side, at);
  if (at[0] === 0 || !slot) return [];
  const [lo, hi] = band(side, fame);
  const roles = rolesOf(sides);
  return (side.help[groupAt(side, at)] ?? []).filter((p) => canPlant(side, p) && fame.has(p.id) && fame.get(p.id)! >= lo && fame.get(p.id)! <= hi && playsThere(roles, p.id, slot.pos));
}

/** What is wrong with one day, given the days before it. Empty when it keeps every promise. */
export function problems(sides: readonly Side[], fame: Fame, day: RunMoleDay, before: readonly RunMoleDay[]): string[] {
  const byKey = new Map(runPool(sides).map((s) => [s.key, s]));
  const out: string[] = [];
  if (day.moles.length !== MOLES_A_DAY) out.push(`${day.date}: ${day.moles.length} XIs, not ${MOLES_A_DAY}`);
  const earlier = before.flatMap((d) => d.moles.map((x) => ({ date: d.date, x })));
  day.moles.forEach((mole, i) => {
    const side = byKey.get(mole.side);
    if (!side) return void out.push(`${day.date}: ${mole.side} is not a run side`);
    if (side.date >= day.date) out.push(`${day.date}: a match not yet played`);
    if (!molesFor(side, mole.at, fame, sides).some((p) => p.id === mole.fake)) out.push(`${day.date}: ${mole.fake} does not fit ${mole.side} ${mole.at.join(':')}`);
    const m = matchOf(side);
    for (const e of [...earlier, ...day.moles.slice(0, i).map((x) => ({ date: day.date, x }))]) {
      const o = byKey.get(e.x.side);
      if (o && matchOf(o) === m && between(e.date, day.date) < RUN_MOLE_GAP) out.push(`${day.date}: ${m} back within ${RUN_MOLE_GAP} days`);
    }
  });
  return out;
}

/** One day: MOLES_A_DAY times, the longest-unused match, a random outfield slot that has moles, a random mole. Throws if nothing fits. */
export function composeDay(sides: readonly Side[], fame: Fame, date: string, before: readonly RunMoleDay[]): RunMoleDay {
  const rand = seeded(`run-mole:${date}`);
  const pool = runPool(sides).filter((s) => s.date < date);
  const byKey = new Map(pool.map((s) => [s.key, s]));
  const lastUsed = new Map<string, string>();
  for (const d of before) for (const x of d.moles) { const s = byKey.get(x.side); if (s) lastUsed.set(matchOf(s), d.date); }
  const moles: RunMole[] = [];
  while (moles.length < MOLES_A_DAY) {
    const mole = pickMole(sides, pool, lastUsed, fame, date, rand);
    moles.push(mole);
    lastUsed.set(matchOf(byKey.get(mole.side)!), date);
  }
  return { date, moles };
}

function pickMole(sides: readonly Side[], pool: readonly Side[], lastUsed: ReadonlyMap<string, string>, fame: Fame, date: string, rand: () => number): RunMole {
  const order = pool
    .filter((s) => !lastUsed.has(matchOf(s)) || between(lastUsed.get(matchOf(s))!, date) >= RUN_MOLE_GAP)
    .map((s) => ({ s, k: lastUsed.get(matchOf(s)) ?? '0000', r: rand() }))
    .sort((a, b) => a.k.localeCompare(b.k) || a.r - b.r)
    .map((x) => x.s);
  for (const side of order) {
    const slots = side.lines.flatMap((line, l) => line.map((_, k): At => [l, k])).filter((at) => GROUPS.includes(groupAt(side, at)) && molesFor(side, at, fame, sides).length);
    if (!slots.length) continue;
    const at = slots[Math.floor(rand() * slots.length)]!;
    const moles = molesFor(side, at, fame, sides);
    return { side: side.key, at: [at[0], at[1]], fake: moles[Math.floor(rand() * moles.length)]!.id };
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

/** One XI's score from its taps, in order: 100 first time, 50 second, else 0. The task is the mean of the day's XIs. */
export const moleScore = (taps: readonly boolean[]): number => {
  const i = taps.indexOf(true);
  return i >= 0 && i < MOLE_TAPS ? MOLE_POINTS[i]! : 0;
};
