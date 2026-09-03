import { describe, it, expect } from 'vitest';
import { isValidPlacement, scoreBoard } from '../../src/lib/puzzle/validate';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (
  id: string,
  nation: string,
  clubIds: string[],
  positions: Player['positions'],
): Player => ({
  id, name: id, aliases: [], nation, clubIds,
  leagueIds: clubIds.map((c) => `L_${c}`),
  positions,
  fame: { value: 50, source: 'sitelinks' },
});

const alisson = mk('alisson', 'BRA', ['LIV'], ['GK']);
const vanDijk = mk('vandijk', 'NED', ['LIV'], ['DEF']);
const konate = mk('konate', 'FRA', ['LIV'], ['DEF']);
const stranger = mk('stranger', 'JPN', ['URAWA'], ['DEF']);
const keeper = mk('keeper', 'BRA', ['LIV'], ['GK']);

const pool = new Map<string, Player>(
  [alisson, vanDijk, konate, stranger, keeper].map((p) => [p.id, p]),
);

const board: Board = {
  id: 'test',
  formationId: '433',
  seeded: { GK: 'alisson' },
  required: { [edgeKey('GK', 'LCB')]: 'green', [edgeKey('GK', 'RCB')]: 'green' },
  referenceSolution: { GK: 'alisson', LCB: 'vandijk', RCB: 'konate' },
};

describe('isValidPlacement', () => {
  it('accepts a player satisfying every resolved link', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', vanDijk);
    expect(r.ok).toBe(true);
  });

  it('rejects a player failing a resolved link and names the failing edge', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', stranger);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failedEdges).toContain(edgeKey('GK', 'LCB'));
  });

  it('rejects a position-class mismatch', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', keeper);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('position');
  });

  it('ignores links whose other end is still empty', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', vanDijk);
    expect(r.ok).toBe(true);
  });

  it('rejects placing into an already-filled slot', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'GK', keeper);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('occupied');
  });
});

describe('scoreBoard', () => {
  it('reports zero chemistry for an empty board', () => {
    expect(scoreBoard(FORMATION_433, pool, {}).squadChemistry).toBe(0);
  });

  it('scores only links with both ends filled', () => {
    const s = scoreBoard(FORMATION_433, pool, { GK: 'alisson', LCB: 'vandijk' });
    expect(s.perSlot['GK']).toBe(5);
    expect(s.perSlot['LCB']).toBe(3);
    expect(s.squadChemistry).toBe(8);
  });

  it('does not report the board as solved below the gate', () => {
    expect(scoreBoard(FORMATION_433, pool, { GK: 'alisson' }).solved).toBe(false);
  });
});
