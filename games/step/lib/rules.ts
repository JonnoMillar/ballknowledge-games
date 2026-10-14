import { factFame, spellWeight } from '../../../src/lib/fame/spell';
import { sharedClubsByProminence } from '../../../src/lib/chain/score';
import { ELITE_MIN_FIELD, GRADES, GRADE_GLYPH, GRADE_WORD, gradeOf, gradeRank, type Grade } from '../../../src/lib/chain/grade';
import { MARK_GLYPH } from '../../../src/lib/chain/share';
import type { Player } from '../../../src/lib/chemistry/types';

/**
 * The rules of a step run, pure.
 *
 * A run is PLAYER — ? — CLUB, then CLUB — ? — PLAYER, and so on: the givens
 * alternate P1 C1 P2 C2 P3, and each gap is anyone who played for the club
 * and shared any club with the player beside it. Every pick that holds is
 * graded on the site's five-grade scale; the run is the average.
 */

/** The working name, until the game has one: the share line and the masthead. */
export const NAME = 'Step';
/** Picks in a run. Givens: STEPS / 2 + 1 players, STEPS / 2 clubs. */
export const STEPS = 4;
/** Fame floor for an answer the run holds up as the deepest: the one result.ts uses (MIN_BEST_FAME). */
export const CHECKABLE = 30;

/** A day's givens, in order: players[0] clubs[0] players[1] clubs[1] players[2]. */
export interface Givens { players: readonly string[]; clubs: readonly string[] }
export interface Step { player: string; club: string; playerFirst: boolean }

export function stepsOf(g: Givens): Step[] {
  return Array.from({ length: STEPS }, (_, i) => ({
    player: g.players[Math.ceil(i / 2)]!,
    club: g.clubs[Math.floor(i / 2)]!,
    playerFirst: i % 2 === 0,
  }));
}

const shares = (a: Player, b: Player) => a.clubIds.some((c) => b.clubIds.includes(c));

/** Every answer: the club's players (`members`) who shared any club with the given. */
export function fieldOf(given: Player, members: readonly Player[]): Player[] {
  return members.filter((p) => p.id !== given.id && shares(p, given));
}

/**
 * How well known the fact "x fits here" is: fame scaled by the less known of
 * its two halves, the link to the given and the stint at the club. Kane at
 * Leicester is a deep answer whoever he links to.
 */
export function factOf(x: Player, given: Player, club: string): number {
  return Math.min(factFame(x, [{ player: given }], 'clubs'), x.fame.value * spellWeight(x.spells?.[club]));
}

/**
 * The two answers a step shows once it is played: the obvious one (the best
 * known fact) and the deepest checkable one. Null on an empty field.
 */
export function endsOf(given: Player, club: string, field: readonly Player[]): { obvious: Player | null; elite: Player | null } {
  const fact = (p: Player) => factOf(p, given, club);
  const checkable = field.filter((p) => p.fame.value >= CHECKABLE);
  const pick = (xs: readonly Player[], better: (a: number, b: number) => boolean) =>
    xs.reduce<Player | null>((best, p) => (best === null || better(fact(p), fact(best)) ? p : best), null);
  return { obvious: pick(field, (a, b) => a > b), elite: pick(checkable.length > 0 ? checkable : field, (a, b) => a < b) };
}

export interface Judged {
  held: boolean;
  grade: Grade | null;
  /** The club the pick shared with the given, the most prominent one. Null when it did not hold. */
  via: string | null;
  /** The best known answer on the step, whatever was picked. */
  obvious: Player | null;
  /** The deepest checkable answer on the step, whatever was picked. */
  elite: Player | null;
}

export function judge(pick: Player, given: Player, club: string, members: readonly Player[]): Judged {
  const field = fieldOf(given, members);
  const fact = (p: Player) => factOf(p, given, club);
  const { obvious, elite } = endsOf(given, club, field);

  const held = field.some((p) => p.id === pick.id);
  if (!held) return { held, grade: null, via: null, obvious, elite };
  const mine = fact(pick);
  const above = field.filter((p) => p.id !== pick.id && fact(p) > mine).length;
  const isElite = elite !== null && field.length >= ELITE_MIN_FIELD && mine <= fact(elite);
  return {
    held,
    grade: gradeOf(above, field.length, isElite),
    via: sharedClubsByProminence(pick, given)[0] ?? null,
    obvious,
    elite,
  };
}

/**
 * The run's grade: Basic 1 … Elite 5, a miss 0, averaged and rounded down,
 * so an Elite run is every pick Elite. Anything that held makes it at least
 * Basic; nothing held, no grade.
 */
export function runGrade(grades: readonly (Grade | null)[]): Grade | null {
  if (!grades.some((g) => g !== null)) return null;
  const total = grades.reduce((n, g) => n + (g ? gradeRank(g) + 1 : 0), 0);
  const level = Math.max(1, Math.floor(total / grades.length));
  return GRADES[level - 1]!;
}

/** The share line: the run and a glyph per step. No names. */
export function shareLine(day: number, grades: readonly (Grade | null)[]): string {
  const run = runGrade(grades);
  const grid = grades.map((g) => (g ? GRADE_GLYPH[g] : MARK_GLYPH.missed)).join('');
  return `${NAME} #${day} · Ball knowledge: ${run ? GRADE_WORD[run] : 'none'}\n${grid}`;
}
