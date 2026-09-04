import { describe, it, expect } from 'vitest';
import { initState, reduce } from '../../src/game/state';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, nation: string, clubs: string[], pos: Player['positions']): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: pos,
  fame: { value: 50, source: 'sitelinks' },
});

const gk = mk('gk', 'BRA', ['CITY'], ['GK']);
const d1 = mk('d1', 'NED', ['CITY'], ['DEF']);
const d2 = mk('d2', 'ESP', ['CITY'], ['DEF']);
const odd = mk('odd', 'JPN', ['URAWA'], ['DEF']);
const pool = new Map([gk, d1, d2, odd].map((p) => [p.id, p]));

const board: Board = {
  id: 't', formationId: '433',
  seeded: { LB: 'd1' },
  required: { [edgeKey('LB', 'LCB')]: 'green' },
  referenceSolution: { LB: 'd1', LCB: 'd2' },
};

const s0 = initState(board, FORMATION_433, pool);

describe('library', () => {
  it('starts empty', () => { expect(s0.library).toEqual([]); });

  it('adds a player', () => {
    expect(reduce(s0, { type: 'library/add', playerId: 'd2' }).library).toEqual(['d2']);
  });

  it('does not add the same player twice', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'library/add', playerId: 'd2' });
    expect(s.library).toEqual(['d2']);
  });

  it('has no size limit', () => {
    let s = s0;
    // d1 is seeded at LB, so it is legitimately refused — a player already on
    // the pitch cannot also sit on the bench.
    for (const p of [gk, d2, odd]) s = reduce(s, { type: 'library/add', playerId: p.id });
    expect(s.library.length).toBe(3);
  });

  it('refuses to bench a player already on the pitch', () => {
    expect(reduce(s0, { type: 'library/add', playerId: 'd1' }).library).toEqual([]);
  });

  it('removes a player', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'library/remove', playerId: 'd2' });
    expect(s.library).toEqual([]);
  });
});

describe('placement', () => {
  it('places a legal player and takes them out of the library', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    expect(s.placed['LCB']).toBe('d2');
    expect(s.library).toEqual([]);
  });

  it('refuses an illegal placement and says which link failed', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LCB', playerId: 'odd' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.lastRejection?.slotId).toBe('LCB');
    expect(s.lastRejection?.failedEdges).toContain(edgeKey('LB', 'LCB'));
  });

  it('refuses a position-class mismatch', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LCB', playerId: 'gk' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.lastRejection?.reason).toBe('position');
  });

  it('never places over a seeded slot', () => {
    expect(reduce(s0, { type: 'place', slotId: 'LB', playerId: 'd2' }).placed['LB']).toBe('d1');
  });

  it('un-places back to the library, at no cost', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    s = reduce(s, { type: 'unplace', slotId: 'LCB' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.library).toContain('d2');
  });

  it('un-placing a seeded slot does nothing', () => {
    expect(reduce(s0, { type: 'unplace', slotId: 'LB' }).placed['LB']).toBe('d1');
  });

  it('moving between slots vacates the origin', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'RCB', playerId: 'd2' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.placed['RCB']).toBe('d2');
  });
});

describe('submission', () => {
  it('is not submitted at the start', () => { expect(s0.submitted).toBe(false); });

  it('refuses to submit an incomplete XI', () => {
    expect(reduce(s0, { type: 'submit' }).submitted).toBe(false);
  });

  it('experimenting costs nothing — there is no guess budget', () => {
    let s = s0;
    for (let i = 0; i < 50; i++) s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'odd' });
    expect(s.submitted).toBe(false);
    expect(s).not.toHaveProperty('guessesLeft');
  });
});
