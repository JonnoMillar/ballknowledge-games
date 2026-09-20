import { describe, it, expect } from 'vitest';
import { basesFor, stintFame } from '../../src/lib/slugger/grade';
import type { Player } from '../../src/lib/chemistry/types';

const kane: Player = {
  id: 'kane', name: 'Harry Kane', aliases: [], nation: 'Q21', positions: ['FWD'],
  clubIds: ['SPURS', 'LEICESTER', 'BAYERN'], leagueIds: [],
  fame: { value: 96, source: 'sitelinks' },
  spells: { SPURS: [317, 10, 2023], LEICESTER: [13, 1, 2013], BAYERN: [60, 2, 2026] },
};

describe('a hit is graded by the fame of the fact', () => {
  it('Kane at Tottenham is a single; Kane at Leicester is a home run', () => {
    expect(basesFor(stintFame(kane, 'SPURS', 2026))).toBe(1);
    expect(basesFor(stintFame(kane, 'LEICESTER', 2026))).toBe(4);
    expect(basesFor(stintFame(kane, 'BAYERN', 2026))).toBe(1);
  });

  it('the bands meet at their edges', () => {
    expect(basesFor(55)).toBe(1);
    expect(basesFor(54.9)).toBe(2);
    expect(basesFor(38)).toBe(2);
    expect(basesFor(37.9)).toBe(3);
    expect(basesFor(26)).toBe(3);
    expect(basesFor(25.9)).toBe(4);
    expect(basesFor(0)).toBe(4);
  });

  it('a stint with no record is graded on fame alone', () => {
    expect(stintFame({ ...kane, spells: undefined }, 'SPURS')).toBe(96);
  });
});
