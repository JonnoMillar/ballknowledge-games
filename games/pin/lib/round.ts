import { distance, inArea, SPOT, type Spot } from './pitch';
import { par } from './score';

/** A pack's par must be at least this much a goal: the lazy pin (the penalty spot) cannot coast it. */
export const PAR_PER_GOAL = 7;

/** A fair pack: the lazy pin cannot coast it, and it has goals from in and out of the area. */
export function fair(ats: readonly Spot[]): boolean {
  return par(ats).metres >= PAR_PER_GOAL * ats.length && ats.some(inArea) && ats.some((a) => !inArea(a));
}

/** A Premier League goal a round pack could use. */
export interface Candidate { slug: string; matchId: number; xg: number; at: Spot }

/** A goal the lazy pin is this close to tests nothing. */
const TOO_EASY = 4;

/** The memorable first: lowest xG (a 0.04 goal is the one in the highlights), none the lazy pin would land on. */
export function rankRecent(cs: readonly Candidate[]): Candidate[] {
  return cs.filter((c) => distance(SPOT, c.at) >= TOO_EASY).sort((a, b) => a.xg - b.xg);
}

const oneAMatch = (picks: readonly Candidate[]): boolean => new Set(picks.map((p) => p.matchId)).size === picks.length;

/**
 * A round pack: the first goal of each match in rank order, n of them. When
 * those are unfair, try each later goal (a second goal from a match
 * included) in each place, last place first, keeping one goal a match.
 * Throws when there are fewer than n matches or no fair set, so a bad pack
 * is never written.
 */
export function pickRound(ranked: readonly Candidate[], n = 6): Candidate[] {
  const seen = new Set<number>();
  const firsts = ranked.filter((c) => (seen.has(c.matchId) ? false : (seen.add(c.matchId), true)));
  if (firsts.length < n) throw new Error(`Only ${firsts.length} matches with a goal to pick from, need ${n}`);
  const picks = firsts.slice(0, n);
  const ok = (p: Candidate[]) => oneAMatch(p) && fair(p.map((x) => x.at));
  if (ok(picks)) return picks;
  for (const c of ranked) {
    if (picks.includes(c)) continue;
    for (let i = n - 1; i >= 0; i--) {
      const next = picks.map((p, j) => (j === i ? c : p));
      if (ok(next)) return next;
    }
  }
  throw new Error('No fair pack in these goals');
}
