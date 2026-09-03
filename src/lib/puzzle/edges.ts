import type { Formation } from './types';

/** Order-independent key for an unordered pair of slots. */
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function adjacentSlots(formation: Formation, slotId: string): string[] {
  const out: string[] = [];
  for (const [a, b] of formation.adjacency) {
    if (a === slotId) out.push(b);
    else if (b === slotId) out.push(a);
  }
  return out;
}

/** Total adjacency for a slot. Fixed for the whole solve. Spec 5.2. */
export function linkCountFor(formation: Formation, slotId: string): number {
  return adjacentSlots(formation, slotId).length;
}
