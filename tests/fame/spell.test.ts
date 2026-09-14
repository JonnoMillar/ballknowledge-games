import { describe, it, expect } from 'vitest';
import { spellWeight, factFame, FLOOR } from '../../src/lib/fame/spell';
import type { Player, Spell } from '../../src/lib/chemistry/types';

const mk = (id: string, fame: number, clubs: string[], spells?: Record<string, Spell>): Player => ({
  id, name: id, aliases: [], nation: 'X', clubIds: clubs, leagueIds: [],
  positions: ['FWD'], fame: { value: fame, source: 'sitelinks' }, spells,
});

describe('spellWeight', () => {
  it('saturates at fifty appearances', () => {
    expect(spellWeight([50, null])).toBe(1);
    expect(spellWeight([317, 14])).toBe(1);
  });
  it('scales a short stint down linearly', () => {
    expect(spellWeight([13, 1])).toBeCloseTo(0.26);
    expect(spellWeight([25, null])).toBe(0.5);
  });
  it('never drops below the floor', () => {
    expect(spellWeight([0, 1])).toBe(FLOOR);
    expect(spellWeight([1, 1])).toBe(FLOOR);
  });
  it('estimates from years when the count is missing', () => {
    expect(spellWeight([null, 1])).toBe(0.5);   // 25 apps a season
    expect(spellWeight([null, 2])).toBe(1);
  });
  it('is neutral when Wikidata is silent', () => {
    expect(spellWeight([null, null])).toBe(1);
    expect(spellWeight(undefined)).toBe(1);
  });
});

describe('factFame', () => {
  // Kane: 96 famous, 13 games at Leicester, 317 at Spurs.
  const kane = mk('kane', 96, ['leicester', 'spurs'], { leicester: [13, 1], spurs: [317, 14] });
  // Maguire: 70 famous, 76 games at Leicester.
  const maguire = mk('maguire', 70, ['leicester', 'united'], { leicester: [76, 2], united: [150, 5] });
  // A Spurs team-mate, fully known both ends.
  const son = mk('son', 80, ['spurs'], { spurs: [300, 9] });

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
    const both = mk('both', 50, ['leicester', 'spurs'], { leicester: [5, 1], spurs: [200, 6] });
    // Through Spurs the route is fully known; the Leicester stint does not help.
    expect(factFame(both, [{ player: kane }], 'clubs')).toBe(50);
  });

  it('honours a prescribed club over easier shared ones', () => {
    const both = mk('both', 50, ['leicester', 'spurs'], { leicester: [5, 1], spurs: [200, 6] });
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
