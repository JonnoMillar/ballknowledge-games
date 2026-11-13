/**
 * Keep the daily run's own schedules ahead of the calendar: Log the shot's
 * goals (games/pin/data/run.json) and Read the season's boards
 * (games/season-line/data/run.json). Run daily by
 * .github/workflows/run-days.yml; safe to run by hand.
 *
 *   npm run run:days            top up whichever has fewer than 14 days left
 *   npm run run:days -- --print print the days still to be played
 *
 * Reads only committed files, so a rerun writes the same days.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { addDays, extend as extendPin, MIN_AHEAD, problems as pinProblems, TOP_UP, type RunPinDay } from '../../games/pin/lib/run';
import type { Goals } from '../../games/pin/lib/types';
import { extendRun, problems as slProblems, type RunSlDay } from '../../games/season-line/lib/run';
import type { StoredData, StoredDay } from '../../games/season-line/lib/types';

const today = new Date().toISOString().slice(0, 10);
const print = process.argv.includes('--print');
const write = (path: string, days: unknown[]) => writeFileSync(path, `[\n${days.map((d) => JSON.stringify(d)).join(',\n')}\n]\n`);
const read = <T,>(path: string): T[] => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T[]) : []);
const ahead = (days: { date: string }[]) => {
  const last = days[days.length - 1]?.date;
  return last ? Math.round((Date.parse(last) - Date.parse(today)) / 86_400_000) : -1;
};

// ── Log the shot ──────────────────────────────────────────────────────────
export const PIN_RUN = 'games/pin/data/run.json';
const goals = JSON.parse(readFileSync('games/pin/data/goals.json', 'utf8')) as Goals;
const pinDays = read<RunPinDay>(PIN_RUN);
if (ahead(pinDays) < MIN_AHEAD) {
  const all = extendPin(goals, pinDays, addDays(today, TOP_UP));
  const fresh = all.slice(pinDays.length);
  const bad = fresh.flatMap((d, i) => pinProblems(goals, d, all.slice(0, pinDays.length + i)));
  if (bad.length) throw new Error(`run pin schedule broke its own rules:\n${bad.join('\n')}`);
  write(PIN_RUN, all);
  console.log(`Log the shot: ${fresh.length} new days, ${fresh[0]?.date} to ${fresh[fresh.length - 1]?.date}`);
} else console.log(`Log the shot: ${ahead(pinDays)} days in hand.`);
if (print) for (const d of read<RunPinDay>(PIN_RUN).filter((x) => x.date >= today)) console.log(`${d.date}  ${d.goals.map((s) => `${goals[s]!.scorer} (${goals[s]!.date})`).join(' · ')}`);

// ── Read the season ───────────────────────────────────────────────────────
export const SL_RUN = 'games/season-line/data/run.json';
const sl = JSON.parse(readFileSync('games/season-line/data/seasons.json', 'utf8')) as StoredData;
const daily = read<StoredDay>('games/season-line/data/days.json');
const [first, last] = [sl.seasons[0]!.start, sl.seasons.at(-1)!.start];
const slDays = read<RunSlDay>(SL_RUN);
if (ahead(slDays) < MIN_AHEAD) {
  const all = extendRun(sl.boards, slDays, daily, addDays(today, TOP_UP), first, last);
  const fresh = all.slice(slDays.length);
  const bad = fresh.flatMap((d) => slProblems(sl.boards, d, all, daily, first, last));
  if (bad.length) throw new Error(`run season schedule broke its own rules:\n${bad.join('\n')}`);
  write(SL_RUN, all);
  console.log(`Read the season: ${fresh.length} new days, ${fresh[0]?.date} to ${fresh[fresh.length - 1]?.date}`);
} else console.log(`Read the season: ${ahead(slDays)} days in hand.`);
if (print) for (const d of read<RunSlDay>(SL_RUN).filter((x) => x.date >= today)) console.log(`${d.date}  ${d.board}  window from ${d.from}`);
