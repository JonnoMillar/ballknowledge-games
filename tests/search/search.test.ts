import { describe, it, expect } from 'vitest';
import { buildIndex, search } from '../../src/lib/search/index';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, name: string, aliases: string[] = []): Player => ({
  id, name, aliases, nation: 'X', clubIds: [], leagueIds: [],
  positions: ['FWD'], fame: { value: 50, source: 'sitelinks' },
});

const players = [
  mk('a', 'Martin Ødegaard'),
  mk('b', 'Erling Haaland'),
  mk('c', 'Vinícius Júnior', ['Vini Jr']),
  mk('d', 'Son Heung-min'),
  mk('e', 'Philippe Sandler'),
];
const index = buildIndex(players);

describe('search', () => {
  it('returns NOTHING for an empty query', () => {
    // The pool is searched, never listed. An empty query must never enumerate
    // candidates — that would hand over the answers.
    expect(search(index, '')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });

  it('folds diacritics', () => {
    expect(search(index, 'odegaard').map((p) => p.id)).toContain('a');
    expect(search(index, 'vinicius').map((p) => p.id)).toContain('c');
  });

  it('matches aliases', () => {
    expect(search(index, 'vini jr').map((p) => p.id)).toContain('c');
  });

  it('matches on surname', () => {
    expect(search(index, 'haaland').map((p) => p.id)).toContain('b');
  });

  it('is case insensitive', () => {
    expect(search(index, 'SANDLER').map((p) => p.id)).toContain('e');
  });

  it('handles hyphenated names', () => {
    expect(search(index, 'heung').map((p) => p.id)).toContain('d');
  });

  it('folds atomic letters that NFD cannot decompose', () => {
    // Ø is a single codepoint, not O + stroke, so NFD leaves it and the
    // non-ASCII strip would delete it: "Ødegaard" -> "degaard".
    const extra = buildIndex([
      mk('x', 'Martin Ødegaard'),
      mk('y', 'Łukasz Fabiański'),
      mk('z', 'Aleksandar Đorđević'),
    ]);
    expect(search(extra, 'odegaard').map((p) => p.id)).toContain('x');
    expect(search(extra, 'lukasz').map((p) => p.id)).toContain('y');
    expect(search(extra, 'fabianski').map((p) => p.id)).toContain('y');
    expect(search(extra, 'dordevic').map((p) => p.id)).toContain('z');
  });

  it('caps results', () => {
    expect(search(index, 'a', 3).length).toBeLessThanOrEqual(3);
  });
});

describe('search ranking', () => {
  it('puts a surname typed on its own above a name that merely contains it', () => {
    const extra = buildIndex([
      mk('musaev', 'Fozil Musaev'),
      mk('ozil', 'Mesut Özil'),
      mk('ozilx', 'Ozilio Santos'),
    ]);
    expect(search(extra, 'ozil').map((p) => p.id)).toEqual(['ozilx', 'ozil', 'musaev']);
  });
});
