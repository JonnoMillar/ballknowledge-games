import { readFile } from 'node:fs/promises';
import { demoClub, demoSticker, loadData } from '../../src/server/board';
import type { StepsDemo } from '../../src/lib/demo';
import { clubColour, signatureClub } from '../../src/lib/club-colours';
import { clubView } from '../../src/lib/clubs';
import { sharedClubsByProminence } from '../../src/lib/chain/score';
import { dayNumber } from '../../src/lib/daily';
import type { Player } from '../../src/lib/chemistry/types';
import { addDays, EPOCH, type StoredDay } from './lib/day';
import { judge, stepsOf, STEPS, type Views } from './lib/rules';
import type { StepCard, StepClub, StepDay, Verdict } from './lib/types';

/**
 * The step run's daily, read from the committed schedule
 * (games/step/data/days.json, kept ahead by the step-days cron). Every pick
 * is judged here; no step's field ever reaches the browser.
 */
let stored: Promise<Map<string, StoredDay>> | null = null;
// Read once in production; every request in development, so a regenerated schedule shows without a restart.
const readDays = () => (process.env.NODE_ENV === 'development' ? null : stored) ?? (stored = readFile('games/step/data/days.json', 'utf8')
  .then((s) => new Map((JSON.parse(s) as StoredDay[]).map((d) => [d.date, d]))));

let viewIndex: Promise<Views> | null = null;
const playerViews = () => viewIndex ??= readFile('data/player-views.json', 'utf8').then((s) => JSON.parse(s) as Views);

let clubIndex: Promise<Map<string, Player[]>> | null = null;
const byClub = () => clubIndex ??= loadData().then(({ players }) => {
  const m = new Map<string, Player[]>();
  for (const p of players) for (const c of p.clubIds) { if (!m.has(c)) m.set(c, []); m.get(c)!.push(p); }
  return m;
});

/**
 * A date someone can play: a real YYYY-MM-DD, not before day 1, and not past
 * tomorrow in UTC (the player's own date runs up to fourteen hours ahead).
 */
export function playable(date: unknown, now = new Date()): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false;
  return date >= EPOCH && date <= addDays(now.toISOString().slice(0, 10), 1);
}

async function clubOf(id: string): Promise<StepClub> {
  const { clubs } = await loadData();
  const rec = clubs[id];
  return { id, club: rec ? clubView(rec) : { name: id }, colour: clubColour(id) };
}

export async function loadDay(date: string): Promise<StepDay | null> {
  if (!playable(date)) return null;
  const [d, { byId, images }] = await Promise.all([readDays().then((m) => m.get(date)), loadData()]);
  if (!d) return null;
  return {
    date,
    day: dayNumber(date, EPOCH),
    steps: await Promise.all(stepsOf(d).map(async (s) => {
      const p = byId.get(s.player)!;
      return {
        player: { id: p.id, name: p.name, image: images[p.id] ?? null, ground: clubColour(signatureClub(p)) },
        club: await clubOf(s.club),
        playerFirst: s.playerFirst,
      };
    })),
  };
}

/**
 * Judge one pick. `earlier` is the run's picks so far: nobody twice. A
 * pick the step cannot take is a verdict (held: false), not an error; only
 * malformed input is null.
 */
export async function judgePick(date: string, step: number, pickId: string, earlier: readonly string[] = []): Promise<Verdict | null> {
  if (!playable(date) || !Number.isInteger(step) || step < 0 || step >= STEPS) return null;
  const d = (await readDays()).get(date);
  const { byId, images } = await loadData();
  const pick = byId.get(pickId);
  if (!d || !pick || earlier.includes(pickId)) return null;
  const s = stepsOf(d)[step]!;
  if (d.players.includes(pickId)) return null;
  const given = byId.get(s.player)!;
  const j = judge(pick, given, s.club, (await byClub()).get(s.club) ?? [], await playerViews());

  const card = async (p: Player, via: string | null): Promise<StepCard> => ({
    id: p.id, name: p.name, image: images[p.id] ?? null,
    clubs: via ? [await clubOf(via), await clubOf(s.club)] : null,
  });
  return {
    held: j.held,
    grade: j.grade,
    pick: await card(pick, j.via),
    obvious: j.obvious ? await card(j.obvious, sharedClubsByProminence(j.obvious, given)[0] ?? null) : null,
    elite: j.elite ? await card(j.elite, sharedClubsByProminence(j.elite, given)[0] ?? null) : null,
  };
}

/**
 * The How to play demo on /chain: Rooney and Real Madrid, answered by
 * Ronaldo (the obvious one) and Heinze (a rarer one), graded live by the
 * game's own rule, so the demo can never show a grade the game would not.
 */
export async function demoSteps(): Promise<StepsDemo> {
  const [rooney, madrid, united] = ['Q266613', 'Q8682', 'Q18656'];
  const { byId } = await loadData();
  const members = (await byClub()).get(madrid) ?? [];
  const given = byId.get(rooney)!;
  const picks = await Promise.all(['Q11571', 'Q63659'].map(async (id) => ({
    player: await demoSticker(id, united, madrid),
    grade: judge(byId.get(id)!, given, madrid, members, await playerViews()).grade,
  })));
  // A pool change that stopped one holding drops it rather than showing a grade the game would not give.
  return { given: await demoSticker(rooney, united), club: await demoClub(madrid), picks: picks.flatMap((p) => (p.grade ? [{ ...p, grade: p.grade }] : [])) };
}
