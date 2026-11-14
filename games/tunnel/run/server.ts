import runJson from '../data/run.json';
import { clubColour, signatureClub } from '../../../src/lib/club-colours';
import { clubView, type ClubView } from '../../../src/lib/clubs';
import { loadData } from '../../../src/server/board';
import { RUN_ORDER_CATS, type RunOrderDay } from '../lib/run';
import { SIZE } from '../lib/rules';
import type { TunnelPlayer } from '../lib/types';

/**
 * Line them up's server (games/tunnel/data/run.json, kept ahead by the
 * run-days cron). The values leave only for a line the player has locked in.
 */
const RUN = new Map((runJson as RunOrderDay[]).map((d) => [d.date, d]));
const utcTomorrow = (now: Date) => new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

export interface RunOrderView {
  club: { id: string } & ClubView;
  /** In walk-out order. */
  players: TunnelPlayer[];
  /** Per locked line, that category's values, per player in walk-out order. */
  values: number[][];
}

const isLine = (x: unknown): x is number[] =>
  Array.isArray(x) && x.length === SIZE && new Set(x).size === SIZE && x.every((i) => Number.isInteger(i) && i >= 0 && i < SIZE);

/** The day as far as the locked lines go. The body is public input, checked; a day is only served from its date (up to UTC tomorrow). */
export async function runOrder(date: unknown, lines: readonly unknown[], now = new Date()): Promise<RunOrderView | null> {
  if (typeof date !== 'string' || date > utcTomorrow(now)) return null;
  const day = RUN.get(date);
  if (!day || lines.length > RUN_ORDER_CATS.length || !lines.every(isLine)) return null;
  const { byId, images, clubs } = await loadData();
  return {
    club: { id: day.club, ...clubView(clubs[day.club] ?? { name: day.club }) },
    players: day.players.map((id) => {
      const p = byId.get(id)!;
      return { id, name: p.name, image: images[id] ?? null, ground: clubColour(signatureClub(p)) };
    }),
    values: lines.map((_, i) => day.values[RUN_ORDER_CATS[i]!]),
  };
}
