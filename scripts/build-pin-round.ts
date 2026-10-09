/**
 * Pitch pin's round packs: six goals from each Tuesday-to-Monday week of
 * Premier League results, picked by our ranking (lowest xG first, one goal a
 * match, fair). Runs unattended: `npm run pin:update`, daily, from
 * .github/workflows/pin-packs.yml.
 *
 *   npx tsx scripts/build-pin-round.ts [--today YYYY-MM-DD]
 *
 * Makes a pack for every complete week of the season that has results and
 * no pack yet, so the first run fills the season so far and a missed week is
 * made late, not lost. A normal day costs one request. A week waits while a
 * match that kicked off in the last three days has no result on Understat;
 * after that the match is taken as postponed. A week with fewer than five
 * results gets no pack. June and July: nothing to do.
 */
import { addDays, seasonLabel, seasonOf, seasonTag, spanTitle, utcToday, weekEnd } from '../games/pin/lib/dates';
import { pickRound, rankRecent, type Candidate } from '../games/pin/lib/round';
import type { Goal } from '../games/pin/lib/types';
import { arg, packExists, readGoals, writeGoals, writePack } from './pin-files';
import { leagueFixtures, matchShots, toGoal, type Fixture } from './understat';

const today = arg('today') ?? utcToday();
const month = Number(today.slice(5, 7));
if (month === 6 || month === 7) {
  console.log('No Premier League football in June or July.');
  process.exit(0);
}

const season = seasonOf(today);
const fixtures = await leagueFixtures(season);

// Fixtures by the Monday that ends their week, for weeks that are over.
const weeks = new Map<string, Fixture[]>();
for (const f of fixtures) {
  const end = weekEnd(f.datetime.slice(0, 10));
  if (end >= today) continue;
  weeks.set(end, [...(weeks.get(end) ?? []), f]);
}

const goals = readGoals();
let made = 0;
for (const [end, fs] of [...weeks].sort(([a], [b]) => a.localeCompare(b))) {
  const id = `pl-${seasonTag(season)}-${end}`;
  if (packExists(id)) continue;
  const waiting = fs.filter((f) => !f.isResult && f.datetime.slice(0, 10) >= addDays(today, -3));
  if (waiting.length) {
    console.log(`${id}: waiting for ${waiting.map((f) => `${f.h.title} v ${f.a.title}`).join(', ')}`);
    continue;
  }
  const played = fs.filter((f) => f.isResult);
  if (played.length < 5) {
    if (played.length) console.log(`${id}: only ${played.length} results, no pack`);
    continue;
  }
  const found: Record<string, Goal> = {};
  const candidates: Candidate[] = [];
  for (const f of played) {
    const shots = await matchShots(f.id);
    for (const s of shots) {
      if (s.result !== 'Goal' || s.situation === 'Penalty') continue;
      const g = toGoal(f, shots, s, season);
      found[`u-${s.id}`] = g;
      candidates.push({ slug: `u-${s.id}`, matchId: Number(f.id), xg: g.xg, at: g.at });
    }
  }
  const picks = pickRound(rankRecent(candidates));
  const dates = played.map((f) => f.datetime.slice(0, 10)).sort();
  for (const p of picks) goals[p.slug] ??= found[p.slug]!;
  writePack({
    id,
    kind: 'round',
    title: spanTitle(dates[0]!, dates[dates.length - 1]!),
    subtitle: `Premier League ${seasonLabel(season)} · 6 goals`,
    season: seasonTag(season),
    published: addDays(end, 1),
    goals: picks.map((p) => p.slug),
  });
  made++;
  console.log(`${id}: ${picks.map((p) => `${found[p.slug]!.scorer} (xG ${found[p.slug]!.xg})`).join(', ')}`);
}

if (made) writeGoals(goals);
console.log(`${made} round packs written`);
