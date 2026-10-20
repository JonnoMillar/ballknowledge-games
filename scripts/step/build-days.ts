/**
 * Keep the step run's schedule ahead of the calendar. Run daily by
 * .github/workflows/step-days.yml; safe to run by hand.
 *
 *   npm run step:days            top up if fewer than 14 days are left
 *   npm run step:days -- --print print the days still to be played
 *
 * Reads only committed files, so a rerun writes the same days.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { addDays, buildWorld, daysBetween, EPOCH, extend, MIN_AHEAD, problems, TOP_UP, type StoredDay } from '../../games/step/lib/day';
import { fieldOf, stepsOf, type Views } from '../../games/step/lib/rules';
import type { Player } from '../../src/lib/chemistry/types';
import type { ClubRecord } from '../../src/lib/clubs';

export const DAYS = 'games/step/data/days.json';

const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const clubs = JSON.parse(readFileSync('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;
const world = buildWorld(pool, JSON.parse(readFileSync('data/player-views.json', 'utf8')) as Views);
const today = new Date().toISOString().slice(0, 10);
const days: StoredDay[] = existsSync(DAYS) ? (JSON.parse(readFileSync(DAYS, 'utf8')) as StoredDay[]) : [];

const last = days[days.length - 1]?.date;
const ahead = last ? daysBetween(today, last) : -1;
let all = days;
if (ahead < MIN_AHEAD) {
  all = extend(world, days, EPOCH, addDays(today < EPOCH ? EPOCH : today, TOP_UP));
  const fresh = all.slice(days.length);
  const bad = fresh.flatMap((d, i) => problems(world, d, all.slice(0, days.length + i)));
  if (bad.length) throw new Error(`step schedule broke its own rules:\n${bad.join('\n')}`);
  // One day a line: a reviewable diff.
  writeFileSync(DAYS, `[\n${all.map((d) => JSON.stringify(d)).join(',\n')}\n]\n`);
  console.log(`${fresh.length} new days, ${fresh[0]?.date} to ${fresh[fresh.length - 1]?.date}`);
} else {
  console.log(`${ahead} days in hand, nothing to do.`);
}

if (process.argv.includes('--print')) {
  const name = (q: string) => world.byId.get(q)?.name ?? clubs[q]?.name ?? q;
  for (const d of all.filter((x) => x.date >= today)) {
    const steps = stepsOf(d).map((s) => {
      const field = fieldOf(world.byId.get(s.player)!, world.byClub.get(s.club) ?? []);
      return `${field.length}`;
    });
    const seq = d.players.flatMap((p, i) => (d.clubs[i] ? [name(p), name(d.clubs[i]!)] : [name(p)]));
    console.log(`${d.date}  ${seq.join(' · ')}   fields ${steps.join('/')}`);
  }
}
