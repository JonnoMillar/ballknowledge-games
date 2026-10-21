import { APPS_PER_YEAR, FLOOR, SATURATION_APPS } from '../../../src/lib/fame/spell';
import { sharedClubsByProminence } from '../../../src/lib/chain/score';
import { ELITE_MIN_FIELD, GRADES, GRADE_GLYPH, GRADE_WORD, gradeOf, gradeRank, type Grade } from '../../../src/lib/chain/grade';
import { MARK_GLYPH } from '../../../src/lib/chain/share';
import type { Player, Spell } from '../../../src/lib/chemistry/types';

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

/** English Wikipedia views over 24 months, by player id: data/player-views.json (scripts/fetch-views.mjs). */
export type Views = Readonly<Record<string, number>>;

/**
 * The ruler's tuning surface (measured 2026-10-19, games/step/HANDOFF.md).
 *
 * FAME_POWER: views span a thousandfold across a field, a stint's weight only
 * twentyfold (stintWeight, 0.05..1), so raw views let any household name's
 * loan spell rank as obvious (Ian Wright at Forest). Views ** FAME_POWER
 * balances the two: 1 is views alone, 0 is the stint alone.
 *
 * FIT_A, FIT_B: where a player has no English page (or a title that finds
 * none), log10(views) is estimated from sitelinks, fitted on the pool.
 */
export const FAME_POWER = 0.8;
export const FIT_A = 2.943;
export const FIT_B = 0.0425;

/**
 * How well known a player is to the audience: English Wikipedia views.
 * Not sitelinks, which count every language's page, so a player famous in
 * Japan or Ghana reads as well known as Roy Keane.
 */
export function knownOf(p: Player, views: Views): number {
  const v = views[p.id];
  return (v !== undefined && v > 0 ? v : 10 ** (FIT_A + FIT_B * p.fame.value)) ** FAME_POWER;
}

/**
 * 0.05..1: how much of a stint it was, by its length alone: league games (or
 * years at APPS_PER_YEAR) over SATURATION_APPS, as src/lib/fame/spell.ts.
 *
 * Unlike the site-wide spellWeight, a recent stint gets no credit for being
 * recent: Jonno's round 1 (2026-10-20) found short recent spells far less
 * known than "a transfer is news" assumes (Delap's two games for City,
 * Mejbri's six at Sevilla, both graded Basic). Missing data stays neutral.
 */
export function stintWeight(spell: Spell | undefined): number {
  if (!spell) return 1;
  const [apps, years] = spell;
  const estimate = apps ?? (years !== null ? years * APPS_PER_YEAR : null);
  return estimate === null ? 1 : Math.min(1, Math.max(FLOOR, estimate / SATURATION_APPS));
}

/**
 * How well known the fact "x fits here" is: the less known of its two
 * halves, the link to the given and the stint at the club. Each half is a
 * fact about a player at a club, that player's fame times how much of a
 * stint it was (stintWeight). The link is as known as its best
 * shared club, and a shared club as its less known end: Ferdinand's loan at
 * Bournemouth is obscure whoever played there with him, Henry's season at
 * Juventus is not, because Henry is famous enough that it is known. Kane at
 * Leicester is a deep answer whoever he links to.
 */
export function factOf(x: Player, given: Player, club: string, views: Views): number {
  const at = (p: Player, c: string) => knownOf(p, views) * stintWeight(p.spells?.[c]);
  const link = Math.max(0, ...x.clubIds.filter((c) => given.clubIds.includes(c)).map((c) => Math.min(at(x, c), at(given, c))));
  return Math.min(link, at(x, club));
}

/**
 * The two answers a step shows once it is played: the obvious one (the best
 * known fact) and the deepest checkable one. Null on an empty field.
 */
export function endsOf(given: Player, club: string, field: readonly Player[], views: Views): { obvious: Player | null; elite: Player | null } {
  const fact = (p: Player) => factOf(p, given, club, views);
  const checkable = field.filter((p) => p.fame.value >= CHECKABLE);
  const pick = (xs: readonly Player[], better: (a: number, b: number) => boolean) =>
    xs.reduce<Player | null>((best, p) => (best === null || better(fact(p), fact(best)) ? p : best), null);
  return { obvious: pick(field, (a, b) => a > b), elite: pick(checkable.length > 0 ? checkable : field, (a, b) => a < b) };
}

/**
 * The absolute bar: the fact a pick must reach to be Basic, Decent or Solid
 * whatever its own step looks like, as [basic, decent, solid].
 *
 * Grades rank a pick within its step, so about a tenth of every step was
 * Basic however obscure the step: the best known of an old Sunderland or a
 * Sevilla field was "the name everyone says first" though few of Jonno's
 * players would know it (round 1, 2026-10-20: Yorke at Sunderland, Maresca
 * at Sevilla). The bar measures a pick against every answer on every good
 * step (lib/day.ts buildWorld, kept in data/bar.json): Basic is the best
 * known BAR_CUTS[0] of all of them, and so on. A pick's grade is the deeper
 * of the two readings, so the bar can only make a grade deeper.
 */
export type Bar = readonly [basic: number, decent: number, solid: number];
export const BAR_CUTS = [0.03, 0.1, 0.25] as const;

/** The bar for a population of facts: the fact at each of BAR_CUTS, best known first. */
export function barOf(facts: readonly number[]): Bar {
  const sorted = [...facts].sort((a, b) => b - a);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return [at(BAR_CUTS[0]), at(BAR_CUTS[1]), at(BAR_CUTS[2])];
}

const byBar = (fact: number, bar: Bar): Grade => (fact >= bar[0] ? 'basic' : fact >= bar[1] ? 'decent' : fact >= bar[2] ? 'solid' : 'sharp');

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

export function judge(pick: Player, given: Player, club: string, members: readonly Player[], views: Views, bar: Bar): Judged {
  const field = fieldOf(given, members);
  const fact = (p: Player) => factOf(p, given, club, views);
  const { obvious, elite } = endsOf(given, club, field, views);

  const held = field.some((p) => p.id === pick.id);
  if (!held) return { held, grade: null, via: null, obvious, elite };
  const mine = fact(pick);
  const above = field.filter((p) => p.id !== pick.id && fact(p) > mine).length;
  const isElite = elite !== null && field.length >= ELITE_MIN_FIELD && mine <= fact(elite);
  const inField = gradeOf(above, field.length, isElite);
  const absolute = byBar(mine, bar);
  return {
    held,
    grade: gradeRank(absolute) > gradeRank(inField) ? absolute : inField,
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
