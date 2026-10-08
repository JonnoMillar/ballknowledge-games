import type { Spot } from './pitch';
import type { Tally } from './score';

export type Credit = 'statsbomb' | 'understat';

export type Source =
  | { from: 'statsbomb'; matchId: number; eventId: string }
  | { from: 'understat'; matchId: number; shotId: string };

/** A goal as the server keeps it. `source`, `at` and `xg` are written by the scripts. */
export interface Goal {
  scorer: string;
  match: string;
  date: string;
  competition: string;
  line: string;
  kind: 'classic' | 'recent';
  source: Source;
  at: Spot;
  xg: number;
}
export type Goals = Record<string, Goal>;

export interface Pack { id: string; title: string; goals: string[] }

/** What the page gets of a goal: everything but the answer. */
export interface GoalCard {
  slug: string;
  scorer: string;
  match: string;
  date: string;
  competition: string;
  line: string;
  credit: Credit;
}

/** A board as the page gets it. `id` is a date or `pack:<id>`. */
export interface BoardView {
  id: string;
  title: string;
  date: string | null;
  number: number | null;
  goals: GoalCard[];
  par: Tally;
}

/** What a thrown pin gets back. `mirrored` is the wrong-side distance, or null. */
export interface Answer { at: Spot; distance: number; mirrored: number | null; xg: number; credit: Credit }
