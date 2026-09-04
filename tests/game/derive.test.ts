import { describe, it, expect } from 'vitest';
import { initState, reduce } from '../../src/game/state';
import { linkViews, canDrop } from '../../src/game/derive';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, nation: string, clubs: string[], pos: Player['positions']): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: pos,
  fame: { value: 50, source: 'sitelinks' },
});
const d1 = mk('d1', 'NED', ['CITY'], ['DEF']);
const d2 = mk('d2', 'ESP', ['CITY'], ['DEF']);
const odd = mk('odd', 'JPN', ['URAWA'], ['DEF']);
const pool = new Map([d1, d2, odd].map((p) => [p.id, p]));

const board: Board = {
  id: 't', formationId: '433',
  seeded: { LB: 'd1' },
  required: { [edgeKey('LB', 'LCB')]: 'green', [edgeKey('LCB', 'RCB')]: 'green' },
  referenceSolution: { LB: 'd1', LCB: 'd2' },
};
const s0 = initState(board, FORMATION_433, pool);

describe('linkViews', () => {
  const views = linkViews(s0);
  const get = (a: string, b: string) => views.find((v) => v.key === edgeKey(a, b))!;

  it('marks a link touching a filled slot as required-but-unmet', () => {
    expect(get('LB', 'LCB').status).toBe('required');
    expect(get('LB', 'LCB').colour).toBe('green');
  });

  it('marks a link with both ends empty as hidden', () => {
    // Spec 4.1: a link is inert until one end is solved.
    expect(get('LCB', 'RCB').status).toBe('hidden');
  });

  it('marks a link with both ends filled as earned', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    expect(linkViews(s).find((x) => x.key === edgeKey('LB', 'LCB'))!.status).toBe('earned');
  });

  it('covers every edge in the formation', () => {
    expect(views).toHaveLength(FORMATION_433.adjacency.length);
  });
});

describe('canDrop', () => {
  it('allows a legal drop', () => { expect(canDrop(s0, 'LCB', d2)).toBe(true); });
  it('refuses an illegal one', () => { expect(canDrop(s0, 'LCB', odd)).toBe(false); });
  it('refuses a seeded slot', () => { expect(canDrop(s0, 'LB', d2)).toBe(false); });
});
