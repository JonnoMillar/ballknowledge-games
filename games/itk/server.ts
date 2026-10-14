import { readFile } from 'node:fs/promises';
import { loadData } from '../../src/server/board';
import { clubColour, signatureClub } from '../../src/lib/club-colours';
import { dayNumber } from '../../src/lib/daily';
import { addDays, EPOCH, type StoredDay } from './lib/day';
import type { ItkDay, ItkRound, Verdict } from './lib/types';

/**
 * ITK's daily, read from the committed schedule (games/itk/data/days.json,
 * kept ahead by the itk-days cron).
 *
 * The fake's index and the real club stay here until the round is over:
 * every pick is judged by /api/spoofed/pick.
 */
let stored: Promise<Map<string, StoredDay>> | null = null;
// Read once in production; every request in development, so a regenerated schedule shows without a restart.
const readDays = () => (process.env.NODE_ENV === 'development' ? null : stored) ?? (stored = readFile('games/itk/data/days.json', 'utf8')
  .then((s) => new Map((JSON.parse(s) as StoredDay[]).map((d) => [d.date, d]))));

/**
 * A date someone can play: a real YYYY-MM-DD, not before day 1, and not past
 * tomorrow in UTC. Tomorrow because the player's own date runs up to fourteen
 * hours ahead of UTC; any later is peeking.
 */
export function playable(date: unknown, now = new Date()): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false;
  return date >= EPOCH && date <= addDays(now.toISOString().slice(0, 10), 1);
}

export async function loadDay(date: string): Promise<ItkDay | null> {
  if (!playable(date)) return null;
  const [d, { byId, images, clubs }] = await Promise.all([readDays().then((m) => m.get(date)), loadData()]);
  if (!d) return null;
  return {
    date,
    day: dayNumber(date, EPOCH),
    rounds: d.rounds.map((r) => {
      const p = byId.get(r.player)!;
      return {
        player: { id: p.id, name: r.name },
        image: images[p.id] ?? null,
        ground: clubColour(signatureClub(p)),
        stops: r.stops.map((s) => ({ clubId: s.club, name: clubs[s.club]?.name ?? s.club, year: s.year, loan: s.loan })),
      };
    }),
  };
}

/**
 * The lobby's demo: a career every fan knows, with one fake a fan rules out
 * at a glance. Ronaldo is over `RULES.playerMax`, so he never comes up in a
 * day and the demo spoils nothing. Juventus in 2018 becomes PSG.
 */
const DEMO = {
  player: 'Q11571',
  // A slice of the career, not all of it: it is an example, and three cards fit beside him.
  stops: [['Q8682', 2009], ['Q483020', 2018], ['Q18656', 2021]] as const,
  fake: 1,
  real: 'Q1422',
};

export interface DemoCareer { round: ItkRound; fake: number; real: { clubId: string; name: string } }

export async function demoCareer(): Promise<DemoCareer> {
  const { byId, images, clubs } = await loadData();
  const p = byId.get(DEMO.player)!;
  const club = (id: string) => ({ clubId: id, name: clubs[id]?.name ?? id });
  return {
    round: {
      player: { id: p.id, name: p.name },
      image: images[p.id] ?? null,
      // The club everyone pictures him in, not his most-appearances club.
      ground: clubColour('Q18656'),
      stops: DEMO.stops.map(([id, year]) => ({ ...club(id), year, loan: false })),
    },
    fake: DEMO.fake,
    real: club(DEMO.real),
  };
}

/**
 * Judge one pick. The fake's index, and the real club it covered, come back
 * only when the round is over: the pick found it, or it was the last pick.
 */
export async function judgePick(date: string, round: number, index: number, last: boolean): Promise<Verdict | null> {
  if (!playable(date)) return null;
  const r = (await readDays()).get(date)?.rounds[round];
  if (!r || !Number.isInteger(index) || index < 0 || index >= r.stops.length) return null;
  const fake = index === r.fake;
  if (!fake && !last) return { fake, fakeIndex: null, real: null };
  const { clubs } = await loadData();
  return { fake, fakeIndex: r.fake, real: r.real ? { clubId: r.real, name: clubs[r.real]?.name ?? r.real } : null };
}
