import { readFile } from 'node:fs/promises';
import { dayNumber } from '../../src/lib/daily';
import { COLOUR, INK } from './lib/clubs';
import { addDays, dailyPool, EPOCH, FIRST_DAILY_SEASON } from './lib/day';
import { fifths, rivals } from './lib/table';
import { GUESSES, type BoardView, type Guess, type Judged, type StoredBoard, type StoredData, type StoredDay } from './lib/types';

/**
 * Season line's boards, read from the committed data (kept up to date by
 * scripts/season-line/update.ts). The answer stays here until the board is
 * over: the page sends its guesses and gets back what it may see.
 *
 * A board id is a date (the daily) or `e<n>-<from>-<to>` (endless: the nth
 * board in a fixed shuffle, and the years the player chose), so the id
 * never says which club or season it is.
 */
interface Loaded { data: StoredData; days: Map<string, string>; byId: Map<string, StoredBoard>; endless: StoredBoard[] }
let loaded: Promise<Loaded> | null = null;
const read = <T,>(f: string) => readFile(`games/season-line/data/${f}`, 'utf8').then((s) => JSON.parse(s) as T);
// Once in production; every request in development, so a rebuilt file shows without a restart.
const load = () => (process.env.NODE_ENV === 'development' ? null : loaded) ?? (loaded = Promise.all([read<StoredData>('seasons.json'), read<StoredDay[]>('days.json')])
  .then(([data, days]) => ({
    data,
    days: new Map(days.map((d) => [d.date, d.board])),
    byId: new Map(data.boards.map((b) => [b.id, b])),
    endless: [...data.boards].sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id)),
  })));

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** A daily date someone can play: real, not before day 1, not past tomorrow in UTC (the player's own date runs ahead). */
export function playable(date: unknown, now = new Date()): boolean {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) return false;
  return date >= EPOCH && date <= addDays(now.toISOString().slice(0, 10), 1);
}

const ENDLESS = /^e(\d+)-(\d{4})-(\d{4})$/;

/** The years endless can draw from, oldest and newest. */
export async function years(): Promise<[number, number]> {
  const { data } = await load();
  return [data.seasons[0]!.start, data.seasons.at(-1)!.start];
}

/** A random endless board inside the years, not one of `seen`. Null when the range has none left. */
export async function pickEndless(from: number, to: number, seen: readonly string[], rand = Math.random): Promise<string | null> {
  const { endless } = await load();
  const [lo, hi] = await years();
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < lo || to > hi || from > to) return null;
  const skip = new Set(seen);
  const open = endless.map((b, i) => ({ b, id: `e${i}-${from}-${to}` }))
    .filter((x) => x.b.start >= from && x.b.start <= to && x.b.id !== DEMO && !skip.has(x.id));
  return open.length ? open[Math.floor(rand() * open.length)]!.id : null;
}

async function resolve(id: string): Promise<{ board: StoredBoard; range: [number, number]; day: number | null; date: string | null } | null> {
  const l = await load();
  if (playable(id)) {
    const b = l.byId.get(l.days.get(id) ?? '');
    const last = l.data.seasons.at(-1)!.start;
    return b ? { board: b, range: [FIRST_DAILY_SEASON, last], day: dayNumber(id, EPOCH), date: id } : null;
  }
  const m = id.match(ENDLESS);
  if (!m) return null;
  const b = l.endless[Number(m[1])];
  const range: [number, number] = [Number(m[2]), Number(m[3])];
  return b && b.start >= range[0] && b.start <= range[1] ? { board: b, range, day: null, date: null } : null;
}

/**
 * Everything the page may see after `guesses`. Guesses past the end, or
 * after the right one, are ignored; one that names a club or season outside
 * the board's list makes the whole request bad (null).
 */
export async function view(id: string, guesses: readonly Guess[]): Promise<BoardView | null> {
  const r = await resolve(id);
  if (!r) return null;
  const { data } = await load();
  const { board: b, range } = r;
  const season = data.seasons.find((s) => s.id === b.season)!;
  // Any club in the range with any season in it: the list never says who played when.
  const names = new Set<string>();
  for (const s of data.seasons) if (s.start >= range[0] && s.start <= range[1]) for (const c of Object.keys(s.table)) names.add(c);
  const clubs = [...names].map((club) => ({ club, name: data.clubs[club]!.name, q: data.clubs[club]!.q, colour: COLOUR[club] ?? INK }))
    .sort((x, y) => x.name.localeCompare(y.name));

  const judged: Judged[] = [];
  for (const g of guesses.slice(0, GUESSES)) {
    if (judged.some((j) => j.clubRight && j.season === 0)) break;
    if (!g || typeof g.club !== 'string' || typeof g.start !== 'number' || !names.has(g.club) || !Number.isInteger(g.start) || g.start < range[0] || g.start > range[1]) return null;
    judged.push({ club: g.club, start: g.start, clubRight: g.club === b.club, season: Math.sign(b.start - g.start) as -1 | 0 | 1 });
  }
  const won = judged.some((j) => j.clubRight && j.season === 0);
  const done = won || judged.length >= GUESSES;
  const step = Math.min(judged.length, GUESSES - 1);
  const shown = done ? season.games : fifths(season.games)[step]!;
  const name = (c: string) => data.clubs[c]!.name;
  // After the first miss one other line joins the chart; after the third, two more.
  const near = rivals(season.table, b.club).slice(0, done || step >= 3 ? 3 : step >= 1 ? 1 : 0);

  return {
    id, day: r.day, date: r.date, games: season.games, teams: Object.keys(season.table).length, range, clubs, judged,
    line: season.table[b.club]!.slice(0, shown),
    rivals: near.map((c) => ({ club: c, name: name(c), q: data.clubs[c]!.q, colour: COLOUR[c] ?? INK, line: season.table[c]!.slice(0, shown) })),
    hints: {
      // The better-known of the two: one hint, so it should be one people can place.
      squad: done || step >= 2 ? b.squad[1] : null,
      top: done || step >= 4 ? b.top : null,
    },
    done, won,
    answer: done ? { club: b.club, name: name(b.club), q: data.clubs[b.club]!.q, start: b.start, champion: season.champion, championName: name(season.champion) } : null,
  };
}

/**
 * The front page's example, answer and all: Newcastle's 1995/96, top by
 * twelve points in January and caught by United. Never dealt in endless,
 * and before the daily's years, so it spoils nothing.
 */
const DEMO = '1995-96|Newcastle';

export async function demo() {
  const { data, byId } = await load();
  const b = byId.get(DEMO)!;
  const s = data.seasons.find((x) => x.id === b.season)!;
  return {
    games: s.games, teams: Object.keys(s.table).length,
    me: { line: s.table[b.club]!, q: data.clubs[b.club]!.q, colour: COLOUR[b.club] ?? INK },
    rival: { club: b.rival, line: s.table[b.rival]!, q: data.clubs[b.rival]!.q, colour: COLOUR[b.rival] ?? INK },
    caption: `${data.clubs[b.club]!.name}, ${b.start}/${String((b.start + 1) % 100).padStart(2, '0')}`,
  };
}

/** How many boards each kind of play has, for the front page. */
export async function counts(): Promise<{ daily: number; endless: number }> {
  const { data } = await load();
  return { daily: dailyPool(data.boards).length, endless: data.boards.length };
}
