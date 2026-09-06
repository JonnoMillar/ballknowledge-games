import { chainLinks, chainProgress } from '../lib/chain/score';
import type { ChainPuzzle } from '../lib/chain/types';
import type { Player } from '../lib/chemistry/types';

export interface ChainState {
  puzzle: ChainPuzzle;
  pool: ReadonlyMap<string, Player>;
  /** The line as it stands. Index 0 is the left end. */
  filled: (string | null)[];
  /** Candidates the player has gathered. Unbounded and free. */
  library: string[];
  submitted: boolean;
}

export type ChainAction =
  | { type: 'library/add'; playerId: string }
  | { type: 'library/remove'; playerId: string }
  | { type: 'place'; index: number; playerId: string }
  | { type: 'unplace'; index: number }
  | { type: 'submit' };

export function initChain(puzzle: ChainPuzzle, pool: ReadonlyMap<string, Player>): ChainState {
  return {
    puzzle,
    pool,
    filled: [...puzzle.slots],
    library: [],
    submitted: false,
  };
}

const isGiven = (s: ChainState, index: number) => s.puzzle.slots[index] != null;
const outOfRange = (s: ChainState, i: number) => i < 0 || i >= s.filled.length;

export function chainReduce(s: ChainState, a: ChainAction): ChainState {
  if (s.submitted) return s;

  switch (a.type) {
    case 'library/add':
      if (s.library.includes(a.playerId)) return s;
      if (s.filled.includes(a.playerId)) return s;
      return { ...s, library: [...s.library, a.playerId] };

    case 'library/remove':
      return { ...s, library: s.library.filter((id) => id !== a.playerId) };

    case 'place': {
      if (outOfRange(s, a.index) || isGiven(s, a.index)) return s;
      if (!s.pool.has(a.playerId)) return s;

      // A player holds at most one slot in the chain. Moving them vacates the
      // slot they came from — but a GIVEN slot cannot be vacated, so placing
      // someone who is already given has to be refused outright. Falling
      // through instead put the same player on two slots at once and let them
      // link to themselves.
      if (s.puzzle.slots.includes(a.playerId)) return s;

      // Otherwise placement is never refused. There is no legality test to fail:
      // a player who does not link just leaves that link ungreen, which the
      // line shows plainly. Blocking the drop would hide the information the
      // player is trying to get.
      const filled = [...s.filled];

      // Vacate wherever they already are, so a move never duplicates them.
      filled.forEach((id, i) => { if (id === a.playerId && !isGiven(s, i)) filled[i] = null; });

      const displaced = filled[a.index];
      filled[a.index] = a.playerId;

      const library = s.library.filter((id) => id !== a.playerId);
      if (displaced && displaced !== a.playerId && !library.includes(displaced)) {
        library.push(displaced);
      }
      return { ...s, filled, library };
    }

    case 'unplace': {
      if (outOfRange(s, a.index) || isGiven(s, a.index)) return s;
      const id = s.filled[a.index];
      if (!id) return s;
      const filled = [...s.filled];
      filled[a.index] = null;
      return {
        ...s,
        filled,
        library: s.library.includes(id) ? s.library : [...s.library, id],
      };
    }

    case 'submit': {
      const solved = chainProgress(chainLinks(s.filled, s.pool, s.puzzle.mode ?? 'chemistry')).solved;
      return solved ? { ...s, submitted: true } : s;
    }
  }
}
