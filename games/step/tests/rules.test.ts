import { describe, expect, it } from 'vitest';
import { atClub, barOf, factOf, fieldOf, judge, knownOf, linkOf, runGrade, shareLine, stepsOf, stintWeight, CURRENT_STINT, ERA_FLOOR, ERA_FULL, PLAIN, STEPS, type Lens, type Ruler, type Views } from '../lib/rules';
import type { Player, Spell } from '../../../src/lib/chemistry/types';

const player = (id: string, clubIds: string[], fame: number, spells: Record<string, Spell> = {}): Player => ({
  id, name: id, aliases: [], nation: 'Q1', clubIds, leagueIds: [], positions: ['MID'],
  fame: { value: fame, source: 'sitelinks' }, spells,
});

// The given is at A and B; the step's club is C.
const given = player('P', ['A', 'B'], 95);
const famous = player('famous', ['A', 'C'], 90);
const middling = player('middling', ['B', 'C'], 50);
const stranger = player('stranger', ['C'], 80); // never shared a club with P
const deep = player('deep', ['A', 'C'], 35);
const members = [famous, middling, stranger, deep, given];
// English Wikipedia views: the ruler's fame. Sitelinks above are only the fallback.
const views: Views = { P: 5e6, famous: 2e6, middling: 2e5, stranger: 1e6, deep: 3e4 };
// A bar every fact clears: grades by the field alone.
const OPEN: Ruler = { ...PLAIN, bar: [0, 0, 0, 0] };
const barred = (bar: Ruler['bar']): Ruler => ({ ...PLAIN, bar });

describe('stepsOf', () => {
  it('alternates player-first and club-first, carrying each club over', () => {
    const steps = stepsOf({ players: ['P1', 'P2', 'P3'], clubs: ['C1', 'C2'] });
    expect(steps).toEqual([
      { player: 'P1', club: 'C1', playerFirst: true },
      { player: 'P2', club: 'C1', playerFirst: false },
      { player: 'P2', club: 'C2', playerFirst: true },
      { player: 'P3', club: 'C2', playerFirst: false },
    ]);
    expect(steps).toHaveLength(STEPS);
  });
});

describe('fieldOf', () => {
  it('is everyone at the club who shared any club with the given', () => {
    expect(fieldOf(given, members).map((p) => p.id).sort()).toEqual(['deep', 'famous', 'middling']);
  });
});

describe('factOf', () => {
  const now = new Date().getFullYear();

  it('weighs the stint at the club as well as the link to the given', () => {
    // Twenty years at A, three games at C long ago: the club half is the obscure one.
    const loanee = player('loanee', ['A', 'C'], 90, { A: [400, 20, now], C: [3, 1, now - 30] });
    const v = { ...views, loanee: 2e6 };
    expect(factOf(loanee, given, 'C', v)).toBeLessThan(factOf(famous, given, 'C', v) * 0.1);
  });

  it("measures fame by English Wikipedia views, not sitelinks", () => {
    // Same sitelinks; one is known in England, one mostly elsewhere.
    const local = player('local', ['A', 'C'], 60);
    const abroad = player('abroad', ['A', 'C'], 60);
    const v = { ...views, local: 3e6, abroad: 3e5 };
    expect(factOf(local, given, 'C', v)).toBeGreaterThan(factOf(abroad, given, 'C', v));
  });

  it("a famous given's short stint does not bury the link: it is known because they are", () => {
    // The given's season at A; the pick's long spells at A and at C.
    const star = player('star', ['A', 'B'], 100, { A: [16, 1, now - 27], B: [250, 8, now - 19] });
    const legend = player('legend', ['A', 'C'], 90, { A: [140, 5, now - 31], C: [94, 5, now - 36] });
    const local = player('local', ['B', 'C'], 55, { B: [60, 2, now - 37], C: [53, 3, now - 37] });
    const v = { star: 5e6, legend: 1.6e6, local: 1.3e5 };
    expect(factOf(legend, star, 'C', v)).toBeGreaterThan(factOf(local, star, 'C', v));
  });

  it('links through the best known shared club, and names it', () => {
    // Shared A (a cameo each) and B (long spells each): B is the link.
    const x = player('x', ['A', 'B', 'C'], 60, { A: [2, 1, now - 3], B: [200, 6, now - 2] });
    const g = player('g', ['A', 'B'], 90, { A: [1, 1, now - 1], B: [150, 5, now - 2] });
    expect(linkOf(x, g, { x: 1e6, g: 4e6 }).club).toBe('B');
  });

  it('a player with no English page falls back on sitelinks', () => {
    expect(knownOf(player('x', [], 80), {})).toBeGreaterThan(knownOf(player('y', [], 40), {}));
    expect(knownOf(player('z', [], 80), { z: 0 })).toBe(knownOf(player('x', [], 80), {}));
  });
});

describe('the lens', () => {
  const year = 2026;
  const lens: Lens = { year, reach: { far: 0.2 } };
  const v = { old: 2e6, now: 2e6 };

  it('fades a stint and a career that ended long ago, never past the floor', () => {
    const old = player('old', ['C'], 80, { C: [200, 8, year - 25] });
    const now = player('now', ['C'], 80, { C: [200, 8, year - 2] });
    expect(atClub(now, 'C', v, lens)).toBe(atClub(now, 'C', v, PLAIN));
    expect(atClub(old, 'C', v, lens)).toBeLessThan(atClub(now, 'C', v, lens) * 0.5);
    expect(atClub(player('ancient', ['C'], 80, { C: [200, 8, 1960] }), 'C', { ancient: 2e6 }, lens)).toBeCloseTo(knownOf(old, v) * ERA_FLOOR);
  });

  it(`keeps a stint ended within ${ERA_FULL} years whole`, () => {
    const p = player('old', ['C'], 80, { C: [200, 8, year - ERA_FULL] });
    expect(atClub(p, 'C', v, lens)).toBe(atClub(p, 'C', v, PLAIN));
  });

  it('a current stint is news however few games it has had; an ended one is not', () => {
    expect(atClub(player('now', ['C'], 80, { C: [2, 1, year] }), 'C', v, lens)).toBeCloseTo(knownOf(player('now', [], 80), v) * CURRENT_STINT);
    expect(atClub(player('now', ['C'], 80, { C: [2, 1, year - 1] }), 'C', v, lens)).toBeCloseTo(knownOf(player('now', [], 80), v) * stintWeight([2, 1, year - 1]));
  });

  it("weighs a stint by its club's reach", () => {
    const p = player('now', ['C', 'far'], 80, { C: [200, 8, year], far: [200, 8, year] });
    expect(atClub(p, 'far', v, lens)).toBeCloseTo(atClub(p, 'C', v, lens) * 0.2);
  });
});

describe('judge', () => {
  it('a pick that never shared a club with the given does not hold', () => {
    const j = judge(stranger, given, 'C', members, views, OPEN);
    expect(j.held).toBe(false);
    expect(j.grade).toBeNull();
  });

  it('a pick that never played for the club does not hold', () => {
    const j = judge(player('elsewhere', ['A'], 60), given, 'C', members, views, OPEN);
    expect(j.held).toBe(false);
  });

  it('the most famous answer is Basic; the field is graded by fact', () => {
    const j = judge(famous, given, 'C', members, views, OPEN);
    expect(j).toMatchObject({ held: true, grade: 'basic', via: 'A' });
    expect(judge(deep, given, 'C', members, views, OPEN).grade).toBe('sharp');
  });

  it('names the obvious and the deepest checkable answers, whatever was picked', () => {
    const j = judge(stranger, given, 'C', members, views, OPEN);
    expect(j.obvious?.id).toBe('famous');
    expect(j.elite?.id).toBe('deep');
  });

  it('Elite needs a field of eight or more', () => {
    const wide = [...members, ...Array.from({ length: 6 }, (_, i) => player(`w${i}`, ['A', 'C'], 60 + i))];
    expect(judge(deep, given, 'C', wide, views, OPEN).grade).toBe('elite');
    expect(judge(deep, given, 'C', members, views, OPEN).grade).not.toBe('elite');
  });
});

describe('stintWeight', () => {
  const now = new Date().getFullYear();
  it('is the length of the stint, recent or not: ten games this year are ten games', () => {
    expect(stintWeight([10, 1, now])).toBe(stintWeight([10, 1, now - 20]));
    expect(stintWeight([10, 1, now])).toBeCloseTo(10 / 50);
    expect(stintWeight([300, 10, now - 30])).toBe(1);
  });
  it('leaves missing data neutral and never weighs nothing', () => {
    expect(stintWeight(undefined)).toBe(1);
    expect(stintWeight([null, null, now])).toBe(1);
    expect(stintWeight([0, 1, now])).toBe(0.05);
  });
});

describe('the absolute bar', () => {
  it('sits at the best known 3%, 10%, 25% and 60% of a population of facts', () => {
    const facts = Array.from({ length: 100 }, (_, i) => 100 - i); // 100 .. 1
    expect(barOf(facts)).toEqual([97, 90, 75, 40]);
  });

  it('under the last cut is Elite, whatever the field says', () => {
    expect(judge(deep, given, 'C', members, views, barred([1e9, 1e9, 1e9, 1e9])).grade).toBe('elite');
  });

  it("deepens the best known answer of an obscure step: top of its field, short of the site's bar", () => {
    expect(judge(famous, given, 'C', members, views, OPEN).grade).toBe('basic');
    expect(judge(famous, given, 'C', members, views, barred([5e6, 1e6, 1e5, 0])).grade).toBe('solid');
  });

  it('never makes a grade shallower than the field gives', () => {
    expect(judge(deep, given, 'C', members, views, OPEN).grade).toBe('sharp');
  });
});

describe('runGrade', () => {
  it('is the average rounded down: an Elite run is four Elites', () => {
    expect(runGrade(['elite', 'elite', 'elite', 'elite'])).toBe('elite');
    expect(runGrade(['elite', 'elite', 'elite', 'sharp'])).toBe('sharp');
    expect(runGrade(['basic', 'decent', 'solid', 'sharp'])).toBe('decent'); // 10 / 4
  });

  it('a miss counts nothing, but anything that held is at least Basic', () => {
    expect(runGrade(['sharp', null, null, null])).toBe('basic');
    expect(runGrade(['elite', 'elite', null, null])).toBe('decent'); // 10 / 4
  });

  it('is nothing when nothing held', () => {
    expect(runGrade([null, null, null, null])).toBeNull();
  });
});

describe('shareLine', () => {
  it('a glyph per step and the run, never a name', () => {
    expect(shareLine(26, ['sharp', null, 'basic', 'elite'])).toBe('Step #26 · Ball knowledge: Decent\n🟦🟥🟫🏆');
    expect(shareLine(3, [null, null, null, null])).toBe('Step #3 · Ball knowledge: none\n🟥🟥🟥🟥');
  });
});
