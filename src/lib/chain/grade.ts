/**
 * Deep Cuts grades: how deep a pick that held was, as a card you keep.
 *
 * Not a score. The daily stays one question — held or not — because a number
 * on a correct chain read as a loss ("21/100" for a perfectly good answer).
 * On a Deep Cuts board the whole point is to dig, so a pick that holds is
 * graded, and the grade is a case it is kept in: bronze, silver, gold, then
 * sapphire, diamond, and onyx for the Grail. The player never sees "Nth of
 * M"; the grade is the only thing said about depth.
 *
 * Grades are measured on the fact-fame ruler the rest of the chain uses
 * (src/lib/fame/spell.ts), within the plate's own field: what share of the
 * answers that would also have held were better known than yours.
 */
export const GRADES = ['common', 'uncommon', 'rare', 'niche', 'gem', 'grail'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_WORD: Record<Grade, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', niche: 'Niche', gem: 'Gem', grail: 'Grail',
};

/** What each grade means, for the key. Rarest first where it is listed. */
export const GRADE_LINE: Record<Grade, string> = {
  grail: 'The deepest answer on the plate we can check, or one further down still.',
  gem: 'Almost nobody goes there.',
  niche: 'You know your football.',
  rare: 'Past the names that come to mind.',
  uncommon: 'A step off the obvious.',
  common: 'The name everyone says first.',
};

/** The share line's glyph per grade. A plate that broke is 🟥, as on the daily. */
export const GRADE_GLYPH: Record<Grade, string> = {
  common: '🟫', uncommon: '⬜', rare: '🟨', niche: '🟦', gem: '💎', grail: '🏆',
};

/**
 * The cut-offs, as the share of the field better known than the pick.
 *
 * Calibrated on the Deep Cuts boards (fields of 25 to 65): the first handful
 * of names on a big club are Common, a fan's first ten or so reach Uncommon
 * and Rare, and Gem is the bottom third of a field that is mostly players
 * nobody outside the club remembers.
 */
export const CUTS: readonly [Grade, number][] = [
  ['common', 0.1],
  ['uncommon', 0.25],
  ['rare', 0.45],
  ['niche', 0.7],
];

/**
 * The grade of one pick that held.
 *
 * `above` is how many other answers in the plate's field were better known
 * than the pick; `fieldSize` includes the pick. `grail` is decided by the
 * caller, which knows the deepest checkable answer (see result.ts).
 */
export function gradeOf(above: number, fieldSize: number, grail: boolean): Grade {
  if (grail) return 'grail';
  const share = fieldSize <= 1 ? 0 : above / (fieldSize - 1);
  for (const [g, cut] of CUTS) if (share < cut) return g;
  return 'gem';
}

export const gradeRank = (g: Grade): number => GRADES.indexOf(g);

/** The page is as good as its weakest plate. Null unless every plate held. */
export function pageGrade(grades: readonly (Grade | null)[]): Grade | null {
  if (grades.length === 0 || grades.some((g) => g === null)) return null;
  return (grades as Grade[]).reduce((low, g) => (gradeRank(g) < gradeRank(low) ? g : low));
}

/**
 * Grail only counts where there was a choice. On a narrow plate the deepest
 * answer can also be the obvious one, and a Grail for naming it would be free.
 */
export const GRAIL_MIN_FIELD = 8;
