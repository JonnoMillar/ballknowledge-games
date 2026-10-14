import { toGrade } from '../../../src/lib/chain/grade';
import type { Verdict } from './types';

/**
 * A run's picks, kept in this browser: one verdict per step once it is
 * locked. A reload resumes at the first open step; a finished run stays
 * finished. One entry per date.
 */
export type Run = (Verdict | null)[];

const KEY = 'step.progress.v1';

export const allRuns = (): Record<string, Run> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Run>;
    for (const run of Object.values(parsed)) for (const v of run) if (v) v.grade = toGrade(v.grade);
    return parsed;
  } catch { return {}; }
};

export function loadRun(date: string, steps: number): Run {
  const r = allRuns()[date];
  return r && r.length === steps ? r : Array<null>(steps).fill(null);
}

export function saveRun(date: string, run: Run): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...allRuns(), [date]: run })); } catch { /* private mode, or full */ }
}
