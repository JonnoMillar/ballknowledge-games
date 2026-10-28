import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { judgePick, loadDay, playable } from '../server';
import { addDays, buildWorld, daysBetween, EPOCH, problems, type StoredDay } from '../lib/day';
import { fieldOf, stepsOf } from '../lib/rules';
import type { Player } from '../../../src/lib/chemistry/types';
import config from '../../../next.config';

const days = JSON.parse(readFileSync('games/step/data/days.json', 'utf8')) as StoredDay[];
const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const world = buildWorld(pool, JSON.parse(readFileSync('data/player-views.json', 'utf8')), JSON.parse(readFileSync('games/step/data/ruler.json', 'utf8')).year);

describe('playable', () => {
  const now = new Date(`${EPOCH}T23:00:00Z`);
  it('takes day 1 and tomorrow, refuses before the epoch, past tomorrow and junk', () => {
    expect(playable(EPOCH, now)).toBe(true);
    expect(playable(addDays(EPOCH, 1), now)).toBe(true);
    expect(playable(addDays(EPOCH, 2), now)).toBe(false);
    expect(playable(addDays(EPOCH, -1), now)).toBe(false);
    for (const bad of ['2026-02-30', '../days', '', 20261014, null]) expect(playable(bad, now)).toBe(false);
  });
});

describe('the committed schedule', () => {
  it('starts on day 1 and runs one date after another', () => {
    expect(days[0]?.date).toBe(EPOCH);
    days.forEach((d, i) => expect(daysBetween(EPOCH, d.date)).toBe(i));
  });

  it('every day still to be played keeps its promises', () => {
    const today = new Date().toISOString().slice(0, 10);
    const bad = days.flatMap((d, i) => (d.date >= today ? problems(world, d, days.slice(0, i)) : []));
    expect(bad).toEqual([]);
  });

  it('covers today and tomorrow (UTC), so the hub link never lands on an empty day', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const d of [today, addDays(today, 1)]) expect(days.some((x) => x.date === d), d).toBe(true);
  });

  it('is traced into the serverless build, or every request is an ENOENT', () => {
    expect(config.outputFileTracingIncludes?.['/**']).toContain('./games/step/data/days.json');
    expect(config.outputFileTracingIncludes?.['/**']).toContain('./games/step/data/ruler.json');
    expect(config.outputFileTracingIncludes?.['/**']).toContain('./data/player-views.json');
  });

  it('the ruler is current for the pool and the year (npm run step:days rewrites it)', () => {
    expect(JSON.parse(readFileSync('games/step/data/ruler.json', 'utf8'))).toEqual(world.ruler);
  });
});

describe('the wire', () => {
  const d = days[0]!;
  const step = stepsOf(d)[0]!;
  const field = fieldOf(world.byId.get(step.player)!, world.byClub.get(step.club)!);

  it('a day names its givens and clubs and no one else', async () => {
    const day = await loadDay(d.date);
    expect(day?.steps).toHaveLength(4);
    const ids = [...JSON.stringify(day).matchAll(/"id":"(Q\d+)"/g)].map((m) => m[1]);
    for (const id of ids) expect([...d.players, ...d.clubs]).toContain(id);
  });

  it('a pick that fits is graded, with both clubs on its card', async () => {
    const v = await judgePick(d.date, 0, field[0]!.id, []);
    expect(v?.held).toBe(true);
    expect(v?.grade).not.toBeNull();
    expect(v?.pick.clubs?.[1].id).toBe(step.club);
    expect(v?.elite).not.toBeNull();
    expect(v?.obvious).not.toBeNull();
  });

  it('a pick that does not fit holds nothing', async () => {
    const outsider = pool.find((p) => !p.clubIds.includes(step.club) && !d.players.includes(p.id))!;
    expect(await judgePick(d.date, 0, outsider.id, [])).toMatchObject({ held: false, grade: null });
  });

  it('refuses a repeat, a given, a bad step and an unknown player', async () => {
    expect(await judgePick(d.date, 1, field[0]!.id, [field[0]!.id])).toBeNull();
    expect(await judgePick(d.date, 0, d.players[1]!, [])).toBeNull();
    expect(await judgePick(d.date, 4, field[0]!.id, [])).toBeNull();
    expect(await judgePick(d.date, 0, 'Q0', [])).toBeNull();
    expect(await judgePick('2020-01-01', 0, field[0]!.id, [])).toBeNull();
  });
});
