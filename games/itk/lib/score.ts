import { MARK_GLYPH, type PlateMark } from '../../../src/lib/chain/share';

/**
 * Spoofed: one move in each career never happened. Two picks a round.
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

/** Flat points: 2 for a first-time find, 1 for a second, 0 for a miss. Five careers, 0–10. */
export const POINTS: Record<PlateMark, number> = { held: 2, hinted: 1, missed: 0 };
export const MAX_POINTS = 10;

export function pointsOf(marks: readonly PlateMark[]): number {
  return marks.reduce((n, m) => n + POINTS[m], 0);
}

/** Every result, worst to best. The last three are the podium. */
export const RUNGS = ['Mascot', 'Casual', 'Pundit', 'Scout', 'Agent', 'Fabrizio'] as const;
export type Rung = (typeof RUNGS)[number];

/**
 * The fewest points each result needs. A podium of transfer insiders for 10,
 * 9 and 8 (Fabrizio is five first-time finds and nothing else), then plain bands.
 */
const FLOOR: Record<Rung, number> = { Mascot: 0, Casual: 2, Pundit: 5, Scout: 8, Agent: 9, Fabrizio: 10 };

/** The day's brag. */
export function tierOf(marks: readonly PlateMark[]): Rung {
  const points = pointsOf(marks);
  return [...RUNGS].reverse().find((r) => points >= FLOOR[r])!;
}

/** The points a result covers, as printed under its slot: "5–7", "8". */
export function rangeOf(rung: Rung): string {
  const i = RUNGS.indexOf(rung);
  const top = i + 1 < RUNGS.length ? FLOOR[RUNGS[i + 1]!] - 1 : MAX_POINTS;
  return top === FLOOR[rung] ? `${top}` : `${FLOOR[rung]}–${top}`;
}

/** The share line: day, tier and score, then one glyph per career. No names, no clubs. */
export function itkShareLine(day: number, marks: readonly PlateMark[]): string {
  return `Spoofed #${day} · ${tierOf(marks)} ${pointsOf(marks)}/${MAX_POINTS}
${marks.map((m) => MARK_GLYPH[m]).join('')}`;
}
