import { describe, it, expect } from 'vitest';
import { initChain, chainReduce } from '../../src/game/chainState';
import type { ChainPuzzle } from '../../src/lib/chain/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, nation: string, clubs: string[]): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: ['MID'],
  fame: { value: 50, source: 'sitelinks' },
});

const a = mk('a', 'BRA', ['CITY']);
const b = mk('b', 'JPN', ['CITY', 'ROMA']);
const c = mk('c', 'ITA', ['ROMA']);
const stranger = mk('stranger', 'KOR', ['URAWA']);
const pool = new Map([a, b, c, stranger].map((p) => [p.id, p]));

const puzzle: ChainPuzzle = { id: 't', slots: ['a', null, 'c'] };
const s0 = initChain(puzzle, pool);

describe('init', () => {
  it('starts with the givens in place and the blanks empty', () => {
    expect(s0.filled).toEqual(['a', null, 'c']);
    expect(s0.library).toEqual([]);
    expect(s0.submitted).toBe(false);
  });
});

describe('placement is never refused', () => {
  it('accepts a player who links nothing at all', () => {
    // This is the point of the mode: a player who does not link just leaves
    // that link ungreen. Blocking the drop would hide what the player is
    // trying to find out.
    const s = chainReduce(s0, { type: 'place', index: 1, playerId: 'stranger' });
    expect(s.filled[1]).toBe('stranger');
  });

  it('accepts a valid bridge', () => {
    expect(chainReduce(s0, { type: 'place', index: 1, playerId: 'b' }).filled[1]).toBe('b');
  });
});

describe('a player holds at most one slot', () => {
  it('refuses a player who is already a given', () => {
    // Moving vacates the slot a player came from, but a given cannot be
    // vacated — so falling through would put them on two slots at once and
    // let them link to themselves.
    expect(chainReduce(s0, { type: 'place', index: 1, playerId: 'a' })).toBe(s0);
    expect(chainReduce(s0, { type: 'place', index: 1, playerId: 'c' })).toBe(s0);
  });

  it('refuses a given even from the far end of a longer chain', () => {
    const long: ChainPuzzle = { id: 't5', slots: ['a', null, 'c', null, 'stranger'] };
    const l0 = initChain(long, pool);
    expect(chainReduce(l0, { type: 'place', index: 3, playerId: 'a' })).toBe(l0);
  });

  it('still allows moving a player the user placed themselves', () => {
    const long: ChainPuzzle = { id: 't5', slots: ['a', null, 'c', null, 'stranger'] };
    let s = chainReduce(initChain(long, pool), { type: 'place', index: 1, playerId: 'b' });
    s = chainReduce(s, { type: 'place', index: 3, playerId: 'b' });
    expect(s.filled.filter((id) => id === 'b')).toHaveLength(1);
    expect(s.filled[3]).toBe('b');
  });
});

describe('given slots', () => {
  it('cannot be replaced', () => {
    expect(chainReduce(s0, { type: 'place', index: 0, playerId: 'b' })).toBe(s0);
  });

  it('cannot be emptied', () => {
    expect(chainReduce(s0, { type: 'unplace', index: 0 })).toBe(s0);
  });
});

describe('moving between slots', () => {
  const long: ChainPuzzle = { id: 't5', slots: ['a', null, 'c', null, 'a'] };
  const l0 = initChain(long, pool);

  it('never leaves a duplicate behind', () => {
    let s = chainReduce(l0, { type: 'place', index: 1, playerId: 'b' });
    s = chainReduce(s, { type: 'place', index: 3, playerId: 'b' });
    expect(s.filled[1]).toBeNull();
    expect(s.filled[3]).toBe('b');
  });

  it('sends the displaced player to the bench', () => {
    let s = chainReduce(l0, { type: 'place', index: 1, playerId: 'b' });
    s = chainReduce(s, { type: 'place', index: 1, playerId: 'stranger' });
    expect(s.filled[1]).toBe('stranger');
    expect(s.library).toEqual(['b']);
  });
});

describe('bench', () => {
  it('takes a player back when a slot is emptied', () => {
    let s = chainReduce(s0, { type: 'place', index: 1, playerId: 'b' });
    s = chainReduce(s, { type: 'unplace', index: 1 });
    expect(s.filled[1]).toBeNull();
    expect(s.library).toEqual(['b']);
  });

  it('does not hold a player who is on the chain', () => {
    let s = chainReduce(s0, { type: 'library/add', playerId: 'b' });
    s = chainReduce(s, { type: 'place', index: 1, playerId: 'b' });
    expect(s.library).toEqual([]);
  });

  it('refuses a player already placed', () => {
    const s = chainReduce(s0, { type: 'library/add', playerId: 'a' });
    expect(s.library).toEqual([]);
  });
});

describe('out of range', () => {
  it('is ignored rather than growing the chain', () => {
    expect(chainReduce(s0, { type: 'place', index: 9, playerId: 'b' })).toBe(s0);
    expect(chainReduce(s0, { type: 'place', index: -1, playerId: 'b' })).toBe(s0);
  });
});

describe('submit', () => {
  it('is refused while any link is ungreen', () => {
    const s = chainReduce(s0, { type: 'place', index: 1, playerId: 'stranger' });
    expect(chainReduce(s, { type: 'submit' }).submitted).toBe(false);
  });

  it('locks the chain in once every link is green', () => {
    const s = chainReduce(s0, { type: 'place', index: 1, playerId: 'b' });
    expect(chainReduce(s, { type: 'submit' }).submitted).toBe(true);
  });

  it('freezes the chain afterwards', () => {
    let s = chainReduce(s0, { type: 'place', index: 1, playerId: 'b' });
    s = chainReduce(s, { type: 'submit' });
    expect(chainReduce(s, { type: 'unplace', index: 1 })).toBe(s);
  });
});
