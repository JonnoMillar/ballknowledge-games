import type { TaskId, TaskResult } from './tasks';

/**
 * The run, kept in this browser: per date, each finished task's result and,
 * once the whole run is filed, the player's own date it was finished on.
 * A reload resumes at the first open task. Each game's own slice (careers,
 * steps) lives in that game's progress, so its daily carries on from it.
 */
export interface RunDay {
  results: Partial<Record<TaskId, TaskResult>>;
  /** The player's date when the run was finished. Equal to the run's date: played on the day, so it counts for the streak. */
  finishedOn?: string;
  /** R, frozen when the run was filed. */
  score?: number;
  /** Mid-task state for tasks with no daily of their own to keep it (Log the shot, Read the season), so a reload resumes. */
  items?: Partial<Record<TaskId, unknown>>;
}

const KEY = 'run.progress.v1';

export const allRuns = (): Record<string, RunDay> => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, RunDay>; } catch { return {}; }
};

export const loadRunDay = (date: string): RunDay => allRuns()[date] ?? { results: {} };

export function saveRunDay(date: string, day: RunDay): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...allRuns(), [date]: day })); } catch { /* private mode, or full */ }
}

/** A task's own mid-task state, kept in the run's record. */
export const loadItems = <T,>(date: string, id: TaskId): T | undefined => loadRunDay(date).items?.[id] as T | undefined;
export function saveItems(date: string, id: TaskId, state: unknown): void {
  const day = loadRunDay(date);
  saveRunDay(date, { ...day, items: { ...day.items, [id]: state } });
}

/** The dates whose run was finished on the day itself: archive runs never count. */
export const streakDates = (runs: Record<string, RunDay>): string[] =>
  Object.entries(runs).filter(([d, r]) => r.finishedOn === d).map(([d]) => d);

/** The best report value's R this month (same YYYY-MM as `today`), from filed runs. */
export function bestThisMonth(runs: Record<string, RunDay>, today: string): number | null {
  const rs = Object.entries(runs).flatMap(([d, r]) => (d.slice(0, 7) === today.slice(0, 7) && r.score !== undefined ? [r.score] : []));
  return rs.length ? Math.max(...rs) : null;
}

/** A rest day is banked for every REST_EVERY days in a row played, at most REST_MAX banked. */
export const REST_EVERY = 7;
export const REST_MAX = 2;

export interface Streak { current: number; best: number; banked: number; rests: string[] }

const addDay = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Days with a finished run, on the player's own dates (section 6). A missed
 * day spends a banked rest day if there is one, else the streak ends. Today
 * not yet played breaks nothing.
 */
export function streakOf(dates: readonly string[], today: string): Streak {
  const played = new Set(dates);
  const out: Streak = { current: 0, best: 0, banked: 0, rests: [] };
  if (played.size === 0) return out;
  let inRow = 0;
  for (let d = [...played].sort()[0]!; d <= today; d = addDay(d, 1)) {
    if (played.has(d)) {
      out.current++;
      if (++inRow === REST_EVERY) { inRow = 0; out.banked = Math.min(REST_MAX, out.banked + 1); }
    } else if (d === today) {
      break;
    } else if (out.banked > 0) {
      out.banked--;
      out.rests.push(d);
      inRow = 0;
    } else {
      out.current = 0; inRow = 0; out.rests = [];
    }
    out.best = Math.max(out.best, out.current);
  }
  return out;
}
