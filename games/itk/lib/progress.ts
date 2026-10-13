/**
 * A day's play, kept in this browser so a reload resumes the round and a
 * finished day stays finished. One entry per date.
 */
export interface Pick { index: number; fake: boolean }
export interface Played {
  picks: Pick[][];
  /** Per round, once it is over: where the fake was, and the real club it covered. */
  fakes: (number | null)[];
  reals: ({ clubId: string; name: string } | null)[];
}

const KEY = 'itk.progress.v1';

const all = (): Record<string, Played> => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Played>; } catch { return {}; }
};

export function loadPlayed(date: string, rounds: number): Played {
  const p = all()[date];
  if (p && p.picks.length === rounds) return p;
  return { picks: Array.from({ length: rounds }, () => []), fakes: Array(rounds).fill(null), reals: Array(rounds).fill(null) };
}

export function savePlayed(date: string, played: Played): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...all(), [date]: played })); } catch { /* private mode, or full */ }
}
