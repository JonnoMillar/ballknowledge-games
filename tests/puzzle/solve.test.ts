import { describe, it, expect } from 'vitest';
import { enumerateSolutions } from '../../src/lib/puzzle/solve';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board, Formation } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

// A deliberately tiny 3-slot formation keeps the search space checkable by hand.
const TINY: Formation = {
  id: 'tiny',
  slots: [
    { id: 'A', position: 'GK', x: 0, y: 0 },
    { id: 'B', position: 'DEF', x: 0, y: 0 },
    { id: 'C', position: 'DEF', x: 0, y: 0 },
  ],
  adjacency: [['A', 'B'], ['B', 'C']],
};

const mk = (id: string, nation: string, clubs: string[], pos: Player['positions']): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: pos,
  fame: { value: 50, source: 'sitelinks' },
});

const gk = mk('gk', 'BRA', ['LIV'], ['GK']);
const d1 = mk('d1', 'NED', ['LIV'], ['DEF']);
const d2 = mk('d2', 'FRA', ['LIV'], ['DEF']);
const d3 = mk('d3', 'JPN', ['URAWA'], ['DEF']);

const pool = new Map([gk, d1, d2, d3].map((p) => [p.id, p]));

const board: Board = {
  id: 't',
  formationId: 'tiny',
  seeded: { A: 'gk' },
  required: { [edgeKey('A', 'B')]: 'green', [edgeKey('B', 'C')]: 'green' },
  referenceSolution: { A: 'gk', B: 'd1', C: 'd2' },
};

describe('enumerateSolutions', () => {
  it('finds every valid arrangement', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    expect(r.count).toBe(2);
    expect(r.truncated).toBe(false);
  });

  it('never places the same player twice', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    for (const sol of r.solutions) {
      expect(new Set(Object.values(sol)).size).toBe(Object.keys(sol).length);
    }
  });

  it('keeps the seeded players fixed', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    for (const sol of r.solutions) expect(sol['A']).toBe('gk');
  });

  it('reports per-slot answer sets drawn from actual solutions', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    expect(new Set(r.answerSets['B'])).toEqual(new Set(['d1', 'd2']));
    expect(r.answerSets['A']).toEqual(['gk']);
  });

  it('flags truncation when the cap is hit', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 1 });
    expect(r.count).toBe(1);
    expect(r.truncated).toBe(true);
  });

  it('returns zero for an unsatisfiable board', () => {
    const impossible: Board = {
      ...board,
      required: { [edgeKey('A', 'B')]: 'hyper', [edgeKey('B', 'C')]: 'hyper' },
    };
    const r = enumerateSolutions(impossible, TINY, pool, { maxSolutions: 100 });
    expect(r.count).toBe(0);
  });

  it('handles the real 4-3-3 without throwing', () => {
    const empty: Board = { id: 'e', formationId: '433', seeded: {}, required: {}, referenceSolution: {} };
    const r = enumerateSolutions(empty, FORMATION_433, pool, { maxSolutions: 5 });
    expect(r.count).toBe(0);
  });
});
