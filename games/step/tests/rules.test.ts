import { describe, expect, it } from 'vitest';
import { factOf, fieldOf, judge, runGrade, shareLine, stepsOf, STEPS } from '../lib/rules';
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
  it('weighs the stint at the club as well as the link to the given', () => {
    const now = new Date().getFullYear();
    // Twenty years at A, three games at C long ago: the club half is the obscure one.
    const loanee = player('loanee', ['A', 'C'], 90, { A: [400, 20, now], C: [3, 1, now - 30] });
    expect(factOf(loanee, given, 'C')).toBeLessThan(90 * 0.1);
    expect(factOf(famous, given, 'C')).toBe(90);
  });
});

describe('judge', () => {
  it('a pick that never shared a club with the given does not hold', () => {
    const j = judge(stranger, given, 'C', members);
    expect(j.held).toBe(false);
    expect(j.grade).toBeNull();
  });

  it('a pick that never played for the club does not hold', () => {
    const j = judge(player('elsewhere', ['A'], 60), given, 'C', members);
    expect(j.held).toBe(false);
  });

  it('the most famous answer is Basic; the field is graded by fact', () => {
    const j = judge(famous, given, 'C', members);
    expect(j).toMatchObject({ held: true, grade: 'basic', via: 'A' });
    expect(judge(deep, given, 'C', members).grade).toBe('sharp');
  });

  it('names the obvious and the deepest checkable answers, whatever was picked', () => {
    const j = judge(stranger, given, 'C', members);
    expect(j.obvious?.id).toBe('famous');
    expect(j.elite?.id).toBe('deep');
  });

  it('Elite needs a field of eight or more', () => {
    const wide = [...members, ...Array.from({ length: 6 }, (_, i) => player(`w${i}`, ['A', 'C'], 60 + i))];
    expect(judge(deep, given, 'C', wide).grade).toBe('elite');
    expect(judge(deep, given, 'C', members).grade).not.toBe('elite');
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
    expect(shareLine(26, ['sharp', null, 'basic', 'elite'])).toBe('Step #26 · Ball knowledge: Armchair\n🟦🟥🟫🏆');
    expect(shareLine(3, [null, null, null, null])).toBe('Step #3 · Ball knowledge: none\n🟥🟥🟥🟥');
  });
});
