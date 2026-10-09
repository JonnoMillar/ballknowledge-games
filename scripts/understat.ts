/**
 * Understat, the source of Premier League goals. It publishes no terms: it
 * is called one request at a time with a pause between, and only the goals
 * in a pack are kept. It is slow (one call took 20 s) and sometimes refuses:
 * time out, back off, retry, then fail loudly.
 *
 *   GET understat.com/getLeagueData/EPL/<season start year>  → { dates: Fixture[] }
 *   GET understat.com/getMatchData/<id>                       → { shots: { h: Shot[]; a: Shot[] } }
 */
import { seasonLabel } from '../games/pin/lib/dates';
import { recentLine } from '../games/pin/lib/line';
import { fixturesFor, goalFor, scoreAfter, type Pick } from '../games/pin/lib/match';
import { fromUnderstat, inHalf, round1 } from '../games/pin/lib/pitch';
import type { Goal } from '../games/pin/lib/types';

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' };

export interface Fixture {
  id: string; isResult: boolean; datetime: string;
  h: { title: string }; a: { title: string };
  goals: { h: string | null; a: string | null };
}
export interface Shot {
  id: string; minute: string; result: string; X: string; Y: string; xG: string; player: string; h_a: 'h' | 'a';
  situation: string; shotType: string; lastAction: string; h_team: string; a_team: string; date: string;
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(url: string): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return (await res.json()) as T;
    } catch { /* slow or refused */ }
    await pause(3000 * (i + 1));
  }
  throw new Error(`Understat did not answer: ${url}`);
}

/** Every Premier League fixture of a season, played or not. */
export async function leagueFixtures(season: number): Promise<Fixture[]> {
  const d = await get<{ dates?: Fixture[] }>(`https://understat.com/getLeagueData/EPL/${season}`);
  if (!Array.isArray(d.dates)) throw new Error(`Understat league data for ${season} has no fixtures list; has it changed?`);
  return d.dates;
}

/** Every shot in a match, both sides. Waits a second first, to be polite. */
export async function matchShots(id: string): Promise<Shot[]> {
  await pause(1000);
  const m = await get<{ shots?: { h: Shot[]; a: Shot[] } }>(`https://understat.com/getMatchData/${id}`);
  if (!m.shots) throw new Error(`Understat match ${id} has no shots; has it changed?`);
  return [...m.shots.h, ...m.shots.a];
}

/**
 * A shot as a goal record (its slug is `u-<shot id>`). The line gives the
 * score after the goal only when the shots add up to the result.
 */
export function toGoal(f: Fixture, shots: readonly Shot[], s: Shot, season: number): Goal {
  const { after, final } = scoreAfter(shots);
  const trusted = f.goals.h !== null && final[0] === Number(f.goals.h) && final[1] === Number(f.goals.a);
  const raw = fromUnderstat(Number(s.X), Number(s.Y));
  return {
    scorer: s.player,
    match: `${s.h_team} v ${s.a_team}`,
    date: s.date.slice(0, 10),
    competition: `Premier League ${seasonLabel(season)}`,
    line: recentLine({
      shotType: s.shotType, situation: s.situation, lastAction: s.lastAction, minute: Number(s.minute),
      score: trusted ? after.get(s.id) ?? null : null,
    }),
    kind: 'recent',
    source: { from: 'understat', matchId: Number(f.id), shotId: s.id },
    at: { x: round1(raw.x), y: round1(raw.y) },
    xg: Math.round(Number(s.xG) * 100) / 100,
  };
}

/** An official pick as [slug, goal]: its fixture, then its shot. Null, with the reason logged, when it cannot be told apart. */
export async function officialGoal(pick: Pick, fixtures: readonly Fixture[], season: number): Promise<[string, Goal] | null> {
  const fx = fixturesFor(pick, fixtures);
  if (fx.length !== 1) {
    console.log(`  ${pick.player}: ${fx.length} fixtures for ${pick.clubs.join(' v ')} (${pick.when})`);
    return null;
  }
  const f = fx[0]!;
  const shots = await matchShots(f.id);
  const s = goalFor(pick, f, shots);
  if (!s) {
    console.log(`  ${pick.player}: no single goal of theirs in ${f.h.title} v ${f.a.title}`);
    return null;
  }
  const goal = toGoal(f, shots, s, season);
  // The pitch shows the attacking half only (Rooney's strike from his own half in 2017 cannot be pinned).
  if (!inHalf(goal.at)) {
    console.log(`  ${pick.player}: struck from ${goal.at.y} m out, outside the attacking half; skipped`);
    return null;
  }
  return [`u-${s.id}`, goal];
}
