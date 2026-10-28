import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildWorld, clash, composeDay, extend, isGood, problems, addDays, EPOCH } from '../lib/day';
import { stepsOf } from '../lib/rules';
import type { Player } from '../../../src/lib/chemistry/types';

const pool = JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[];
const world = buildWorld(pool, JSON.parse(readFileSync('data/player-views.json', 'utf8')), JSON.parse(readFileSync('games/step/data/ruler.json', 'utf8')).year);

describe('the world', () => {
  it('has enough good steps for a daily (1,166 measured 2026-10-21)', () => {
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
    for (const d of days) for (const s of stepsOf(d)) expect(world.good.get(s.player)?.has(s.club)).toBe(true);
  });

  it('is the same on a rerun', () => {
    expect(extend(world, [], EPOCH, addDays(EPOCH, 89))).toEqual(days);
  });

  it('problems() catches a repeat', () => {
    const tomorrow = { ...days[0]!, date: addDays(days[0]!.date, 1) };
    expect(problems(world, tomorrow, days.slice(0, 1)).length).toBeGreaterThan(0);
  });

  it('keeps steps apart: no shared club either side of a club, no shown answer fits another step, a Premier League club', () => {
    for (const d of days) {
      const seq = d.players.flatMap((p, i) => (d.clubs[i] ? [p, d.clubs[i]!] : [p]));
      expect(clash(world, seq)).toBeNull();
      expect(d.clubs.some((c) => world.english.has(c))).toBe(true);
    }
  });

  it('problems() catches two givens who shared a club either side of one', () => {
    const d = days[0]!;
    const twin = [...world.good.keys()].find((p) => p !== d.players[0]
      && world.byId.get(p)!.clubIds.some((c) => world.byId.get(d.players[0]!)!.clubIds.includes(c)))!;
    const seq = [d.players[0]!, d.clubs[0]!, twin];
    expect(clash(world, seq)).toMatch(/share a club/);
  });

  it('runs two years without a dead end (steps come back after RULES.stepGap days)', () => {
    expect(extend(world, days, EPOCH, addDays(EPOCH, 729))).toHaveLength(730);
  });

  it('a day only depends on what came before it', () => {
    expect(composeDay(world, days.slice(0, 10), days[10]!.date)).toEqual(days[10]);
  });
});
