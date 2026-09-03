import { linkColour, linkPoints, meetsRequirement } from '../chemistry/link';
import { playerChemistry, squadChemistry, CHEMISTRY_GATE } from '../chemistry/score';
import type { Player } from '../chemistry/types';
import { adjacentSlots, edgeKey, linkCountFor } from './edges';
import type { Board, Formation, Placement } from './types';

export type PlacementResult =
  | { ok: true }
  | { ok: false; reason: 'occupied' | 'position' | 'links'; failedEdges: string[] };

export interface BoardScore {
  perSlot: Record<string, number>;
  squadChemistry: number;
  solved: boolean;
}

/**
 * A link is inert until one end is solved, so a candidate is only ever checked
 * against links to already-filled neighbours. Every such link is visible to the
 * player by the progressive-reveal rule, which is what makes rejection fair.
 * Spec 4.1.
 */
export function isValidPlacement(
  board: Board,
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
  filled: Placement,
  slotId: string,
  candidate: Player,
): PlacementResult {
  if (filled[slotId] !== undefined) {
    return { ok: false, reason: 'occupied', failedEdges: [] };
  }

  const slot = formation.slots.find((s) => s.id === slotId);
  if (!slot) return { ok: false, reason: 'position', failedEdges: [] };
  if (!candidate.positions.includes(slot.position)) {
    return { ok: false, reason: 'position', failedEdges: [] };
  }

  const failedEdges: string[] = [];
  for (const otherId of adjacentSlots(formation, slotId)) {
    const otherPlayerId = filled[otherId];
    if (otherPlayerId === undefined) continue; // inert
    const other = pool.get(otherPlayerId);
    if (!other) continue;

    const key = edgeKey(slotId, otherId);
    const required = board.required[key] ?? 'any';
    if (!meetsRequirement(linkColour(candidate, other), required)) {
      failedEdges.push(key);
    }
  }

  return failedEdges.length === 0
    ? { ok: true }
    : { ok: false, reason: 'links', failedEdges };
}

export function scoreBoard(
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
  filled: Placement,
): BoardScore {
  const perSlot: Record<string, number> = {};

  for (const slot of formation.slots) {
    const playerId = filled[slot.id];
    if (playerId === undefined) {
      perSlot[slot.id] = 0;
      continue;
    }
    const player = pool.get(playerId);
    if (!player) {
      perSlot[slot.id] = 0;
      continue;
    }

    let earned = 0;
    for (const otherId of adjacentSlots(formation, slot.id)) {
      const otherPlayerId = filled[otherId];
      if (otherPlayerId === undefined) continue;
      const other = pool.get(otherPlayerId);
      if (!other) continue;
      earned += linkPoints(linkColour(player, other));
    }
    perSlot[slot.id] = playerChemistry(linkCountFor(formation, slot.id), earned);
  }

  const total = squadChemistry(Object.values(perSlot));
  const complete = formation.slots.every((s) => filled[s.id] !== undefined);

  return { perSlot, squadChemistry: total, solved: complete && total >= CHEMISTRY_GATE };
}
