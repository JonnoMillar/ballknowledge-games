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
 * The day's brag. A podium of transfer insiders for 10, 9 and 8 points
 * (Fabrizio is five first-time finds and nothing else), then plain bands.
 */
export function tierOf(marks: readonly PlateMark[]): string {
  const points = marks.reduce((n, m) => n + POINTS[m], 0);
  if (points >= 10) return 'Fabrizio';
  if (points === 9) return 'Agent';
  if (points === 8) return 'Scout';
  if (points >= 5) return 'Pundit';
  if (points >= 2) return 'Casual';
  return 'Mascot';
}

/** The share line: day, one glyph per career, the tier. No names, no clubs. */
export function itkShareLine(day: number, marks: readonly PlateMark[]): string {
  return `ITK #${day}\n${marks.map((m) => MARK_GLYPH[m]).join('')}\n${tierOf(marks)}`;
}
