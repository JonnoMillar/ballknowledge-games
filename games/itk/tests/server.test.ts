import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { judgePick, loadDay, playable } from '../server';
import { EPOCH, addDays, daysBetween, type StoredDay } from '../lib/day';
import { problems } from '../lib/check';
import { buildWorld } from '../lib/world';
import { readInputs } from '../../../scripts/itk/inputs';
import config from '../../../next.config';

const days = JSON.parse(readFileSync('games/itk/data/days.json', 'utf8')) as StoredDay[];

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
    const world = buildWorld(readInputs());
    const today = new Date().toISOString().slice(0, 10);
    const bad = days.flatMap((d, i) => (d.date >= today ? problems(world, d, days.slice(0, i)) : []));
    expect(bad).toEqual([]);
  });
});

describe('the wire', () => {
  const date = days[0]!.date;
  it('a day carries no answer', async () => {
    const day = await loadDay(date);
    expect(day?.rounds).toHaveLength(5);
    const json = JSON.stringify(day);
    expect(json).not.toMatch(/"fake"|"real"|"kind"|"mode"/);
  });

  it('a wrong first pick says nothing about where the fake is', async () => {
    const r = days[0]!.rounds[0]!;
    const wrong = r.fake === 0 ? 1 : 0;
    expect(await judgePick(date, 0, wrong, false)).toEqual({ fake: false, fakeIndex: null, real: null });
    expect(await judgePick(date, 0, r.fake, false)).toMatchObject({ fake: true, fakeIndex: r.fake });
    expect(await judgePick(date, 0, 99, false)).toBeNull();
  });
});

describe('a game is ready to play', () => {
  it('the schedule covers today and tomorrow (UTC), so the hub link never lands on an empty day', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const d of [today, addDays(today, 1)]) expect(days.some((x) => x.date === d), d).toBe(true);
  });

  it('the schedule file is traced into the serverless build, or every request is an ENOENT', () => {
    expect(config.outputFileTracingIncludes?.['/**']).toContain('./games/itk/data/days.json');
  });
});
