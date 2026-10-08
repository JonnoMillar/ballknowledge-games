import { MARK_GLYPH, type PlateMark } from '../chain/share';

/**
 * ITK: one move in each career never happened. Two picks a round.
 *
 * A round is marked with Chain's own glyphs, so the two share lines read
 * the same: found first time is held, found on the second pick is hinted,
 * two real moves picked is missed.
 */
export const PICKS = 2;

/** The round's mark from its picks so far (true = that pick was the fake), or null while it is open. */
export function roundMark(picks: readonly boolean[]): PlateMark | null {
  if (picks[0]) return 'held';
  if (picks[1]) return 'hinted';
  return picks.length >= PICKS ? 'missed' : null;
}

const POINTS: Record<PlateMark, number> = { held: 2, hinted: 1, missed: 0 };

/**
 * The day's brag, in transfer-rumour source tiers. Tier 1 is five
 * first-time finds and nothing else.
 */
export function tierOf(marks: readonly PlateMark[]): string {
  const points = marks.reduce((n, m) => n + POINTS[m], 0);
  if (points >= 10) return 'Tier 1';
  if (points >= 8) return 'Tier 2';
  if (points >= 5) return 'Tier 3';
  if (points >= 2) return 'Tier 4';
  return 'Parody account';
}

/** The share line: day, one glyph per career, the tier. No names, no clubs. */
export function itkShareLine(day: number, marks: readonly PlateMark[]): string {
  return `ITK #${day}\n${marks.map((m) => MARK_GLYPH[m]).join('')}\n${tierOf(marks)}`;
}
