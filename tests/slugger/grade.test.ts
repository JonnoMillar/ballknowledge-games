import { describe, it, expect } from 'vitest';
import { BASES_FOR, stintFame } from '../../src/lib/slugger/grade';
import type { Player } from '../../src/lib/chemistry/types';

const kane: Player = {
  id: 'kane', name: 'Harry Kane', aliases: [], nation: 'Q21', positions: ['FWD'],
  clubIds: ['SPURS', 'LEICESTER'], leagueIds: [],
  fame: { value: 96, source: 'sitelinks' },
  spells: { SPURS: [317, 10, 2023], LEICESTER: [13, 1, 2013] },
};

describe('a hit is worth the pitch', () => {
  it('fastball single, curveball double, slider triple, knuckleball home run', () => {
    expect(BASES_FOR).toEqual({ fastball: 1, curveball: 2, slider: 3, knuckleball: 4 });
  });
});

describe('the ruler the deck is tiered with', () => {
  it('rates the fact, not the name: Kane at Leicester is a footnote', () => {
    expect(stintFame(kane, 'SPURS', 2026)).toBe(96);
    expect(stintFame(kane, 'LEICESTER', 2026)).toBeLessThan(30);
    expect(stintFame({ ...kane, spells: undefined }, 'SPURS')).toBe(96);
  });
});
