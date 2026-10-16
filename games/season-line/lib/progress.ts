import type { Guess, Judged } from './types';

/**
 * The guesses on each board, kept in this browser so a reload resumes and a
 * finished day stays finished. Daily boards are keyed by date, endless ones
 * by id. `seen` is the endless boards already dealt, so they do not come round again.
 */
const KEY = 'seasonline.progress.v1';
const SEEN = 'seasonline.seen.v1';
const RANGE = 'seasonline.range.v1';

const get = <T,>(k: string, fallback: T): T => {
  try { return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? fallback; } catch { return fallback; }
};
const set = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode, or full */ } };

export const allGuesses = () => get<Record<string, Guess[]>>(KEY, {});
export const loadGuesses = (id: string): Guess[] => allGuesses()[id] ?? [];
export const saveGuesses = (id: string, g: Guess[]) => set(KEY, { ...allGuesses(), [id]: g });

const BONUS = 'seasonline.bonus.v1';
export const loadBonus = (id: string) => get<Record<string, string>>(BONUS, {})[id] ?? null;
export const saveBonus = (id: string, name: string) => set(BONUS, { ...get<Record<string, string>>(BONUS, {}), [id]: name });

export const seenEndless = () => get<string[]>(SEEN, []);
export const markSeen = (id: string) => set(SEEN, [...seenEndless().filter((x) => x !== id), id].slice(-300));

export const loadRange = () => get<[number, number] | null>(RANGE, null);
export const saveRange = (r: [number, number]) => set(RANGE, r);

/** The share line: per guess, the club square and the season arrow. */
export function shareLine(title: string, judged: readonly Judged[], won: boolean, bonus = false): string {
  const rows = judged.map((j) => `${j.clubRight ? '🟩' : '⬛'}${j.season === 0 ? '🟩' : j.season > 0 ? '⬆️' : '⬇️'}`);
  return `${title} ${won ? judged.length : 'X'}/5\n${rows.join(' ')}`;
}
