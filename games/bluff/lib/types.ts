import type { PositionClass } from '../../../src/lib/chemistry/types';

/** One player on the team sheet. `id` is the pool's, null for the odd starter the pool lacks. */
export interface Slot { id: string | null; name: string; pos: string }

export interface Named { id: string; name: string }

/** One team's starting XI from one real match: what a round is dealt. */
export interface Side {
  /** `<date>:<team>`, unique. */
  key: string;
  team: string;
  opponent: string;
  date: string;
  /** "Champions League final", "World Cup 2018, round of 16". */
  comp: string;
  /** From this team's side: "3–3". */
  score: string | null;
  formation: string;
  /** Back to front, each line left to right as seen attacking up the screen. */
  lines: Slot[][];
  /** "Help the faker": plausible fakes per position class, best first. */
  help: Partial<Record<PositionClass, Named[]>>;
}
