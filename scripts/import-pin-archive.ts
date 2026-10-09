/**
 * Pitch pin's archive, run once by hand: every Goal of the Month winner from
 * 2016/17 to last season, from the English Wikipedia (CC BY-SA 4.0),
 * matched to Understat. Writes one pack per season and one per club with six
 * or more winners (its nine most recent). Packs that exist are left alone,
 * so re-running is safe. This season's winners reach the library as month
 * packs instead.
 *
 *   npm run pin:archive
 */
import { normalise } from '../games/pin/lib/match';
import { seasonLabel, seasonOf, seasonTag, utcToday } from '../games/pin/lib/dates';
import { parseWinners, type Winner } from '../games/pin/lib/wiki';
import type { Goal, Pack } from '../games/pin/lib/types';
import { packExists, readGoals, writeGoals, writePack } from './pin-files';
import { leagueFixtures, type Fixture, officialGoal } from './understat';

const API = 'https://en.wikipedia.org/w/api.php?action=parse&page=Premier_League_Goal_of_the_Month&prop=wikitext&format=json&formatversion=2';

const res = await fetch(API, { headers: { 'User-Agent': 'pitch-pin-archive/1.0 (one-off import)' }, signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`Wikipedia gave ${res.status}`);
const wikitext = ((await res.json()) as { parse?: { wikitext?: string } }).parse?.wikitext;
if (!wikitext) throw new Error('Wikipedia returned no wikitext; has the API changed?');

const today = utcToday();
const winners = parseWinners(wikitext).filter((w) => w.season < seasonOf(today));
if (winners.length < 80) throw new Error(`Only ${winners.length} past winners read; has the article changed?`);

const goals = readGoals();
const leagues = new Map<number, Fixture[]>();
const found = new Map<string, Goal>();
const matched: { w: Winner; slug: string }[] = [];
for (const w of winners) {
  if (!leagues.has(w.season)) leagues.set(w.season, await leagueFixtures(w.season));
  const hit = await officialGoal(w, leagues.get(w.season)!, w.season);
  if (!hit) continue;
  found.set(hit[0], hit[1]);
  matched.push({ w, slug: hit[0] });
  console.log(`${w.date} ${w.player}`);
}
console.log(`${matched.length} of ${winners.length} winners matched`);

let made = 0;
// Only goals that land in a pack are kept (the content test forbids strays).
const write = (p: Pack) => {
  if (packExists(p.id)) return;
  for (const s of p.goals) goals[s] ??= found.get(s)!;
  writeGoals(goals); // before the pack, so a later failure never leaves a pack whose goals are missing
  writePack(p);
  made++;
  console.log(`${p.id}: ${p.goals.length} goals`);
};

for (const season of [...new Set(matched.map((m) => m.w.season))].sort()) {
  const ms = matched.filter((m) => m.w.season === season).sort((a, b) => a.w.date.localeCompare(b.w.date));
  if (ms.length < 6) continue;
  write({
    id: `gotm-winners-${seasonTag(season)}`,
    kind: 'season',
    title: `Goal of the Month winners ${seasonLabel(season)}`,
    subtitle: `Premier League · ${ms.length} goals`,
    season: seasonTag(season),
    published: today,
    goals: ms.map((m) => m.slug),
  });
}

for (const team of [...new Set(matched.map((m) => m.w.team))].sort()) {
  const all = matched.filter((m) => m.w.team === team);
  if (all.length < 6) continue;
  const ms = [...all].sort((a, b) => b.w.date.localeCompare(a.w.date)).slice(0, 9).reverse();
  write({
    id: `club-${normalise(team).replace(/ /g, '-')}`,
    kind: 'club',
    title: team,
    subtitle: `Goal of the Month winners · ${ms.length} goals`,
    published: today,
    goals: ms.map((m) => m.slug),
  });
}

console.log(`${made} archive packs written`);
