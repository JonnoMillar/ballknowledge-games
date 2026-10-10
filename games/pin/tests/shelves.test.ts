import { describe, expect, it } from 'vitest';
import { isNew, shelve } from '../lib/shelves';
import type { Pack, PackKind } from '../lib/types';

const p = (id: string, kind: PackKind, published: string, season?: string): Pack =>
  ({ id, kind, title: id, subtitle: '', published, goals: [], ...(season ? { season } : {}) });

describe('shelve', () => {
  it('puts this season first, then a shelf a kind', () => {
    const packs = [
      p('classic-b', 'classic', '2026-10-09'),
      p('classic-a', 'classic', '2026-10-08'),
      p('club-z', 'club', '2026-10-09'),
      p('club-a', 'club', '2026-10-09'),
      p('gotm-winners-2019-20', 'season', '2026-10-09', '2019-20'),
      p('gotm-winners-2024-25', 'season', '2026-10-09', '2024-25'),
      p('pl-old', 'round', '2026-05-20', '2025-26'),
      p('gotm-2026-08', 'month', '2026-09-12', '2026-27'),
      p('pl-a', 'round', '2026-09-15', '2026-27'),
      p('pl-b', 'round', '2026-10-06', '2026-27'),
    ];
    expect(shelve(packs).map((s) => [s.title, s.packs.map((x) => x.id)])).toEqual([
      ['This season', ['pl-b', 'pl-a', 'gotm-2026-08']],
      ['Classics', ['classic-a', 'classic-b']],
      ['By season', ['gotm-winners-2024-25', 'gotm-winners-2019-20']],
      ['By club', ['club-a', 'club-z']],
      ['Earlier', ['pl-old']],
    ]);
  });
  it('leaves an empty shelf out', () => {
    expect(shelve([p('classic-a', 'classic', '2026-10-08')]).map((s) => s.title)).toEqual(['Classics']);
  });
});

describe('isNew', () => {
  it('lasts a week from publishing, for round and month packs only', () => {
    expect(isNew(p('r', 'round', '2026-10-06', '2026-27'), '2026-10-09')).toBe(true);
    expect(isNew(p('m', 'month', '2026-10-06', '2026-27'), '2026-10-12')).toBe(true);
    expect(isNew(p('r', 'round', '2026-10-06', '2026-27'), '2026-10-13')).toBe(false);
    expect(isNew(p('c', 'classic', '2026-10-09'), '2026-10-09')).toBe(false);
    expect(isNew(p('s', 'season', '2026-10-09', '2019-20'), '2026-10-09')).toBe(false);
  });
  it('is not new before it is published', () => {
    expect(isNew(p('r', 'round', '2026-10-10', '2026-27'), '2026-10-09')).toBe(false);
  });
});
