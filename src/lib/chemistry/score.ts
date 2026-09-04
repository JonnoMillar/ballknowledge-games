import { FULL_LINK_POINTS } from './link';

/** A solved board must reach this. Spec 6.1. */
export const CHEMISTRY_GATE = 100;

/** Eleven players at 10 each. Spec 5.2 — deliberately above the gate. */
export const MAX_SQUAD_CHEMISTRY = 110;

/**
 * Chemistry lost for playing a slot's position class out of position.
 *
 * FIFA grades this by how far the position is from the player's nominal one.
 * Wikidata's P413 is far too coarse to support a graded penalty — Mbappé's
 * entire position record is one value — so this is binary: right class, or
 * half your chemistry gone. Spec 5.3.
 */
export const OUT_OF_POSITION_PENALTY = 5;

/**
 * Individual chemistry, 0..10.
 *
 * `linkCount` is the slot's TOTAL adjacency count in the formation and is fixed
 * for the whole solve. `earnedPoints` counts only links whose other end is
 * already filled. An unresolved link therefore contributes nothing and drags the
 * number down until completed, so chemistry climbs as the board fills rather
 * than starting misleadingly high. Spec 5.2.
 *
 * Normalised against FULL_LINK_POINTS (green), not against hyper's 3: an
 * all-green player is on 10, and a hyper link's extra point is spare capacity
 * that can offset an orange or red link somewhere else on the same card.
 */
export function playerChemistry(
  linkCount: number,
  earnedPoints: number,
  outOfPosition = false,
): number {
  if (linkCount <= 0) return 0;
  const raw = Math.round((10 * earnedPoints) / (FULL_LINK_POINTS * linkCount));
  const penalised = raw - (outOfPosition ? OUT_OF_POSITION_PENALTY : 0);
  return Math.min(10, Math.max(0, penalised));
}

/** Squad chemistry, 0..110, uncapped. Spec 5.2. */
export function squadChemistry(perPlayer: readonly number[]): number {
  return perPlayer.reduce((sum, n) => sum + n, 0);
}
