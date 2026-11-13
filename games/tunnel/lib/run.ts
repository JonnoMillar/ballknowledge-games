import { seeded } from '../../../src/lib/seeded';
import { RULES, type World } from './day';
import { apart, fair, SIZE, trueOrder } from './rules';

/**
 * Line them up: the daily run's own five a day (docs/daily-run.md, section
 * 15). Pecking Order's daily is not live (its six-category rollout waits on
 * Instagram coverage), so the run has its own schedule, like Log the shot
 * and Find the mole, built on Pecking Order's rules: five who played for one
 * club, put in order by age, then by height.
 *
 * Rules, each a named constant or Pecking Order's own:
 * - five players of one club (RULES.minApps league games there, its world);
 * - born from RUN_ORDER_BORN on (the 16 to 26s know these players);
 * - age and height each fair (no ties, neighbours a year and 3 cm apart);
 * - the walk-out line, the age line and the height line all apart, so no
 *   line hands over the next;
 * - no player back within RULES.playerGap days, no club within RULES.clubGap.
 * When Pecking Order's daily goes live it must keep clear of these players,
 * as Season line's daily keeps clear of the run's boards.
 */
export const RUN_ORDER_START = '2026-11-13';
export const RUN_ORDER_BORN = '1985-01-01';
export const RUN_ORDER_CATS = ['age', 'height'] as const;
export type RunCat = (typeof RUN_ORDER_CATS)[number];
const TRIES = 400;

/** A run day: the club, the five in walk-out order, and each line's values (age as days since 1970, negated: the youngest is least). */
export interface RunOrderDay { date: string; club: string; players: string[]; values: Record<RunCat, number[]> }

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(dayMs(d) + n * 86_400_000).toISOString().slice(0, 10);
const between = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / 86_400_000);
const bornFrom = Math.round(dayMs(RUN_ORDER_BORN) / 86_400_000);

const linesOf = (day: Pick<RunOrderDay, 'players' | 'values'>) => [day.players.map((_, i) => i), ...RUN_ORDER_CATS.map((c) => trueOrder(day.values[c]))];

/** What is wrong with one day, given the days before it. Empty when it keeps every promise. */
export function problems(world: World, day: RunOrderDay, before: readonly RunOrderDay[]): string[] {
  const out: string[] = [];
  const ps = day.players.map((id) => world.byId.get(id));
  if (day.players.length !== SIZE || new Set(day.players).size !== SIZE) out.push(`${day.date}: not five players`);
  if (ps.some((p) => !p)) return [...out, `${day.date}: unknown player`];
  if (ps.some((p) => (p!.apps.get(day.club) ?? 0) < RULES.minApps)) out.push(`${day.date}: not all five played for ${day.club}`);
  if (ps.some((p) => p!.born < bornFrom)) out.push(`${day.date}: born before ${RUN_ORDER_BORN}`);
  if (day.values.age.some((v, i) => v !== -ps[i]!.born) || day.values.height.some((v, i) => v !== ps[i]!.cm)) out.push(`${day.date}: values out of step`);
  for (const c of RUN_ORDER_CATS) if (!fair(c, day.values[c])) out.push(`${day.date}: ${c} not fair`);
  const [walk, age, height] = linesOf(day);
  if (!apart(walk!, age!) || !apart(age!, height!) || !apart(walk!, height!, false)) out.push(`${day.date}: lines too close`);
  for (const d of before) {
    const ago = between(d.date, day.date);
    if (ago < RULES.playerGap) for (const p of day.players) if (d.players.includes(p)) out.push(`${day.date}: ${p} back within ${RULES.playerGap} days`);
    if (ago < RULES.clubGap && d.club === day.club) out.push(`${day.date}: ${day.club} back within ${RULES.clubGap} days`);
  }
  return out;
}

/** One day: clubs in a seeded order (bigger ones more often), five of its players drawn until every rule holds. Throws if none does. */
export function composeDay(world: World, date: string, before: readonly RunOrderDay[]): RunOrderDay {
  const rand = seeded(`run-order:${date}`);
  const cooling = new Set(before.filter((d) => between(d.date, date) < RULES.playerGap).flatMap((d) => d.players));
  const cool = new Set(before.filter((d) => between(d.date, date) < RULES.clubGap).map((d) => d.club));
  const clubs = [...world.clubs.keys()].sort()
    .map((c) => [c, rand() ** (1 / world.clubs.get(c)!.length)] as const)
    .sort((a, b) => b[1] - a[1]).map(([c]) => c)
    .filter((c) => !cool.has(c));
  for (const club of clubs) {
    const members = world.clubs.get(club)!.filter((id) => !cooling.has(id) && world.byId.get(id)!.born >= bornFrom);
    if (members.length < SIZE) continue;
    for (let t = 0; t < TRIES; t++) {
      const pick = [...members];
      for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pick[i], pick[j]] = [pick[j]!, pick[i]!]; }
      const players = pick.slice(0, SIZE);
      const ps = players.map((id) => world.byId.get(id)!);
      const day: RunOrderDay = { date, club, players, values: { age: ps.map((p) => -p.born), height: ps.map((p) => p.cm) } };
      if (problems(world, day, before).length === 0) return day;
    }
  }
  throw new Error(`run order: no five fit ${date}`);
}

/** The schedule from RUN_ORDER_START through `through`, keeping the days already there. */
export function extend(world: World, days: readonly RunOrderDay[], through: string): RunOrderDay[] {
  const out = [...days];
  for (let d = out.length ? addDays(out[out.length - 1]!.date, 1) : RUN_ORDER_START; d <= through; d = addDays(d, 1)) out.push(composeDay(world, d, out));
  return out;
}
