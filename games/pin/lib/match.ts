/**
 * Matching an official pick (a player and a match, no minute) to an
 * Understat shot. No table of club names: a club matches when every word of
 * Understat's short title is among the words given for it, so "Tottenham"
 * matches "tottenham hotspur" and "Manchester City" never matches
 * "manchester united". A promoted club needs no upkeep.
 */

/** Lower case, no accents, no punctuation, single spaces. */
export function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const words = (s: string): string[] => normalise(s).split(' ').filter(Boolean);

/** Understat's title for a club, against the words of a name for it from elsewhere. */
export function sameClub(understatTitle: string, other: string): boolean {
  const have = new Set(words(other));
  const need = words(understatTitle);
  return need.length > 0 && need.every((w) => have.has(w));
}

/**
 * How well two names for a player agree: 3 the same, 2 the same last word,
 * 1 a shared word of three letters or more, 0 nothing.
 */
export function nameScore(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return 0;
  if (x.join(' ') === y.join(' ')) return 3;
  if (x[x.length - 1] === y[y.length - 1]) return 2;
  return x.some((w) => w.length >= 3 && y.includes(w)) ? 1 : 0;
}

export interface FixtureLike { id: string; isResult: boolean; datetime: string; h: { title: string }; a: { title: string } }
export interface ShotLike { id: string; player: string; result: string; situation: string; minute: string; h_a: 'h' | 'a' }

/**
 * An official pick: who, the two clubs (the scorer's first when known), when
 * (a date, or a month as YYYY-MM), and the score just after the goal, the
 * scorer's side first, when known.
 */
export interface Pick { player: string; clubs: [string, string]; when: string; score?: [number, number] }

/**
 * The score, home first, just after each goal. An own goal is filed under
 * the side of the player who scored it and counts for the other side
 * (checked on 50 Premier League matches). Also returns the final score.
 */
export function scoreAfter(shots: readonly ShotLike[]): { after: Map<string, [number, number]>; final: [number, number] } {
  const sorted = [...shots].sort((p, q) => Number(p.minute) - Number(q.minute) || Number(p.id) - Number(q.id));
  const score = { h: 0, a: 0 };
  const after = new Map<string, [number, number]>();
  for (const s of sorted) {
    if (s.result === 'Goal') score[s.h_a]++;
    else if (s.result === 'OwnGoal') score[s.h_a === 'h' ? 'a' : 'h']++;
    else continue;
    after.set(s.id, [score.h, score.a]);
  }
  return { after, final: [score.h, score.a] };
}

const DAY = 86400000;
const near = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) <= DAY;

/** The played fixtures the pick could be: right clubs in either order, and on the day (give or take one) or in the month. */
export function fixturesFor<F extends FixtureLike>(pick: Pick, fixtures: readonly F[]): F[] {
  const [p, q] = pick.clubs;
  return fixtures.filter((f) => {
    if (!f.isResult) return false;
    const day = f.datetime.slice(0, 10);
    const when = pick.when.length === 7 ? day.startsWith(pick.when) : near(day, pick.when);
    const clubs = (sameClub(f.h.title, p) && sameClub(f.a.title, q)) || (sameClub(f.h.title, q) && sameClub(f.a.title, p));
    return when && clubs;
  });
}

/**
 * The one non-penalty goal in the fixture's shots that the pick names, or
 * null. When the pick carries the score after the goal, goals at that score
 * are kept first (this tells a brace apart). Then the best name score wins,
 * only when no other goal shares it.
 */
export function goalFor<S extends ShotLike>(pick: Pick, fixture: FixtureLike, shots: readonly S[]): S | null {
  let goals = shots.filter((s) => s.result === 'Goal' && s.situation !== 'Penalty');
  if (pick.score) {
    const [mine, theirs] = pick.score;
    const want = sameClub(fixture.h.title, pick.clubs[0]) ? [mine, theirs] : [theirs, mine];
    const { after } = scoreAfter(shots);
    const at = goals.filter((s) => after.get(s.id)?.[0] === want[0] && after.get(s.id)?.[1] === want[1]);
    if (at.length) goals = at;
  }
  const scored = goals.map((s) => ({ s, n: nameScore(pick.player, s.player) })).filter((x) => x.n > 0);
  const best = Math.max(0, ...scored.map((x) => x.n));
  const top = scored.filter((x) => x.n === best);
  return top.length === 1 ? top[0]!.s : null;
}
