import { describe, expect, it } from 'vitest';
import { bands, EPOCH, extend, hash, seeded, toRound, addDays, gapFloor } from '../lib/day';
import { fakeOptions, type Fake } from '../lib/fakes';
import { problems } from '../lib/check';
import { buildWorld, median, RULES, type Career } from '../lib/world';
import { readInputs } from '../../../scripts/itk/inputs';

const career = (views: number, id = `Q${views}`): Career => ({
  id, name: id, views, photoYear: null, player: {} as Career['player'],
  stops: [{ q: 'A', from: 2010, loan: false, apps: 90, ret: false }, { q: 'B', from: 2013, loan: true, apps: 20, ret: false }, { q: 'C', from: 2015, loan: false, apps: 60, ret: false }],
});

describe('the day helpers', () => {
  it('seeds from a string, the same every time', () => {
    expect(hash('itk:2026-10-14')).toBe(hash('itk:2026-10-14'));
    const a = seeded('x'), b = seeded('x');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seeded('y')()).not.toBe(seeded('x')());
  });

  it('splits the pool 20/40/40 by views, most viewed first', () => {
    const b = bands(Array.from({ length: 10 }, (_, i) => career((i + 1) * 1e5)));
    expect(b.map((x) => x.length)).toEqual([2, 4, 4]);
    expect(b[0]!.map((c) => c.views)).toEqual([1e6, 9e5]);
  });

  it('a swap replaces the stop and keeps its loan tag; an insert adds one', () => {
    const c = career(1e6);
    const swap: Fake = { mode: 'swap', kind: 'loan', index: 1, club: 'X', year: 2013, loan: true, real: 'B', score: 1, both: true };
    expect(toRound(c, swap)).toMatchObject({ fake: 1, real: 'B', stops: [{ club: 'A' }, { club: 'X', year: 2013, loan: true }, { club: 'C' }] });
    const ins: Fake = { mode: 'insert', kind: 'insert', index: 2, club: 'X', year: 2014, loan: false, score: 1, both: false };
    const r = toRound(c, ins);
    expect(r.stops.map((s) => s.club)).toEqual(['A', 'B', 'X', 'C']);
    expect(r.real).toBeUndefined();
  });

  it('never lets a band come round sooner than 80% of pool ÷ 5', () => {
    expect(gapFloor(229)).toBe(36);
  });
});

// The real pool, as the cron sees it.
const world = buildWorld(readInputs());

describe('fakes on the real pool', () => {
  it('every option keeps the guards fans asked for', () => {
    const bad: string[] = [];
    for (const c of world.eligible) {
      const own = world.owned(c.id);
      const cap = median(c.stops.map((s) => world.clubViews(s.q)));
      for (const f of fakeOptions(world, c, new Set(), seeded(c.id)).values()) {
        const why = [
          own.has(f.club) && 'a club he played for',
          world.giants.has(f.club) && 'a giant',
          world.clubViews(f.club) > cap && 'bigger than his median club',
          !world.known(f.club) && 'unknown',
        ].filter(Boolean);
        if (f.mode === 'swap') {
          const X = c.stops[f.index]!, A = c.stops[f.index - 1], B = c.stops[f.index + 1];
          if (world.clubViews(X.q) >= RULES.marquee) why.push('swapped a marquee club');
          if (X.apps >= RULES.bigSpell) why.push('swapped a big spell');
          if (A && B && world.clubViews(A.q) >= RULES.marquee && world.clubViews(B.q) >= RULES.marquee) why.push('between two marquee moves');
          if (c.photoYear != null && c.photoYear >= X.from && (!B || c.photoYear < B.from)) why.push('swapped the photo');
        }
        if (why.length) bad.push(`${c.name} → ${f.club}: ${why.join(', ')}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('a schedule from scratch', () => {
  const run = () => extend(world, [], EPOCH, addDays(EPOCH, 89));
  const days = run();

  it('keeps every promise for 90 days', () => {
    expect(days).toHaveLength(90);
    expect(days.flatMap((d, i) => problems(world, d, days.slice(0, i)))).toEqual([]);
  });

  it('is the same every time it runs', () => {
    expect(extend(world, days.slice(0, 10), EPOCH, addDays(EPOCH, 19))).toEqual(days.slice(0, 20));
  });
}, 120_000);
