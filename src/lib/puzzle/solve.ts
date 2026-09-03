import type { Player } from '../chemistry/types';
import { isValidPlacement } from './validate';
import type { Board, Formation, Placement } from './types';

export interface EnumerateOptions {
  /** Stop after this many solutions. Guards against combinatorial blow-up. */
  maxSolutions: number;
}

export interface EnumerateResult {
  count: number;
  truncated: boolean;
  solutions: Placement[];
  /** slotId -> every player id appearing there across all found solutions. */
  answerSets: Record<string, string[]>;
}

/**
 * Backtracking search over empty slots.
 *
 * Slots are ordered most-constrained-first, which prunes hard and mirrors how
 * a player experiences the board tightening. Spec 9.2.
 */
export function enumerateSolutions(
  board: Board,
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
  options: EnumerateOptions,
): EnumerateResult {
  const players = [...pool.values()];
  const empty = formation.slots
    .filter((s) => board.seeded[s.id] === undefined)
    .map((s) => s.id);

  // Candidate lists by position class, computed once.
  const byPosition = new Map<string, Player[]>();
  for (const slot of formation.slots) {
    byPosition.set(slot.id, players.filter((p) => p.positions.includes(slot.position)));
  }

  // Most-constrained-first: fewest position-eligible candidates goes earliest.
  const order = [...empty].sort(
    (a, b) => (byPosition.get(a)?.length ?? 0) - (byPosition.get(b)?.length ?? 0),
  );

  const solutions: Placement[] = [];
  const answerSets: Record<string, string[]> = {};
  const answerSeen: Record<string, Set<string>> = {};
  let truncated = false;

  for (const slot of formation.slots) {
    answerSets[slot.id] = [];
    answerSeen[slot.id] = new Set();
  }

  const used = new Set<string>(Object.values(board.seeded));

  function record(placement: Placement): void {
    solutions.push({ ...placement });
    for (const [slotId, playerId] of Object.entries(placement)) {
      const seen = answerSeen[slotId];
      if (seen && !seen.has(playerId)) {
        seen.add(playerId);
        answerSets[slotId]?.push(playerId);
      }
    }
  }

  function recurse(index: number, filled: Placement): void {
    if (solutions.length >= options.maxSolutions) {
      truncated = true;
      return;
    }
    if (index === order.length) {
      record(filled);
      return;
    }

    const slotId = order[index];
    if (slotId === undefined) return;

    for (const candidate of byPosition.get(slotId) ?? []) {
      if (used.has(candidate.id)) continue;
      if (!isValidPlacement(board, formation, pool, filled, slotId, candidate).ok) continue;

      used.add(candidate.id);
      recurse(index + 1, { ...filled, [slotId]: candidate.id });
      used.delete(candidate.id);

      if (solutions.length >= options.maxSolutions) {
        truncated = true;
        return;
      }
    }
  }

  recurse(0, { ...board.seeded });

  return { count: solutions.length, truncated, solutions, answerSets };
}
