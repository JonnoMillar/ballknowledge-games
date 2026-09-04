import { linkColour } from '../lib/chemistry/link';
import { scoreBoard, isValidPlacement } from '../lib/puzzle/validate';
import { edgeKey } from '../lib/puzzle/edges';
import type { LinkColour, Player } from '../lib/chemistry/types';
import type { Placement } from '../lib/puzzle/types';
import type { GameState } from './state';

export type LinkStatus = 'earned' | 'required' | 'hidden';

export interface LinkView {
  key: string;
  a: string;
  b: string;
  status: LinkStatus;
  /** For `earned`, what was achieved. Otherwise what the board requires. */
  colour: LinkColour | 'any';
}

/**
 * Three states, matching the visual language in design/Main.dc.html:
 *   earned   — both ends filled; solid, in the achieved colour
 *   required — one end filled; dashed, in the REQUIRED colour (this is the clue)
 *   hidden   — neither end filled; the link is inert (spec 4.1)
 */
export function linkViews(s: GameState): LinkView[] {
  return s.formation.adjacency.map(([a, b]) => {
    const key = edgeKey(a, b);
    const pa = s.placed[a];
    const pb = s.placed[b];
    const required = s.board.required[key] ?? 'any';

    if (pa && pb) {
      return { key, a, b, status: 'earned' as const, colour: linkColour(s.pool.get(pa)!, s.pool.get(pb)!) };
    }
    if (pa || pb) return { key, a, b, status: 'required' as const, colour: required };
    return { key, a, b, status: 'hidden' as const, colour: required };
  });
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
