/**
 * Season line's data, kept up to date with no one in the loop. Daily from
 * .github/workflows/season-line.yml; safe to run by hand.
 *
 *   npm run season-line:update             add any newly finished season, top up the schedule
 *   npm run season-line:update -- --boards rework every board from the stored seasons (after a rule change)
 *   npm run season-line:update -- --print  the boards, best first, and the days still to come
 *
 * Results: football-data.co.uk (free, no key). Top scorers: the league_topscorer
 * field of each Wikipedia club-season article. Squad players: data/careers.json.
 * A stored season never changes; only a missing one is fetched.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { CLUBS, seasonId } from '../../games/season-line/lib/clubs';
import { addDays, daysBetween, extend, MIN_AHEAD, TOP_UP, dailyPool } from '../../games/season-line/lib/day';
import { drama } from '../../games/season-line/lib/drama';
import { squadHints, type Stint } from '../../games/season-line/lib/squad';
import { nearestRival, parseResults, positions } from '../../games/season-line/lib/table';
import type { StoredBoard, StoredData, StoredDay, StoredSeason } from '../../games/season-line/lib/types';
import { parseTopScorer, topScorerField } from '../../games/season-line/lib/wiki';

export const DATA = 'games/season-line/data/seasons.json';
export const DAYS = 'games/season-line/data/days.json';
const FIRST = 1993;
const UA = { 'User-Agent': 'season-line/0.1 (football quiz; data refresh)' };

const data: StoredData = existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : { clubs: {}, seasons: [], boards: [] };
const have = new Set(data.seasons.map((s) => s.id));

async function fetchResults(start: number): Promise<string | null> {
  const code = `${String(start % 100).padStart(2, '0')}${String((start + 1) % 100).padStart(2, '0')}`;
  const res = await fetch(`https://football-data.co.uk/mmz4281/${code}/E0.csv`, { headers: UA, redirect: 'follow' });
  return res.ok ? res.text() : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Wikipedia rate-limits bursts with a plain-text page: wait and try again. */
async function politely(u: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    await sleep(1500);
    const res = await fetch(u, { headers: UA });
    const text = await res.text();
    try { return JSON.parse(text); } catch {
      if (attempt >= 6) throw new Error(`Wikipedia kept refusing: ${text.slice(0, 80)}`);
      await sleep(10_000 * attempt);
    }
  }
}

async function fetchTopScorers(start: number, clubs: string[]): Promise<Record<string, string | null>> {
  const label = start === 1999 ? '1999–2000' : `${start}–${String((start + 1) % 100).padStart(2, '0')}`;
  const title = (c: string) => `${label} ${CLUBS[c]!.seasonWiki ?? CLUBS[c]!.wiki} season`;
  const u = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=revisions&rvprop=content&rvslots=main&titles='
    + encodeURIComponent(clubs.map(title).join('|'));
  const j = await politely(u) as {
    query: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages: { title: string; revisions?: { slots: { main: { content: string } } }[] }[] };
  };
  const moved = new Map([...(j.query.normalized ?? []), ...(j.query.redirects ?? [])].map((r) => [r.from, r.to]));
  const pages = new Map(j.query.pages.map((p) => [p.title, p.revisions?.[0]?.slots.main.content ?? null]));
  const out: Record<string, string | null> = {};
  for (const c of clubs) {
    let t = title(c);
    while (moved.has(t)) t = moved.get(t)!;
    const text = pages.get(t);
    out[c] = text ? topScorerField(text) : null;
  }
  return out;
}

// 1. Any finished season we do not have yet.
const thisYear = new Date().getUTCFullYear();
for (let start = FIRST; start < thisYear; start++) {
  const id = seasonId(start);
  if (have.has(id)) continue;
  const csv = await fetchResults(start);
  if (!csv) { console.log(`${id}: no results file yet`); continue; }
  const games = parseResults(csv);
  const table = positions(games, id);
  const clubs = Object.keys(table);
  const unknown = clubs.filter((c) => !CLUBS[c]);
  if (unknown.length) throw new Error(`${id}: add ${unknown.join(', ')} to games/season-line/lib/clubs.ts`);
  const n = clubs.length;
  if (games.length < n * (n - 1)) { console.log(`${id}: in progress (${games.length} of ${n * (n - 1)} games)`); continue; }
  const top = await fetchTopScorers(start, clubs);
  const champion = clubs.find((c) => table[c]!.at(-1) === 1)!;
  data.seasons.push({ id, start, games: 2 * (n - 1), champion, table, top });
  console.log(`${id}: added; champions ${champion}; ${Object.values(top).filter((f) => parseTopScorer(f)).length} of ${n} top scorers`);
}
data.seasons.sort((a, b) => a.start - b.start);

// 2. The boards, from the seasons, the careers and the pool's fame.
const added = data.seasons.length > have.size;
if (added || process.argv.includes('--boards') || data.boards.length === 0) {
  const careers = JSON.parse(readFileSync('data/careers.json', 'utf8')) as { players: Record<string, { title: string; stints: { loan: boolean; from: number; to: number | null; title: string; apps: number | null; q?: string }[] }> };
  const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as { id: string; fame?: { value: number } }[];
  const fame = new Map(pool.map((p) => [p.id, p.fame?.value ?? 0]));
  const byWiki = new Map(Object.entries(CLUBS).map(([k, c]) => [c.wiki, k]));
  const stints = new Map<string, Stint[]>();
  const qid = new Map<string, string>();
  for (const [id, p] of Object.entries(careers.players)) for (const s of p.stints) {
    const club = byWiki.get(s.title);
    if (!club || s.loan) continue;
    if (s.q) qid.set(club, s.q);
    (stints.get(club) ?? stints.set(club, []).get(club)!).push({ name: p.title, fame: fame.get(id) ?? 0, from: s.from, to: s.to, apps: s.apps });
  }
  data.clubs = Object.fromEntries(Object.entries(CLUBS).map(([k, c]) => [k, { name: c.name, q: qid.get(k) ?? null }]));
  const plSeasons = new Map<string, number>();
  for (const s of data.seasons) for (const c of Object.keys(s.table)) plSeasons.set(c, (plSeasons.get(c) ?? 0) + 1);

  const finals = new Map<string, number[]>();
  for (const s of data.seasons) for (const [c, l] of Object.entries(s.table)) (finals.get(c) ?? finals.set(c, []).get(c)!).push(l.at(-1)!);
  const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]!; };
  // Three seasons make a usual; fewer is a visitor.
  const usual = (c: string) => (finals.get(c)!.length >= 3 ? median(finals.get(c)!) : null);

  const boards: StoredBoard[] = [];
  let noStory = 0, noHints = 0;
  for (const s of data.seasons) for (const [club, line] of Object.entries(s.table)) {
    const d = drama(line, Object.keys(s.table).length, usual(club));
    if (!d.stories.length) { noStory++; continue; }
    const top = parseTopScorer(s.top[club] ?? null);
    const squad = top ? squadHints(stints.get(club) ?? [], s.start, top.names) : null;
    if (!top || !squad) { noHints++; continue; }
    boards.push({
      id: `${s.id}|${club}`, season: s.id, start: s.start, club, stories: d.stories, score: d.score,
      fame: Math.round((plSeasons.get(club)! / data.seasons.length) * 100) / 100,
      rival: nearestRival(s.table, club), squad, top,
    });
  }
  data.boards = boards.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  console.log(`${boards.length} boards (${dailyPool(boards).length} daily); ${noStory} flat lines left out, ${noHints} without hints`);
  writeFileSync(DATA, `{\n"clubs": ${JSON.stringify(data.clubs)},\n"boards": [\n${data.boards.map((b) => JSON.stringify(b)).join(',\n')}\n],\n"seasons": [\n${data.seasons.map((s) => JSON.stringify(s)).join(',\n')}\n]\n}\n`);
}

// 3. The schedule.
const today = new Date().toISOString().slice(0, 10);
const days: StoredDay[] = existsSync(DAYS) ? JSON.parse(readFileSync(DAYS, 'utf8')) : [];
const last = days.at(-1)?.date;
if (!last || daysBetween(today, last) < MIN_AHEAD) {
  const all = extend(data.boards, days, addDays(today, TOP_UP));
  writeFileSync(DAYS, `[\n${all.map((d) => JSON.stringify(d)).join(',\n')}\n]\n`);
  console.log(`${all.length - days.length} new days, to ${all.at(-1)!.date}`);
} else {
  console.log(`${daysBetween(today, last)} days in hand.`);
}

if (process.argv.includes('--print')) {
  for (const b of data.boards) console.log(`${b.score.toFixed(2)} ${b.fame.toFixed(2)} ${b.id.padEnd(28)} ${b.stories.join(',').padEnd(20)} rival ${b.rival}; ${b.squad.join(', ')}; ${b.top.names.join('/')} ${b.top.goals}`);
  const now = (JSON.parse(readFileSync(DAYS, 'utf8')) as StoredDay[]).filter((d) => d.date >= today);
  console.log(now.slice(0, 30).map((d) => `${d.date} ${d.board}`).join('\n'));
}
