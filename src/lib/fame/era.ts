import type { Player } from '../chemistry/types';

/**
 * How far back the audience remembers (16 to 26, Jonno 2026-10-21), tuned on
 * his Steps verdicts (games/step/HANDOFF.md): a stint that ended within
 * ERA_FULL years is fully known; before that its weight halves every
 * ERA_HALF years, never under ERA_FLOOR.
 */
export const ERA_FULL = 10;
export const ERA_HALF = 5;
export const ERA_FLOOR = 0.2;

export const eraOf = (end: number, year: number) => (end >= year - ERA_FULL ? 1 : Math.max(ERA_FLOOR, 0.5 ** ((year - ERA_FULL - end) / ERA_HALF)));

/**
 * The last season a player played anywhere. A spell with no end year, or
 * dated but without a game, says nothing: 1,466 retired players have one
 * (Romário at Ajax, Ronaldinho's 0 games at Ravenna in 2026). The year
 * itself only when no spell is dated.
 */
export function lastPlayed(p: Player, year: number): number {
  const ends = Object.values(p.spells ?? {}).filter((s) => s[2] !== null && s[0] !== 0).map((s) => s[2]!);
  return ends.length > 0 ? Math.max(...ends) : year;
}
