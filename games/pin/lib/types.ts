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

/** Where a pack comes from: our weekly pick, the official monthly shortlist, past winners by season or club, or hand-made. */
export type PackKind = 'round' | 'month' | 'season' | 'club' | 'classic';
export const PACK_KINDS: readonly PackKind[] = ['round', 'month', 'season', 'club', 'classic'];

/** A pack file, games/pin/data/packs/<id>.json. `season` ("2026-27") is on round, month and season packs only. `published` is a UTC date. */
export interface Pack {
  id: string;
  kind: PackKind;
  title: string;
  subtitle: string;
  season?: string;
  published: string;
  goals: string[];
}

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

/** A pack as the page gets it: everything but the answers. */
export interface BoardView {
  id: string;
  title: string;
  goals: GoalCard[];
  par: Tally;
}

/** A pack on the library page. */
export interface PackCard {
  id: string;
  kind: PackKind;
  title: string;
  subtitle: string;
  size: number;
  par: Tally;
  isNew: boolean;
}
export interface Shelf { title: string; packs: PackCard[] }

/** What a thrown pin gets back. `mirrored` is the wrong-side distance, or null. */
export interface Answer { at: Spot; distance: number; mirrored: number | null; xg: number; credit: Credit }
