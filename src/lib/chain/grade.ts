/**
 * Grades: how deep a pick that held was, as a card you keep. Shown as
 * "Ball knowledge: <word>".
 *
 * Not a score. The daily stays one question — held or not — because a number
 * on a correct chain read as a loss ("21/100" for a perfectly good answer).
 * Where the point is to dig (Deep Cuts, the step run), a pick that holds is
 * graded, and the grade is a case it is kept in: bronze, silver, gold,
 * sapphire, and onyx for Elite. The player never sees "Nth of M"; the grade
 * is the only thing said about depth.
 *
 * Grades are measured on the fact-fame ruler the rest of the chain uses
 * (src/lib/fame/spell.ts), within the plate's own field: what share of the
 * answers that would also have held were better known than yours.
 *
 * Until 2026-10-14 there were six (Common, Uncommon, Rare, Niche, Gem,
 * Grail); Niche and Gem became Sharp. `toGrade` reads the old ids, so cards
 * already in someone's browser keep working.
 */
export const GRADES = ['basic', 'decent', 'solid', 'sharp', 'elite'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_WORD: Record<Grade, string> = {
  basic: 'Basic', decent: 'Decent', solid: 'Solid', sharp: 'Sharp', elite: 'Elite',
};

/** What each grade means, for the key. */
export const GRADE_LINE: Record<Grade, string> = {
  elite: 'The deepest answer we can check, or one further down still.',
  sharp: 'Almost nobody goes there.',
  solid: 'Past the names that come to mind.',
  decent: 'A step off the obvious.',
  basic: 'The name everyone says first.',
};

/** The share line's glyph per grade. A plate that broke is 🟥, as on the daily. */
export const GRADE_GLYPH: Record<Grade, string> = {
  basic: '🟫', decent: '⬜', solid: '🟨', sharp: '🟦', elite: '🏆',
};

/**
 * The cut-offs, as the share of the field better known than the pick.
 *
 * Calibrated on the Deep Cuts boards (fields of 25 to 65): the first handful
 * of names on a big club are Basic, a fan's first ten or so reach Decent and
 * Solid, and Sharp is the deeper half of a field that is mostly players
 * nobody outside the club remembers. The low end is the fine one because
 * that is where most picks land.
 */
export const CUTS: readonly [Grade, number][] = [
  ['basic', 0.1],
  ['decent', 0.25],
  ['solid', 0.45],
];

/**
 * The grade of one pick that held.
 *
 * `above` is how many other answers in the plate's field were better known
 * than the pick; `fieldSize` includes the pick. `elite` is decided by the
 * caller, which knows the deepest checkable answer (see result.ts).
 */
export function gradeOf(above: number, fieldSize: number, elite: boolean): Grade {
  if (elite) return 'elite';
  const share = fieldSize <= 1 ? 0 : above / (fieldSize - 1);
  for (const [g, cut] of CUTS) if (share < cut) return g;
  return 'sharp';
}

export const gradeRank = (g: Grade): number => GRADES.indexOf(g);

const LEGACY: Record<string, Grade> = {
  common: 'basic', uncommon: 'decent', rare: 'solid', niche: 'sharp', gem: 'sharp', grail: 'elite',
};

/** A stored grade, old or new, as one of the five; null for anything else. */
export function toGrade(x: unknown): Grade | null {
  if (typeof x !== 'string') return null;
  if ((GRADES as readonly string[]).includes(x)) return x as Grade;
  return LEGACY[x] ?? null;
}

/** The page is as good as its weakest plate. Null unless every plate held. */
export function pageGrade(grades: readonly (Grade | null)[]): Grade | null {
  if (grades.length === 0 || grades.some((g) => g === null)) return null;
  return (grades as Grade[]).reduce((low, g) => (gradeRank(g) < gradeRank(low) ? g : low));
}

/**
 * Elite only counts where there was a choice. On a narrow plate the deepest
 * answer can also be the obvious one, and an Elite for naming it would be free.
 */
export const ELITE_MIN_FIELD = 8;
