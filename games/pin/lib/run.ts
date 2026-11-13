import { seeded } from '../../../src/lib/seeded';
import { lazyScore } from './score';
import type { Goals } from './types';

/**
 * Log the shot: the daily run's three goals a day (docs/daily-run.md,
 * section 10). A committed schedule, topped up by a cron, like the other
 * dailies: past days freeze, reuse needs history.
 *
 * Rules, each a named constant:
 * - RUN_PIN_GOALS a day, none back within RUN_PIN_GAP days;
 * - at most RUN_PIN_CLASSICS classic a day;
 * - at least one goal from the last RUN_PIN_RECENT days (this season's
 *   preferred), so the run is about football the 16 to 26s watched;
 * - never two from one match;
 * - fair: the lazy pin (all on the penalty spot) scores under RUN_PIN_LAZY.
 * When the goals run thin (summer brings none for ten weeks), the reuse gap
 * shrinks by itself, a step at a time down to RUN_PIN_GAP_MIN, and the day
 * records the gap it was built to. No one has to step in. Below that it
 * throws, so the cron goes red.
 */
export const RUN_PIN_START = '2026-11-13';
export const RUN_PIN_GOALS = 3;
export const RUN_PIN_GAP = 60;
export const RUN_PIN_GAP_MIN = 30;
const GAP_STEP = 10;
export const RUN_PIN_CLASSICS = 1;
export const RUN_PIN_RECENT = 365;
export const RUN_PIN_LAZY = 60;
/** Top up when fewer than MIN_AHEAD days are left, to TOP_UP ahead. */
export const MIN_AHEAD = 14;
export const TOP_UP = 28;

/** `gap` is the reuse gap the day was built to, when it is under RUN_PIN_GAP. */
export interface RunPinDay { date: string; goals: string[]; gap?: number }

export const addDays = (date: string, n: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const between = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** The season a date falls in starts on 1 August. */
export const seasonStart = (date: string): string => `${Number(date.slice(0, 4)) - (date.slice(5, 7) < '08' ? 1 : 0)}-08-01`;

/** What is wrong with one day, given the days before it. Empty when it keeps every promise. */
export function problems(goals: Goals, day: RunPinDay, before: readonly RunPinDay[]): string[] {
  const out: string[] = [];
  const gs = day.goals.map((s) => goals[s]);
  if (day.goals.length !== RUN_PIN_GOALS) out.push(`${day.date}: ${day.goals.length} goals`);
  if (gs.some((g) => !g)) return [...out, `${day.date}: unknown goal`];
  if (gs.some((g) => g!.date >= day.date)) out.push(`${day.date}: a goal not yet scored`);
  if (gs.filter((g) => g!.kind === 'classic').length > RUN_PIN_CLASSICS) out.push(`${day.date}: too many classics`);
  if (!gs.some((g) => between(g!.date, day.date) <= RUN_PIN_RECENT)) out.push(`${day.date}: nothing recent`);
  if (new Set(gs.map((g) => `${g!.match}|${g!.date}`)).size !== gs.length) out.push(`${day.date}: two from one match`);
  if (lazyScore(gs.map((g) => g!.at)) >= RUN_PIN_LAZY) out.push(`${day.date}: the lazy pin scores ${lazyScore(gs.map((g) => g!.at))}`);
  const gap = day.gap ?? RUN_PIN_GAP;
  if (gap < RUN_PIN_GAP_MIN) out.push(`${day.date}: gap ${gap} under ${RUN_PIN_GAP_MIN}`);
  const recent = new Set(before.filter((d) => between(d.date, day.date) < gap).flatMap((d) => d.goals));
  for (const s of day.goals) if (recent.has(s)) out.push(`${day.date}: ${s} back within ${gap} days`);
  return out;
}

/** One day's goals at the widest gap that fits, or throws if none does. */
export function composeDay(goals: Goals, date: string, before: readonly RunPinDay[]): RunPinDay {
  for (let gap = RUN_PIN_GAP; gap >= RUN_PIN_GAP_MIN; gap -= GAP_STEP) {
    const day = atGap(goals, date, before, gap);
    if (day) return gap < RUN_PIN_GAP ? { ...day, gap } : day;
  }
  throw new Error(`run pin: no three goals fit ${date}, even ${RUN_PIN_GAP_MIN} days apart`);
}

function atGap(goals: Goals, date: string, before: readonly RunPinDay[], gap: number): RunPinDay | null {
  const rand = seeded(`run-pin:${date}`);
  const lastUsed = new Map<string, string>();
  for (const d of before) for (const s of d.goals) lastUsed.set(s, d.date);
  const free = Object.keys(goals).filter((s) => goals[s]!.date < date && (!lastUsed.has(s) || between(lastUsed.get(s)!, date) >= gap));
  // Never-used first, then longest unused; random within that order.
  const order = free.map((s) => ({ s, k: lastUsed.get(s) ?? '0000', r: rand() })).sort((a, b) => a.k.localeCompare(b.k) || a.r - b.r).map((x) => x.s);
  const season = seasonStart(date);
  const anchors = [
    ...order.filter((s) => goals[s]!.date >= season),
    ...order.filter((s) => goals[s]!.date < season && between(goals[s]!.date, date) <= RUN_PIN_RECENT),
  ];
  for (const a of anchors) {
    // Fillers spend older goals first: recent ones are scarce, and each day needs one.
    const isRecent = (s: string) => between(goals[s]!.date, date) <= RUN_PIN_RECENT;
    const rest = [...order.filter((s) => s !== a && !isRecent(s)), ...order.filter((s) => s !== a && isRecent(s))];
    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        const day: RunPinDay = { date, goals: [a, rest[i]!, rest[j]!], ...(gap < RUN_PIN_GAP ? { gap } : {}) };
        if (problems(goals, day, before).length === 0) {
          // The anchor need not come first on screen.
          const k = Math.floor(rand() * day.goals.length);
          [day.goals[0], day.goals[k]] = [day.goals[k]!, day.goals[0]!];
          return day;
        }
      }
    }
  }
  return null;
}

/** The schedule from RUN_PIN_START through `through`, keeping the days already there. */
export function extend(goals: Goals, days: readonly RunPinDay[], through: string): RunPinDay[] {
  const out = [...days];
  for (let d = out.length ? addDays(out[out.length - 1]!.date, 1) : RUN_PIN_START; d <= through; d = addDays(d, 1)) out.push(composeDay(goals, d, out));
  return out;
}
