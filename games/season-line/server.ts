import { readFile } from 'node:fs/promises';
import { dayNumber } from '../../src/lib/daily';
import { COLOUR, INK, seasonLabel } from './lib/clubs';
import { addDays, dailyPool, EPOCH, FIRST_DAILY_SEASON } from './lib/day';
import { fifths, rivals } from './lib/table';
import { RUN_GUESSES, WINDOW, type RunSlDay } from './lib/run';
import type { TopScorer } from './lib/wiki';
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

const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  // letters with no accent to strip: type them as the plain letter ("Sanli" for \u015eanl\u0131)
  .replace(/\u0131/g, 'i').replace(/\u00f8/g, 'o').replace(/\u0142/g, 'l').replace(/\u0111/g, 'd').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** A bonus guess is right when it is a top scorer's full name or surname, ignoring accents and case. */
export function scorerMatches(names: readonly string[], guess: string): boolean {
  const g = plain(guess);
  return g.length >= 3 && names.some((n) => plain(n) === g || plain(n).split(' ').at(-1) === g);
}

/**
 * Everything the page may see after `guesses`. Guesses past the end, or
 * after the right one, are ignored; one that names a club or season outside
 * the board's list makes the whole request bad (null).
 */
export async function view(id: string, guesses: readonly Guess[], bonus?: unknown): Promise<BoardView | null> {
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
  // Solved before the top scorer clue was earned (guess 4 or sooner): one bonus guess at who it was.
  const bonusOpen = won && judged.length < GUESSES;
  const tried = bonusOpen && typeof bonus === 'string' && bonus.trim() ? bonus.trim().slice(0, 60) : null;
  const options = bonusOpen && !tried ? [...new Set(data.boards.flatMap((x) => x.top.names))].sort((x, y) => x.localeCompare(y)) : [];
  const near = rivals(season.table, b.club).slice(0, done || step >= 3 ? 3 : step >= 1 ? 1 : 0);

  return {
    id, day: r.day, date: r.date, games: season.games, teams: Object.keys(season.table).length, range, clubs, judged,
    line: season.table[b.club]!.slice(0, shown),
    rivals: near.map((c) => ({ club: c, name: name(c), q: data.clubs[c]!.q, colour: COLOUR[c] ?? INK, line: season.table[c]!.slice(0, shown) })),
    hints: {
      // The better-known of the two: one hint, so it should be one people can place.
      squad: done || step >= 2 ? b.squad[1] : null,
      top: tried || (!bonusOpen && (done || step >= 4)) ? b.top : null,
    },
    bonus: !bonusOpen ? null : tried ? { state: scorerMatches(b.top.names, tried) ? 'right' : 'wrong', guess: tried, options: [] } : { state: 'open', guess: null, options },
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
    rivals: rivals(s.table, b.club).slice(0, 3).map((c) => ({ club: c, name: data.clubs[c]!.name, q: data.clubs[c]!.q, colour: COLOUR[c] ?? INK, line: s.table[c]! })),
    squad: b.squad[1], top: b.top,
    answer: { name: data.clubs[b.club]!.name, season: seasonLabel(b.start) },
    caption: `${data.clubs[b.club]!.name}, ${b.start}/${String((b.start + 1) % 100).padStart(2, '0')}`,
  };
}

/** How many boards each kind of play has, for the front page. */
export async function counts(): Promise<{ daily: number; endless: number }> {
  const { data } = await load();
  return { daily: dailyPool(data.boards).length, endless: data.boards.length };
}

// ── The daily run: Read the season ─────────────────────────────────────────

/** What the run's page may see. The club only once it is named or the guesses are spent; the season once it is picked. */
export interface RunSeasonView {
  date: string;
  games: number;
  teams: number;
  /** The five seasons the answer is in, as start years. */
  window: [number, number];
  clubs: { club: string; name: string; q: string | null; colour: string }[];
  line: number[];
  /** Each club guess: '' when the clock ran out. */
  guesses: { club: string; right: boolean }[];
  hints: { squad: string | null; top: TopScorer | null };
  /** Set once the club is named or the guesses are spent. */
  club: { club: string; name: string; q: string | null; colour: string } | null;
  /** 1 to 3: the guess that named the club, or null. */
  clubAt: number | null;
  /** Set once the season is picked (null pick: the clock ran out). */
  season: { picked: number | null; start: number; champion: string; championName: string } | null;
}

let runRead: Promise<Map<string, RunSlDay>> | null = null;
const runDays = () => (process.env.NODE_ENV === 'development' ? null : runRead)
  ?? (runRead = read<RunSlDay[]>('run.json').then((ds) => new Map(ds.map((d) => [d.date, d]))));

/**
 * The run's board for `date` after these guesses. `clubs` are the club
 * guesses so far ('' = out of time); `season` is the season pick, null when
 * its clock ran out, undefined until then. Bad input is null.
 */
export async function runView(date: string, clubs: readonly unknown[], season?: unknown): Promise<RunSeasonView | null> {
  if (!playable(date)) return null;
  const [day, { data, byId }] = [(await runDays()).get(date), await load()];
  const b = day && byId.get(day.board);
  if (!day || !b) return null;
  const s = data.seasons.find((x) => x.id === b.season)!;
  const window: [number, number] = [day.from, day.from + WINDOW - 1];
  const names = new Set<string>();
  for (const x of data.seasons) if (x.start >= window[0] && x.start <= window[1]) for (const c of Object.keys(x.table)) names.add(c);
  const card = (c: string) => ({ club: c, name: data.clubs[c]!.name, q: data.clubs[c]!.q, colour: COLOUR[c] ?? INK });
  const guesses: RunSeasonView['guesses'] = [];
  for (const g of clubs.slice(0, RUN_GUESSES)) {
    if (guesses.some((x) => x.right)) break;
    if (typeof g !== 'string' || (g !== '' && !names.has(g))) return null;
    guesses.push({ club: g, right: g === b.club });
  }
  const misses = guesses.filter((g) => !g.right).length;
  const clubAt = guesses.findIndex((g) => g.right) + 1 || null;
  const clubDone = clubAt !== null || misses >= RUN_GUESSES;
  let picked: number | null | undefined;
  if (clubDone && season !== undefined) {
    if (season !== null && (typeof season !== 'number' || !Number.isInteger(season) || season < window[0] || season > window[1])) return null;
    picked = season as number | null;
  }
  return {
    date, games: s.games, teams: Object.keys(s.table).length, window,
    clubs: [...names].map(card).sort((x, y) => x.name.localeCompare(y.name)),
    line: s.table[b.club]!,
    guesses,
    // Hints come with misses; the rest only once the season is picked (a top scorer's tally can place the season).
    hints: { squad: misses >= 1 || picked !== undefined ? b.squad[1] : null, top: misses >= 2 || picked !== undefined ? b.top : null },
    club: clubDone ? card(b.club) : null,
    clubAt,
    season: picked === undefined ? null : { picked, start: b.start, champion: s.champion, championName: data.clubs[s.champion]!.name },
  };
}
