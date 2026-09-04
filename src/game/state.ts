import { isValidPlacement, scoreBoard } from '../lib/puzzle/validate';
import type { Board, Formation, Placement } from '../lib/puzzle/types';
import type { Player } from '../lib/chemistry/types';

export interface Rejection {
  slotId: string;
  reason: 'occupied' | 'position' | 'links';
  failedEdges: string[];
}

export interface GameState {
  board: Board;
  formation: Formation;
  pool: ReadonlyMap<string, Player>;
  /** Seeded slots plus everything the player has placed. */
  placed: Record<string, string>;
  /** Candidates the player has gathered. Unbounded and free. */
  library: string[];
  lastRejection: Rejection | null;
  submitted: boolean;
}

export type Action =
  | { type: 'library/add'; playerId: string }
  | { type: 'library/remove'; playerId: string }
  | { type: 'place'; slotId: string; playerId: string }
  | { type: 'unplace'; slotId: string }
  | { type: 'submit' };

export function initState(
  board: Board,
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
): GameState {
  return {
    board, formation, pool,
    placed: { ...board.seeded },
    library: [],
    lastRejection: null,
    submitted: false,
  };
}

const isSeeded = (s: GameState, slotId: string) => s.board.seeded[slotId] !== undefined;

export function reduce(s: GameState, a: Action): GameState {
  if (s.submitted) return s;

  switch (a.type) {
    case 'library/add':
      if (s.library.includes(a.playerId)) return s;
      if (Object.values(s.placed).includes(a.playerId)) return s;
      return { ...s, library: [...s.library, a.playerId], lastRejection: null };

    case 'library/remove':
      return { ...s, library: s.library.filter((id) => id !== a.playerId) };

    case 'place': {
      if (isSeeded(s, a.slotId)) return s;
      const player = s.pool.get(a.playerId);
      if (!player) return s;

      // Vacate wherever they currently are, so a move never duplicates them.
      const placed = { ...s.placed };
      for (const [slot, id] of Object.entries(placed)) {
        if (id === a.playerId && !isSeeded(s, slot)) delete placed[slot];
      }
      // A slot already holding someone else sends them back to the library.
      const displaced = placed[a.slotId];
      delete placed[a.slotId];

      const r = isValidPlacement(s.board, s.formation, s.pool, placed as Placement, a.slotId, player);
      if (!r.ok) {
        return { ...s, lastRejection: { slotId: a.slotId, reason: r.reason, failedEdges: r.failedEdges } };
      }

      placed[a.slotId] = a.playerId;
      const library = s.library.filter((id) => id !== a.playerId);
      if (displaced && displaced !== a.playerId && !library.includes(displaced)) {
        library.push(displaced);
      }
      return { ...s, placed, library, lastRejection: null };
    }

    case 'unplace': {
      if (isSeeded(s, a.slotId)) return s;
      const id = s.placed[a.slotId];
      if (!id) return s;
      const placed = { ...s.placed };
      delete placed[a.slotId];
      return {
        ...s, placed,
        library: s.library.includes(id) ? s.library : [...s.library, id],
        lastRejection: null,
      };
    }

    case 'submit': {
      const score = scoreBoard(s.formation, s.pool, s.placed as Placement);
      return score.solved ? { ...s, submitted: true } : s;
    }
  }
}
