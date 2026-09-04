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
/**
 * Anyone may be placed anywhere. Failing a link is not illegal — it simply
 * scores less chemistry, exactly as in FUT, where you can field a striker at
 * centre-back and merely suffer for it.
 *
 * This reports what a placement WOULD cost so the UI can warn, and it is what
 * board authoring uses to measure how constrained a slot is. It is no longer a
 * gate on the player's actions: only an already-occupied slot is refused.
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

  const outOfPosition = !candidate.positions.includes(slot.position);

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

  return failedEdges.length === 0 && !outOfPosition
    ? { ok: true }
    : { ok: false, reason: outOfPosition ? 'position' : 'links', failedEdges };
}

/** Whether a slot's position class matches the player's. Costs chemistry, never legality. */
export function isOutOfPosition(
  formation: Formation,
  slotId: string,
  player: Player,
): boolean {
  const slot = formation.slots.find((s) => s.id === slotId);
  return slot ? !player.positions.includes(slot.position) : false;
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
    perSlot[slot.id] = playerChemistry(
      linkCountFor(formation, slot.id),
      earned,
      !player.positions.includes(slot.position),
    );
  }

  const total = squadChemistry(Object.values(perSlot));
  const complete = formation.slots.every((s) => filled[s.id] !== undefined);

  return { perSlot, squadChemistry: total, solved: complete && total >= CHEMISTRY_GATE };
}
