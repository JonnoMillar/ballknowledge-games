import { readdirSync, readFileSync } from 'node:fs';
import goalsJson from './data/goals.json';
import { utcToday } from './lib/dates';
import { distance, inHalf, mirrorNote, type Spot } from './lib/pitch';
import { isNew, shelve } from './lib/shelves';
import type { Answer, BoardView, Goals, Pack, PackCard, Shelf } from './lib/types';

/**
 * Pitch pin's ref. The coordinates stay here: the page gets the goals
 * without them, and a throw gets back the one answer it was thrown at.
 */
const goals = goalsJson as unknown as Goals;

/** Every pack file, read once. Relative to the project root, as in src/server/board.ts; next.config.ts traces them. */
const DIR = 'games/pin/data/packs';
const packs: Pack[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Pack);
const byId = new Map(packs.map((p) => [p.id, p]));

export function boardView(id: string): BoardView | null {
  const p = byId.get(id);
  if (!p || p.goals.some((s) => !goals[s])) return null;
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    goals: p.goals.map((slug) => {
      const g = goals[slug]!;
      return { slug, scorer: g.scorer, match: g.match, date: g.date, competition: g.competition, line: g.line, credit: g.source.from };
    }),
  };
}

/** The library: every pack on its shelf, with no answers. */
export function library(now = new Date()): Shelf[] {
  const today = utcToday(now);
  return shelve(packs).map((s) => ({
    title: s.title,
    packs: s.packs.map((p): PackCard => ({
      id: p.id, kind: p.kind, title: p.title, subtitle: p.subtitle, size: p.goals.length, isNew: isNew(p, today),
    })),
  }));
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

/** The answer to one throw, or null when that goal is not in that pack. */
export function judge({ board, goal, pin }: ThrowRequest): Answer | null {
  const p = byId.get(board);
  const g = goals[goal];
  if (!p || !g || !p.goals.includes(goal)) return null;
  return { at: g.at, distance: distance(pin, g.at), mirrored: mirrorNote(pin, g.at), xg: g.xg, credit: g.source.from };
}
