import { describe, it, expect } from 'vitest';
import { spellWeight, factFame, FLOOR } from '../../src/lib/fame/spell';
import type { Player, Spell } from '../../src/lib/chemistry/types';

const mk = (id: string, fame: number, clubs: string[], spells?: Record<string, Spell>): Player => ({
  id, name: id, aliases: [], nation: 'X', clubIds: clubs, leagueIds: [],
  positions: ['FWD'], fame: { value: fame, source: 'sitelinks' }, spells,
});

// `OLD` is long enough ago — against NOW here, and against the real calendar
// in the factFame tests below — that recency has fully faded and length
// alone decides.
const NOW = 2026;
const OLD = 2000;

describe('spellWeight', () => {
  it('saturates at fifty appearances', () => {
    expect(spellWeight([50, null, OLD], NOW)).toBe(1);
    expect(spellWeight([317, 14, OLD], NOW)).toBe(1);
  });
  it('scales a short stint down linearly', () => {
    expect(spellWeight([13, 1, OLD], NOW)).toBeCloseTo(0.26);
    expect(spellWeight([25, null, OLD], NOW)).toBe(0.5);
  });
  it('never drops below the floor', () => {
    expect(spellWeight([0, 1, OLD], NOW)).toBe(FLOOR);
    expect(spellWeight([1, 1, OLD], NOW)).toBe(FLOOR);
  });
  it('estimates from years when the count is missing', () => {
    expect(spellWeight([null, 1, OLD], NOW)).toBe(0.5);   // 25 apps a season
    expect(spellWeight([null, 2, OLD], NOW)).toBe(1);
  });
  it('is neutral when Wikidata is silent', () => {
    expect(spellWeight([null, null, null], NOW)).toBe(1);
    expect(spellWeight([null, null, OLD], NOW)).toBe(1);
    expect(spellWeight(undefined, NOW)).toBe(1);
  });

  describe('recency', () => {
    it('makes a current stint fully known whatever its length', () => {
      // Gordon at Barcelona: three games, this season.
      expect(spellWeight([3, null, NOW], NOW)).toBe(1);
      expect(spellWeight([0, 1, NOW - 1], NOW)).toBe(1);
      expect(spellWeight([0, 1, NOW - 2], NOW)).toBe(1);
    });
    it('fades linearly over the decade after that', () => {
      expect(spellWeight([3, 1, NOW - 7], NOW)).toBeCloseTo(0.5);
      expect(spellWeight([0, 1, NOW - 12], NOW)).toBe(FLOOR);
    });
    it('takes the better of length and recency', () => {
      // Long ago but a long stint: length carries it.
      expect(spellWeight([200, 6, NOW - 20], NOW)).toBe(1);
      // Recent-ish and short: recency carries it.
      expect(spellWeight([5, 1, NOW - 4], NOW)).toBeCloseTo(0.8);
    });
    it('is neutral when the stint is undated, even with a count', () => {
      // A just-announced transfer is an undated stint with few apps.
      expect(spellWeight([3, null, null], NOW)).toBe(1);
    });
  });
});

describe('factFame', () => {
  // Kane: 96 famous, 13 games at Leicester, 317 at Spurs.
  const kane = mk('kane', 96, ['leicester', 'spurs'], { leicester: [13, 1, OLD], spurs: [317, 14, NOW] });
  // Maguire: 70 famous, 76 games at Leicester.
  const maguire = mk('maguire', 70, ['leicester', 'united'], { leicester: [76, 2, OLD], united: [150, 5, NOW] });
  // A Spurs team-mate, fully known both ends.
  const son = mk('son', 80, ['spurs'], { spurs: [300, 9, NOW] });

  it('is plain fame with no sides', () => {
    expect(factFame(kane, [], 'clubs')).toBe(96);
  });

  it('discounts a link that runs through a short stint', () => {
    expect(factFame(kane, [{ player: maguire }], 'clubs')).toBeCloseTo(96 * 0.26);
  });

  it('takes the weaker end of the shared club', () => {
    // Maguire's Leicester spell is full; Kane's is the weak end.
    expect(factFame(maguire, [{ player: kane }], 'clubs')).toBeCloseTo(70 * 0.26);
  });

  it('applies the same weight whichever end is the given', () => {
    const a = factFame(kane, [{ player: maguire }], 'clubs') / kane.fame.value;
    const b = factFame(maguire, [{ player: kane }], 'clubs') / maguire.fame.value;
    expect(a).toBeCloseTo(b);
  });

  it('takes the easiest shared club when there are several', () => {
    const both = mk('both', 50, ['leicester', 'spurs'], { leicester: [5, 1, OLD], spurs: [200, 6, NOW] });
    // Through Spurs the route is fully known; the Leicester stint does not help.
    expect(factFame(both, [{ player: kane }], 'clubs')).toBe(50);
  });

  it('honours a prescribed club over easier shared ones', () => {
    const both = mk('both', 50, ['leicester', 'spurs'], { leicester: [5, 1, OLD], spurs: [200, 6, NOW] });
    expect(factFame(both, [{ player: kane, club: 'leicester' }], 'clubs')).toBeCloseTo(50 * 0.1);
  });

  it('takes the harder of two sides', () => {
    // Kane between Maguire (Leicester, 0.26) and Son (Spurs, 1).
    expect(factFame(kane, [{ player: maguire }, { player: son }], 'clubs')).toBeCloseTo(96 * 0.26);
  });

  it('treats a nation-and-league link as fully known', () => {
    const stranger = mk('stranger', 40, ['elsewhere']);
    expect(factFame(kane, [{ player: stranger }], 'chemistry')).toBe(96);
  });

  it('is neutral for a player with no spell data', () => {
    const blank = mk('blank', 60, ['leicester']);
    expect(factFame(blank, [{ player: maguire }], 'clubs')).toBe(60);
    expect(factFame(maguire, [{ player: blank }], 'clubs')).toBe(70);
  });
});
