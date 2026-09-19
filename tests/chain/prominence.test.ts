import { describe, it, expect } from 'vitest';
import { sharedClubsByProminence, chainLinks } from '../../src/lib/chain/score';
import type { Player } from '../../src/lib/chemistry/types';

const player = (id: string, clubIds: string[], spells: Record<string, [number | null, number | null, number | null]>): Player => ({
  id, name: id, aliases: [], nation: 'Q1', positions: ['FWD'], clubIds, leagueIds: [],
  fame: { value: 50, source: 'sitelinks' }, spells,
});

describe('the club that made the link', () => {
  // Wikidata listed the B team first. The club a fan would say is the one
  // both players actually played for.
  const messi = player('messi', ['Q10467', 'Q7156'], { Q10467: [22, 1, 2005], Q7156: [520, 17, 2021] });
  const deulofeu = player('deulofeu', ['Q10467', 'Q7156', 'Q5794'], { Q10467: [60, 3, 2013], Q7156: [12, 1, 2014], Q5794: [50, 2, 2017] });

  it('ranks shared clubs by combined appearances', () => {
    expect(sharedClubsByProminence(messi, deulofeu)).toEqual(['Q7156', 'Q10467']);
  });

  it('is what the link names', () => {
    const pool = new Map([[messi.id, messi], [deulofeu.id, deulofeu]]);
    const [link] = chainLinks([messi.id, deulofeu.id], pool, 'clubs');
    expect(link!.clubs[0]).toBe('Q7156');
  });

  it('treats a missing spell as no appearances', () => {
    const bare = player('bare', ['Q7156', 'Q10467'], {});
    expect(sharedClubsByProminence(bare, messi)).toEqual(['Q7156', 'Q10467']);
  });
});
