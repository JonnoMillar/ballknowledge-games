import { describe, it, expect } from 'vitest';
import { linkColour, linkPoints, linkRank, meetsRequirement, FULL_LINK_POINTS } from '../../src/lib/chemistry/link';
import type { PlayerFacts } from '../../src/lib/chemistry/types';

const p = (
  nation: string,
  clubIds: string[],
  leagueIds: string[],
): PlayerFacts => ({ id: 'x', nation, clubIds, leagueIds });

describe('linkColour', () => {
  it('is hyper when club and nation both match', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('ESP', ['RM'], ['LIGA']))).toBe('hyper');
  });

  it('is green on a shared club alone', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('BRA', ['RM'], ['LIGA']))).toBe('green');
  });

  it('is green on nation plus league without a shared club', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('ESP', ['FCB'], ['LIGA']))).toBe('green');
  });

  it('is orange on nation alone', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('ESP', ['MU'], ['PL']))).toBe('orange');
  });

  it('is orange on league alone', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('BRA', ['FCB'], ['LIGA']))).toBe('orange');
  });

  it('is red when nothing is shared', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('BRA', ['MU'], ['PL']))).toBe('red');
  });

  it('matches on any shared club across full careers', () => {
    // Career model: Beckham and Ronaldo link via Real Madrid despite never
    // overlapping. Spec 7.1 accepts this deliberately.
    const beckham = p('ENG', ['MU', 'RM', 'MIL', 'LA', 'PSG'], ['PL', 'LIGA', 'SERIEA', 'MLS', 'L1']);
    const ronaldo = p('POR', ['SPT', 'MU', 'RM', 'JUV'], ['LIGAPT', 'PL', 'LIGA', 'SERIEA']);
    expect(linkColour(beckham, ronaldo)).toBe('green');
  });

  it('is symmetric', () => {
    const a = p('ESP', ['RM'], ['LIGA']);
    const b = p('BRA', ['FCB'], ['LIGA']);
    expect(linkColour(a, b)).toBe(linkColour(b, a));
  });
});

describe('linkPoints', () => {
  it('matches the documented FIFA point table', () => {
    // nothing 0 · league or nation only 1 · league+nation or same club 2 ·
    // same club AND same nation 3. An earlier version scored hyper as 2, which
    // was invented rather than researched.
    expect(linkPoints('red')).toBe(0);
    expect(linkPoints('orange')).toBe(1);
    expect(linkPoints('green')).toBe(2);
    expect(linkPoints('hyper')).toBe(3);
  });

  it('treats green as the full-chemistry level, with hyper as headroom', () => {
    // An all-green squad reaches 100 in FUT; hyper links are never required.
    expect(FULL_LINK_POINTS).toBe(2);
    expect(linkPoints('hyper')).toBeGreaterThan(FULL_LINK_POINTS);
  });
});

describe('linkRank', () => {
  it('ranks hyper above green even though they score the same', () => {
    expect(linkRank('hyper')).toBeGreaterThan(linkRank('green'));
    expect(linkRank('green')).toBeGreaterThan(linkRank('orange'));
    expect(linkRank('orange')).toBeGreaterThan(linkRank('red'));
  });
});

describe('meetsRequirement', () => {
  it('treats required colours as a minimum, not an exact match', () => {
    expect(meetsRequirement('hyper', 'green')).toBe(true);
    expect(meetsRequirement('green', 'green')).toBe(true);
    expect(meetsRequirement('orange', 'green')).toBe(false);
  });

  it('accepts anything when the requirement is any', () => {
    expect(meetsRequirement('red', 'any')).toBe(true);
  });
});
