import goalsJson from './data/goals.json';
import packsJson from './data/packs.json';
import daysJson from './data/days.json';
import { dayNumber } from '../../src/lib/daily';
import { dailyPool, daySlugs, isDate, PIN_EPOCH } from './lib/boards';
import { distance, inHalf, mirrorNote, type Spot } from './lib/pitch';
import { par } from './lib/score';
import type { Answer, BoardView, Goals, Pack } from './lib/types';

/**
 * Pitch pin's ref. The coordinates stay here: the page gets the goals
 * without them, and a throw gets back the one answer it was thrown at.
 */
const goals = goalsJson as unknown as Goals;
const packs = packsJson as unknown as Pack[];
const days = daysJson as unknown as Record<string, string[]>;
const pool = dailyPool(goals, packs);

/** The latest playable day: tomorrow in UTC, so every time zone has its today. */
const latest = (now: Date): string => new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

interface Slugs { slugs: string[]; title: string; date: string | null; number: number | null }

function slugsFor(id: string, now: Date): Slugs | null {
  if (id.startsWith('pack:')) {
    const p = packs.find((x) => x.id === id.slice(5));
    return p ? { slugs: p.goals, title: p.title, date: null, number: null } : null;
  }
  if (!isDate(id) || id < PIN_EPOCH || id > latest(now)) return null;
  const n = dayNumber(id, PIN_EPOCH);
  return { slugs: daySlugs(id, days, pool), title: `No. ${n}`, date: id, number: n };
}

export function boardView(id: string, now = new Date()): BoardView | null {
  const s = slugsFor(id, now);
  if (!s || s.slugs.some((slug) => !goals[slug])) return null;
  return {
    id,
    title: s.title,
    date: s.date,
    number: s.number,
    par: par(s.slugs.map((slug) => goals[slug]!.at)),
    goals: s.slugs.map((slug) => {
      const g = goals[slug]!;
      return { slug, scorer: g.scorer, match: g.match, date: g.date, competition: g.competition, line: g.line, credit: g.source.from };
    }),
  };
}

export function packList(): { id: string; title: string }[] {
  return packs.map(({ id, title }) => ({ id, title }));
}

export interface ThrowRequest { board: string; goal: string; pin: Spot }

/** A throw as the route accepts it: short strings and a finite point inside the half. */
export function parseThrow(body: unknown): ThrowRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.board !== 'string' || typeof b.goal !== 'string' || b.board.length > 40 || b.goal.length > 60) return null;
  if (typeof b.x !== 'number' || typeof b.y !== 'number' || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
  const pin = { x: b.x, y: b.y };
  return inHalf(pin) ? { board: b.board, goal: b.goal, pin } : null;
}

/** The answer to one throw, or null when that goal is not on a playable board. */
export function judge({ board, goal, pin }: ThrowRequest, now = new Date()): Answer | null {
  const s = slugsFor(board, now);
  const g = goals[goal];
  if (!s || !g || !s.slugs.includes(goal)) return null;
  return { at: g.at, distance: distance(pin, g.at), mirrored: mirrorNote(pin, g.at), xg: g.xg, credit: g.source.from };
}
