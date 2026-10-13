/**
 * Keep ITK's schedule ahead of the calendar. Run daily by
 * .github/workflows/itk-days.yml; safe to run by hand.
 *
 *   npm run itk:days            top up if fewer than 14 days are left
 *   npm run itk:days -- --print print the days still to be played, answers included
 *
 * Reads only committed files, so a rerun writes the same days.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { buildWorld } from '../../games/itk/lib/world';
import { addDays, daysBetween, EPOCH, extend, MIN_AHEAD, TOP_UP, type StoredDay } from '../../games/itk/lib/day';
import { problems } from '../../games/itk/lib/check';
import { readInputs } from './inputs';

export const DAYS = 'games/itk/data/days.json';

const today = new Date().toISOString().slice(0, 10);
const days: StoredDay[] = existsSync(DAYS) ? (JSON.parse(readFileSync(DAYS, 'utf8')) as StoredDay[]) : [];
const world = buildWorld(readInputs());

const last = days[days.length - 1]?.date;
const ahead = last ? daysBetween(today, last) : -1;
let all = days;
if (ahead < MIN_AHEAD) {
  all = extend(world, days, EPOCH, addDays(today < EPOCH ? EPOCH : today, TOP_UP));
  const fresh = all.slice(days.length);
  const bad = fresh.flatMap((d, i) => problems(world, d, all.slice(0, days.length + i)));
  if (bad.length) throw new Error(`ITK schedule broke its own rules:\n${bad.join('\n')}`);
  // One day a line: a reviewable diff.
  writeFileSync(DAYS, `[\n${all.map((d) => JSON.stringify(d)).join(',\n')}\n]\n`);
  console.log(`${fresh.length} new days, ${fresh[0]?.date} to ${fresh[fresh.length - 1]?.date} (${world.eligible.length} players eligible)`);
} else {
  console.log(`${ahead} days in hand, nothing to do.`);
}

if (process.argv.includes('--print')) {
  const name = (q: string) => (world.clubs[q]?.name ?? q).replace(/ F\.C\.| A\.F\.C\./, '');
  for (const d of all.filter((x) => x.date >= today)) {
    console.log(`\n${d.date}`);
    for (const r of d.rounds) {
      const trail = r.stops.map((s, i) => `${i === r.fake ? '*' : ''}${name(s.club)} ${s.year}${s.loan ? ' (loan)' : ''}`).join(' → ');
      console.log(`  ${r.name} [${r.kind}] ${trail}${r.real ? `   (really ${name(r.real)})` : ''}`);
    }
  }
}
