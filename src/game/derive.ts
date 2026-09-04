import { linkColour } from '../lib/chemistry/link';
import { scoreBoard, isValidPlacement } from '../lib/puzzle/validate';
import { edgeKey } from '../lib/puzzle/edges';
import type { LinkColour, Player } from '../lib/chemistry/types';
import type { Placement } from '../lib/puzzle/types';
import type { GameState } from './state';

export type LinkStatus = 'earned' | 'open';

export interface LinkView {
  key: string;
  a: string;
  b: string;
  status: LinkStatus;
  /** The colour actually achieved. Null while either end is empty. */
  colour: LinkColour | null;
}

/**
 * Two states. The board does not prescribe what any link must be.
 *
 * An earlier version carried a required colour per edge and rendered it as a
 * dashed clue. That made the board a constraint-satisfaction puzzle with one
 * intended shape. It is not: where the links fall is the player's decision, and
 * the only target is 100 chemistry. So a link shows the colour it has actually
 * achieved, or nothing at all while either end is empty.
 */
export function linkViews(s: GameState): LinkView[] {
  return s.formation.adjacency.map(([a, b]) => {
    const key = edgeKey(a, b);
    const pa = s.placed[a];
    const pb = s.placed[b];
    if (pa && pb) {
      return { key, a, b, status: 'earned' as const, colour: linkColour(s.pool.get(pa)!, s.pool.get(pb)!) };
    }
    return { key, a, b, status: 'open' as const, colour: null };
  });
}

/** Individual chemistry per filled slot, 0..10. */
export function perSlotChemistry(s: GameState): Record<string, number> {
  return chemistry(s).perSlot;
}

export function canDrop(s: GameState, slotId: string, player: Player): boolean {
  if (s.board.seeded[slotId] !== undefined) return false;
  const placed = { ...s.placed };
  for (const [slot, id] of Object.entries(placed)) {
    if (id === player.id && s.board.seeded[slot] === undefined) delete placed[slot];
  }
  delete placed[slotId];
  return isValidPlacement(s.board, s.formation, s.pool, placed as Placement, slotId, player).ok;
}

export function chemistry(s: GameState) {
  return scoreBoard(s.formation, s.pool, s.placed as Placement);
}
