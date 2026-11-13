import { GRADE_WORD, type Grade } from '../chain/grade';
import { FIND_ORDER, RUN_TASKS, type TaskId, type TaskResult } from './tasks';

/**
 * The run's scoring, pure (docs/daily-run.md, section 3). Each task scores
 * 0 to 100; the run score R is their mean. The player never sees R: they
 * see the band word and what the day's report is worth.
 */

const one = (x: number) => Math.round(x * 10) / 10;

/** A graded pick's task score: its grade's range, placed by `depth` (0 to 1 inside the grade). Steps uses it. */
export const GRADE_RANGE: Record<Grade, readonly [number, number]> = {
  basic: [40, 54], decent: [55, 69], solid: [70, 84], sharp: [85, 94], elite: [95, 100],
};
export function gradeScore(grade: Grade | null, depth = 0): number {
  if (!grade) return 0;
  const [lo, hi] = GRADE_RANGE[grade];
  return one(lo + Math.min(1, Math.max(0, depth)) * (hi - lo));
}

/** R: the mean of today's task scores, to one decimal. */
export function runScore(scores: readonly number[]): number {
  return scores.length === 0 ? 0 : one(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** report value (£m) = VALUE_BASE × VALUE_GROWTH ^ R. No ceiling to read against. */
export const VALUE_BASE = 1.0;
export const VALUE_GROWTH = 1.05;

export const reportValue = (r: number): number => VALUE_BASE * VALUE_GROWTH ** r;
/** "£37.0m". */
export const money = (m: number): string => `£${m.toFixed(1)}m`;

/** The site's five words, by the lowest R each needs. */
export const BANDS: readonly [Grade, number][] = [
  ['elite', 85], ['sharp', 70], ['solid', 55], ['decent', 40], ['basic', 0],
];
export const bandOf = (r: number): Grade => BANDS.find(([, at]) => r >= at)![0];
export const bandWord = (r: number): string => GRADE_WORD[bandOf(r)];

/**
 * "Top X%" before there are real players: our scale's normal curve over R.
 * Shown only to the top half (X ≤ 50).
 */
export const SCALE_MEAN = 60;
export const SCALE_SD = 15;

/** Φ, the standard normal CDF (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
export function phi(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** X in "Top X%", rounded up; never below 1. */
export function topPercent(r: number): number {
  return Math.max(1, Math.ceil(100 * (1 - phi((r - SCALE_MEAN) / SCALE_SD)) - 1e-9));
}

/** The curve's height at R, 0 to 1 at the mean: for drawing the bell. */
export const bell = (r: number): number => Math.exp(-(((r - SCALE_MEAN) / SCALE_SD) ** 2) / 2);

/** A task's mark: shape and lightness on screen, a glyph in the share line. */
export type TaskMark = 'clean' | 'partial' | 'miss';
export const markOf = (s: number): TaskMark => (s >= 80 ? 'clean' : s >= 40 ? 'partial' : 'miss');
export const MARK_GLYPH: Record<TaskMark, string> = { clean: '✅', partial: '🔸', miss: '❌' };
export const MARK_WORD: Record<TaskMark, string> = { clean: 'Clean', partial: 'Partial', miss: 'Miss' };

/**
 * The best moment of the run: the find with the highest task score, ties
 * broken by FIND_ORDER. With no find, the best task named plainly.
 */
export function bestMoment(results: Partial<Record<TaskId, TaskResult>>): string | null {
  const done = RUN_TASKS.flatMap((t) => (results[t.id] ? [{ t, r: results[t.id]! }] : []));
  if (done.length === 0) return null;
  const finds = done.filter((d) => d.r.find);
  if (finds.length > 0) {
    finds.sort((a, b) => b.r.score - a.r.score || FIND_ORDER.indexOf(a.t.id) - FIND_ORDER.indexOf(b.t.id));
    return finds[0]!.r.find!;
  }
  const best = done.reduce((a, b) => (b.r.score > a.r.score ? b : a));
  return `Best task: ${best.t.name}`;
}

/** The share line: spoiler-free, one glyph per task in the run's order. */
export function shareLine({ day, archive, r, marks, streak }: {
  day: number; archive: boolean; r: number; marks: readonly TaskMark[]; streak: number;
}): string {
  const top = topPercent(r);
  return [
    archive ? `Assignment #${day}` : `Today's assignment #${day}`,
    `Ball knowledge: ${bandWord(r)}`,
    `Report valued at ${money(reportValue(r))}`,
    marks.map((m) => MARK_GLYPH[m]).join(''),
    top <= 50 ? `Top ${top}% on our scale` : null,
    !archive && streak >= 2 ? `🔥 ${streak}` : null,
    'ballknowledge-games.vercel.app',
  ].filter((l) => l !== null).join('\n');
}
