import type { Player } from '../chemistry/types';

/** The ruler a field is ranked with. Plain fame unless a caller says otherwise. */
export type FameOf = (p: Player) => number;
export const plainFame: FameOf = (p) => p.fame.value;

/**
 * Score a placement 0..100 against the fame range of that slot's valid answers.
 * 100 is the most obscure valid answer, 0 the most famous.
 *
 * Scoring locally rather than globally cancels most era bias, because it
 * compares like with like. Fame therefore only needs to be ordinally correct
 * within a comparable group, not globally calibrated. Spec 6.2.
 *
 * `fameOf` is the ruler. The XI board measures the player; the chain measures
 * the fact that the player links here — see src/lib/fame/spell.ts — and the
 * two only differ in what they hand in for this argument.
 */
export function slotObscurityScore(
  chosen: Player,
  answerSet: readonly Player[],
  fameOf: FameOf = plainFame,
): number {
  if (answerSet.length === 0) return 0;
  if (!answerSet.some((p) => p.id === chosen.id)) return 0;
  if (answerSet.length === 1) return 50;

  const values = answerSet.map(fameOf);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;

  return Math.round(((max - fameOf(chosen)) / (max - min)) * 100);
}

export function boardObscurityScore(
  placed: Readonly<Record<string, Player>>,
  answerSets: Readonly<Record<string, readonly Player[]>>,
): number {
  const slots = Object.keys(placed);
  if (slots.length === 0) return 0;

  const total = slots.reduce(
    (sum, slotId) => sum + slotObscurityScore(placed[slotId]!, answerSets[slotId] ?? []),
    0,
  );
  return Math.round(total / slots.length);
}
