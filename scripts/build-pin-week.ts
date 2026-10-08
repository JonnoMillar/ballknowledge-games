/**
 * Pitch pin's week: recent goals from Understat and the next seven daily
 * boards, four recent goals and two classics each.
 *
 *   npx tsx scripts/build-pin-week.ts [--from YYYY-MM-DD] [--days 21]
 *
 * Looks back --days for results in five leagues. Understat publishes no
 * terms: it is called one request at a time with a pause between, and only
 * the chosen goals are kept. Run by hand, once a week; nothing schedules it.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dateOfDay, dayNumber, localDate } from '../src/lib/daily';
import { classicsFor, dailyPool, PIN_EPOCH } from '../games/pin/lib/boards';
import { recentLine } from '../games/pin/lib/line';
import { fromUnderstat, round1 } from '../games/pin/lib/pitch';
import { planWeek, rankRecent, type Candidate } from '../games/pin/lib/week';
import type { Goal, Goals, Pack } from '../games/pin/lib/types';

const LEAGUES: Record<string, string> = {
  EPL: 'Premier League', La_liga: 'La Liga', Bundesliga: 'Bundesliga', Serie_A: 'Serie A', Ligue_1: 'Ligue 1',
};
const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' };

interface Fixture { id: string; isResult: boolean; datetime: string; goals: { h: string; a: string } }
interface Shot {
  id: string; minute: string; result: string; X: string; Y: string; xG: string; player: string; h_a: 'h' | 'a';
  situation: string; shotType: string; lastAction: string; h_team: string; a_team: string; date: string;
}

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Understat is slow and sometimes refuses: time out, back off, retry. */
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

const from = arg('from') ?? localDate();
const windowDays = Number(arg('days') ?? 21);
const now = new Date();
const season = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
const since = new Date(now.getTime() - windowDays * 86400000).toISOString().slice(0, 10);

const goals = JSON.parse(await readFile('games/pin/data/goals.json', 'utf8')) as Goals;
const packs = JSON.parse(await readFile('games/pin/data/packs.json', 'utf8')) as Pack[];
const days = JSON.parse(await readFile('games/pin/data/days.json', 'utf8')) as Record<string, string[]>;

const found: Record<string, Goal> = {};
const candidates: Candidate[] = [];

for (const [league, name] of Object.entries(LEAGUES)) {
  const data = await get<{ dates: Fixture[] }>(`https://understat.com/getLeagueData/${league}/${season}`);
  const played = data.dates.filter((f) => f.isResult && f.datetime.slice(0, 10) >= since);
  console.log(`${name}: ${played.length} results since ${since}`);
  for (const f of played) {
    await pause(1000);
    const m = await get<{ shots: { h: Shot[]; a: Shot[] } }>(`https://understat.com/getMatchData/${f.id}`);
    const shots = [...m.shots.h, ...m.shots.a].sort((p, q) => Number(p.minute) - Number(q.minute) || Number(p.id) - Number(q.id));
    // The score after each goal. An own goal is filed under the side of the
    // player who scored it and counts for the other side (checked on 50 matches).
    const score = { h: 0, a: 0 };
    const after = new Map<string, [number, number]>();
    for (const s of shots) {
      if (s.result === 'Goal') score[s.h_a]++;
      else if (s.result === 'OwnGoal') score[s.h_a === 'h' ? 'a' : 'h']++;
      else continue;
      after.set(s.id, [score.h, score.a]);
    }
    const trusted = score.h === Number(f.goals.h) && score.a === Number(f.goals.a);
    for (const s of shots) {
      if (s.result !== 'Goal' || s.situation === 'Penalty') continue;
      const slug = `u-${s.id}`;
      if (goals[slug]) continue; // already on a board
      const raw = fromUnderstat(Number(s.X), Number(s.Y));
      const at = { x: round1(raw.x), y: round1(raw.y) };
      const xg = Math.round(Number(s.xG) * 100) / 100;
      found[slug] = {
        scorer: s.player,
        match: `${s.h_team} v ${s.a_team}`,
        date: s.date.slice(0, 10),
        competition: `${name} ${season}/${String((season + 1) % 100).padStart(2, '0')}`,
        line: recentLine({ shotType: s.shotType, situation: s.situation, lastAction: s.lastAction, minute: Number(s.minute), score: trusted ? after.get(s.id)! : null }),
        kind: 'recent',
        source: { from: 'understat', matchId: Number(f.id), shotId: s.id },
        at,
        xg,
      };
      candidates.push({ slug, league, matchId: Number(f.id), xg, at });
    }
  }
}

// The next seven days that have no board yet.
const dates: string[] = [];
for (let d = dayNumber(from, PIN_EPOCH); dates.length < 7; d++) {
  const date = dateOfDay(d, PIN_EPOCH);
  if (!days[date]) dates.push(date);
}

const pool = dailyPool(goals, packs);
const week = planWeek(
  dates,
  rankRecent(candidates),
  (date) => classicsFor(dayNumber(date, PIN_EPOCH), pool),
  (slug) => (found[slug] ?? goals[slug])!.at,
);
for (const [date, slugs] of Object.entries(week)) {
  days[date] = slugs;
  for (const s of slugs) if (found[s]) goals[s] = found[s]!;
  console.log(date, slugs.map((s) => `${goals[s]!.scorer} (${goals[s]!.kind})`).join(', '));
}
await writeFile('games/pin/data/goals.json', `${JSON.stringify(goals, null, 2)}\n`);
await writeFile('games/pin/data/days.json', `${JSON.stringify(Object.fromEntries(Object.entries(days).sort()), null, 2)}\n`);
console.log(`${Object.keys(week).length} boards written`);
