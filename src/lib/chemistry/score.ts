/** A solved board must reach this. Spec 6.1. */
export const CHEMISTRY_GATE = 100;

/** Eleven players at 10 each. Spec 5.2 — deliberately above the gate. */
export const MAX_SQUAD_CHEMISTRY = 110;

/**
 * Individual chemistry, 0..10.
 *
 * `linkCount` is the slot's TOTAL adjacency count in the formation and is
 * fixed for the whole solve. `earnedPoints` counts only links whose other end
 * is already filled. An unresolved link therefore contributes nothing and
 * drags the number down until completed, so chemistry climbs as the board
 * fills rather than starting misleadingly high. Spec 5.2.
 */
export function playerChemistry(linkCount: number, earnedPoints: number): number {
  if (linkCount <= 0) return 0;
  const raw = Math.round((10 * earnedPoints) / (2 * linkCount));
  return Math.min(10, Math.max(0, raw));
}

/** Squad chemistry, 0..110, uncapped. Spec 5.2. */
export function squadChemistry(perPlayer: readonly number[]): number {
  return perPlayer.reduce((sum, n) => sum + n, 0);
}
