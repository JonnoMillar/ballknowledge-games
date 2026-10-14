import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildWorld, composeDay, extend, isGood, problems, addDays, EPOCH } from '../lib/day';
import { stepsOf } from '../lib/rules';
import type { Player } from '../../../src/lib/chemistry/types';

const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const world = buildWorld(pool);

describe('the world', () => {
  it('has enough good steps for a daily (1,643 measured 2026-10-14)', () => {
    const steps = [...world.good.values()].reduce((n, s) => n + s.size, 0);
    expect(steps).toBeGreaterThan(1000);
  });

  it('never makes a step out of a club the given played for', () => {
    for (const [p, clubs] of world.good) for (const c of clubs) expect(world.byId.get(p)!.clubIds).not.toContain(c);
  });
});

describe('the schedule', () => {
  const days = extend(world, [], EPOCH, addDays(EPOCH, 89));

  it('builds ninety days from scratch that keep every promise', () => {
    expect(days).toHaveLength(90);
    const bad = days.flatMap((d, i) => problems(world, d, days.slice(0, i)));
    expect(bad).toEqual([]);
  });

  it('every step of every day is good', () => {
    for (const d of days) for (const s of stepsOf(d)) expect(isGood(world, world.byId.get(s.player)!, s.club)).toBe(true);
  });

  it('is the same on a rerun', () => {
    expect(extend(world, [], EPOCH, addDays(EPOCH, 89))).toEqual(days);
  });

  it('problems() catches a repeat', () => {
    const tomorrow = { ...days[0]!, date: addDays(days[0]!.date, 1) };
    expect(problems(world, tomorrow, days.slice(0, 1)).length).toBeGreaterThan(0);
  });

  it('a day only depends on what came before it', () => {
    expect(composeDay(world, days.slice(0, 10), days[10]!.date)).toEqual(days[10]);
  });
});
