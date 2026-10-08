import { fair } from './boards';
import { distance, SPOT, type Spot } from './pitch';

/** A recent goal the week script could use. */
export interface Candidate { slug: string; league: string; matchId: number; xg: number; at: Spot }

const LEAGUES = ['EPL', 'La_liga', 'Bundesliga', 'Serie_A', 'Ligue_1'];
/** A goal the lazy pin is this close to tests nothing. */
const TOO_EASY = 4;

/**
 * The memorable first: the Premier League before the rest, then the lowest
 * xG (a 0.04 goal is the one in the highlights), at most one goal a match,
 * and none the lazy pin would land on.
 */
export function rankRecent(cs: readonly Candidate[]): Candidate[] {
  const seen = new Set<number>();
  return cs
    .filter((c) => distance(SPOT, c.at) >= TOO_EASY)
    .sort((a, b) => LEAGUES.indexOf(a.league) - LEAGUES.indexOf(b.league) || a.xg - b.xg)
    .filter((c) => (seen.has(c.matchId) ? false : (seen.add(c.matchId), true)));
}

/**
 * Boards for the given dates: four recent goals, in rank order, and the
 * day's two classics, as recent, recent, classic, recent, recent, classic.
 * A board that would be unfair takes a later goal in place of one of the
 * four. Throws when the goals run out, so a short week is never written.
 */
export function planWeek(
  dates: readonly string[],
  ranked: readonly Candidate[],
  classicsOf: (date: string) => string[],
  atOf: (slug: string) => Spot,
): Record<string, string[]> {
  const queue = [...ranked];
  const out: Record<string, string[]> = {};
  for (const date of dates) {
    const classics = classicsOf(date);
    const ok = (picks: Candidate[]) => fair([...picks.map((p) => p.at), ...classics.map(atOf)]);
    if (queue.length < 4) throw new Error(`Not enough recent goals for ${date}`);
    let picks = queue.slice(0, 4);
    if (!ok(picks)) {
      const swapped = swapIn(queue.slice(4), picks, ok);
      if (!swapped) throw new Error(`No fair board for ${date}`);
      picks = swapped;
    }
    for (const p of picks) queue.splice(queue.indexOf(p), 1);
    const [r0, r1, r2, r3] = picks.map((p) => p.slug);
    out[date] = [r0!, r1!, classics[0]!, r2!, r3!, classics[1]!];
  }
  return out;
}

/** Try each later goal in each of the four places, last place first. */
function swapIn(later: Candidate[], picks: Candidate[], ok: (p: Candidate[]) => boolean): Candidate[] | null {
  for (const c of later) {
    for (let i = picks.length - 1; i >= 0; i--) {
      const next = picks.map((p, j) => (j === i ? c : p));
      if (ok(next)) return next;
    }
  }
  return null;
}
