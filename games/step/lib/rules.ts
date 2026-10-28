import { ERA_FLOOR, ERA_FULL, ERA_HALF, eraOf, lastPlayed } from '../../../src/lib/fame/era';
import { APPS_PER_YEAR, FLOOR, SATURATION_APPS } from '../../../src/lib/fame/spell';
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
 * How the audience sees football: the year it is, and how known each club
 * is (`reach`, 0..1, a club not in it counts as 1). Jonno's rounds 1 to 3
 * (2026-10-20/21): the players are about 16 to 26. They rarely know anyone
 * whose career ended before 2010, and clubs outside the Premier League and
 * the biggest abroad (Sevilla, Valencia) are hard for them. Built by
 * lib/day.ts lensOf, kept in data/ruler.json.
 */
export interface Lens { year: number; reach: Readonly<Record<string, number>> }
/** No fading: every stint as known as its length, every club as known as any. */
export const PLAIN: Lens = { year: 0, reach: {} };

/**
 * Era fade (src/lib/fame/era.ts), tuned on Jonno's 59 verdicts
 * (scripts/step/verdicts.ts). A stint is dated both by its own end and by the
 * player's last season anywhere (their geometric mean): Torres's Liverpool
 * years are remembered because Torres played on, Redknapp's Spurs years are not.
 */
export { ERA_FLOOR, ERA_FULL, ERA_HALF, eraOf, lastPlayed };
/** A stint still going is news, however few games it has had (Durán at Benfica, round 1). */
export const CURRENT_STINT = 0.6;

/**
 * How known "p played for c" is: p's fame, the stint's length, its era, the
 * club's reach. A stint with no end year ends with the player's last season,
 * not this year: retired players' undated spells read as current until
 * 2026-10-21 (Romário at Ajax).
 */
export function atClub(p: Player, c: string, views: Views, lens: Lens = PLAIN): number {
  const spell = p.spells?.[c];
  const end = spell?.[2] ?? lastPlayed(p, lens.year);
  const weight = lens.year > 0 && end >= lens.year ? Math.max(stintWeight(spell), CURRENT_STINT) : stintWeight(spell);
  const era = Math.sqrt(eraOf(end, lens.year) * eraOf(lastPlayed(p, lens.year), lens.year));
  return knownOf(p, views) * weight * era * (lens.reach[c] ?? 1);
}

/** The club that links x to the given best (each shared club as its less known end), and how known that is. */
export function linkOf(x: Player, given: Player, views: Views, lens: Lens = PLAIN): { club: string | null; known: number } {
  let best: { club: string | null; known: number } = { club: null, known: 0 };
  for (const c of x.clubIds) {
    if (!given.clubIds.includes(c)) continue;
    const k = Math.min(atClub(x, c, views, lens), atClub(given, c, views, lens));
    if (best.club === null || k > best.known) best = { club: c, known: k };
  }
  return best;
}

/**
 * How well known the fact "x fits here" is: the less known of its two
 * halves, the link to the given and the stint at the club. Each half is a
 * fact about a player at a club (atClub). The link is as known as its best
 * shared club, and a shared club as its less known end: Ferdinand's loan at
 * Bournemouth is obscure whoever played there with him, Henry's season at
 * Juventus is not, because Henry is famous enough that it is known. Kane at
 * Leicester is a deep answer whoever he links to.
 */
export function factOf(x: Player, given: Player, club: string, views: Views, lens: Lens = PLAIN): number {
  return Math.min(linkOf(x, given, views, lens).known, atClub(x, club, views, lens));
}

/**
 * The two answers a step shows once it is played: the obvious one (the best
 * known fact) and the deepest checkable one. Null on an empty field.
 */
export function endsOf(given: Player, club: string, field: readonly Player[], views: Views, lens: Lens = PLAIN): { obvious: Player | null; elite: Player | null } {
  const fact = (p: Player) => factOf(p, given, club, views, lens);
  const checkable = field.filter((p) => p.fame.value >= CHECKABLE);
  const pick = (xs: readonly Player[], better: (a: number, b: number) => boolean) =>
    xs.reduce<Player | null>((best, p) => (best === null || better(fact(p), fact(best)) ? p : best), null);
  return { obvious: pick(field, (a, b) => a > b), elite: pick(checkable.length > 0 ? checkable : field, (a, b) => a < b) };
}

/**
 * The absolute bar: the fact a pick must reach to be Basic, Decent, Solid or
 * Sharp whatever its own step looks like, as [basic, decent, solid, sharp].
 *
 * Grades rank a pick within its step, so about a tenth of every step was
 * Basic however obscure the step: the best known of an old Sunderland or a
 * Sevilla field was "the name everyone says first" though few of Jonno's
 * players would know it (round 1, 2026-10-20: Yorke at Sunderland, Maresca
 * at Sevilla). The bar measures a pick against every answer on every good
 * step (lib/day.ts buildWorld, kept in data/ruler.json): Basic is the best
 * known BAR_CUTS[0] of all of them, and so on; under the best known 60% is
 * Elite (round 2: the picks Jonno could not name wanted Elite). A pick's
 * grade is the deeper of the two readings, so the bar can only make a grade
 * deeper.
 */
export type Bar = readonly [basic: number, decent: number, solid: number, sharp: number];
export const BAR_CUTS = [0.03, 0.1, 0.25, 0.6] as const;

/** The bar for a population of facts: the fact at each of BAR_CUTS, best known first. */
export function barOf(facts: readonly number[]): Bar {
  const sorted = [...facts].sort((a, b) => b - a);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return [at(BAR_CUTS[0]), at(BAR_CUTS[1]), at(BAR_CUTS[2]), at(BAR_CUTS[3])];
}

const byBar = (fact: number, bar: Bar): Grade => (fact >= bar[0] ? 'basic' : fact >= bar[1] ? 'decent' : fact >= bar[2] ? 'solid' : fact >= bar[3] ? 'sharp' : 'elite');

/** Everything a pick is measured against: the bar and the lens (data/ruler.json). */
export interface Ruler extends Lens { bar: Bar }

export interface Judged {
  held: boolean;
  grade: Grade | null;
  /** The club that links the pick to the given, the best known one. Null when it did not hold. */
  via: string | null;
  /** The best known answer on the step, whatever was picked. */
  obvious: Player | null;
  /** The deepest checkable answer on the step, whatever was picked. */
  elite: Player | null;
}

export function judge(pick: Player, given: Player, club: string, members: readonly Player[], views: Views, ruler: Ruler): Judged {
  const field = fieldOf(given, members);
  const fact = (p: Player) => factOf(p, given, club, views, ruler);
  const { obvious, elite } = endsOf(given, club, field, views, ruler);

  const held = field.some((p) => p.id === pick.id);
  if (!held) return { held, grade: null, via: null, obvious, elite };
  const mine = fact(pick);
  const above = field.filter((p) => p.id !== pick.id && fact(p) > mine).length;
  const isElite = elite !== null && field.length >= ELITE_MIN_FIELD && mine <= fact(elite);
  const inField = gradeOf(above, field.length, isElite);
  const absolute = byBar(mine, ruler.bar);
  return {
    held,
    grade: gradeRank(absolute) > gradeRank(inField) ? absolute : inField,
    via: linkOf(pick, given, views, ruler).club,
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
