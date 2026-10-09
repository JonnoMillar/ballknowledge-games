/**
 * Pitch pin's Goal of the Month packs: the Premier League's shortlist for
 * last month (and the month before while its pack is missing), each nominee
 * matched to its Understat shot. Runs unattended: `npm run pin:update`.
 *
 *   npx tsx scripts/build-pin-gotm.ts [--today YYYY-MM-DD]
 *
 * A 404 means no shortlist yet: nothing to do. A page that loads but lists
 * no nominee we can read means the page has changed: exit 1, so the run goes
 * red. Fewer than six matched: no pack, tried again tomorrow. Also appends
 * the month's model check (how many nominees our round packs had picked) to
 * games/pin/data/check.json.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { monthName, seasonLabel, seasonOf, seasonTag, utcToday } from '../games/pin/lib/dates';
import { gotmUrl, monthsDue, parseShortlist } from '../games/pin/lib/gotm';
import type { Goal } from '../games/pin/lib/types';
import { arg, CHECK, packExists, readGoals, readPacks, writeGoals, writePack } from './pin-files';
import { leagueFixtures, officialGoal } from './understat';

interface Check { month: string; nominees: number; matched: number; inOurPicks: number }

const today = arg('today') ?? utcToday();
const goals = readGoals();
let made = 0;

for (const ym of monthsDue(today, (m) => packExists(`gotm-${m}`))) {
  const url = gotmUrl(ym);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (res.status === 404) {
    console.log(`${ym}: no shortlist page yet`);
    continue;
  }
  if (!res.ok) throw new Error(`${url} gave ${res.status}`);
  const picks = parseShortlist(await res.text(), ym);
  if (!picks.length) throw new Error(`${url} loaded but no nominee could be read; has the page changed?`);

  const season = seasonOf(`${ym}-01`);
  const fixtures = await leagueFixtures(season);
  const found: [string, Goal][] = [];
  for (const p of picks) {
    const hit = await officialGoal(p, fixtures, season);
    if (hit) found.push(hit);
  }
  if (found.length < 6) {
    console.log(`${ym}: only ${found.length} of ${picks.length} nominees matched; no pack yet`);
    continue;
  }

  for (const [slug, g] of found) goals[slug] ??= g;
  writeGoals(goals); // before the pack, so a later failure never leaves a pack whose goals are missing
  writePack({
    id: `gotm-${ym}`,
    kind: 'month',
    title: `${monthName(ym)}'s Goal of the Month`,
    subtitle: `Premier League ${seasonLabel(season)} · ${found.length} goals`,
    season: seasonTag(season),
    published: today,
    goals: found.map(([slug]) => slug),
  });
  made++;

  const ours = new Set(readPacks().filter((p) => p.kind === 'round').flatMap((p) => p.goals));
  const check: Check[] = existsSync(CHECK) ? (JSON.parse(readFileSync(CHECK, 'utf8')) as Check[]) : [];
  const row = { month: ym, nominees: picks.length, matched: found.length, inOurPicks: found.filter(([s]) => ours.has(s)).length };
  writeFileSync(CHECK, `${JSON.stringify([...check.filter((c) => c.month !== ym), row], null, 2)}\n`);
  console.log(`gotm-${ym}: ${found.map(([, g]) => g.scorer).join(', ')}; ${row.inOurPicks} of them were in our round packs`);
}

console.log(`${made} Goal of the Month packs written`);
