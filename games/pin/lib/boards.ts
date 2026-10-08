import { dailyOrder, dayNumber } from '../../../src/lib/daily';
import { inArea, type Spot } from './pitch';
import { par } from './score';
import type { Goals, Pack } from './types';

/** Day 1 of Pitch pin. Set to the launch date when it ships. */
export const PIN_EPOCH = '2026-10-08';
/** A board's par must be at least this: an average of 7 m a goal from the penalty spot. */
export const PAR_FLOOR = 42;

/** A real calendar date in YYYY-MM-DD. Also what keeps a board id from being a path. */
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** A fair board: the lazy pin cannot coast it, and it has goals from in and out of the area. */
export function fair(ats: readonly Spot[]): boolean {
  return par(ats).metres >= PAR_FLOOR && ats.some(inArea) && ats.some((a) => !inArea(a));
}

/** The classics the daily draws from: those in no pack, so a pack never spoils a daily. */
export function dailyPool(goals: Goals, packs: readonly Pack[]): string[] {
  const inPack = new Set(packs.flatMap((p) => p.goals));
  return Object.keys(goals).filter((s) => goals[s]!.kind === 'classic' && !inPack.has(s)).sort();
}

/** The classics for a day: n at a time from a fixed shuffle, wrapping when the pool runs out. */
export function classicsFor(day: number, pool: readonly string[], n = 2): string[] {
  const order = dailyOrder(pool);
  const len = order.length;
  return Array.from({ length: n }, (_, i) => order[((((day - 1) * n + i) % len) + len) % len]!);
}

/** A day's six goals: the week script's board, or six classics when it was not run. */
export function daySlugs(date: string, days: Readonly<Record<string, string[]>>, pool: readonly string[]): string[] {
  return days[date] ?? classicsFor(dayNumber(date, PIN_EPOCH), pool, 6);
}
