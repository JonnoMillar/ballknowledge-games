import { describe, it, expect } from 'vitest';
import { chainSlotDepths } from '../../src/lib/chain/score';
import { chainResult } from '../../src/lib/chain/result';
import type { ChainPuzzle } from '../../src/lib/chain/types';
import type { Player, Spell } from '../../src/lib/chemistry/types';

/**
 * The Kane problem. Fame alone ranks him bottom of any field; the 13 games
 * at Leicester are the whole reason a chain through them deserves credit.
 */
const mk = (id: string, clubs: string[], fame: number, spells: Record<string, Spell>): Player => ({
  id, name: id, aliases: [], nation: id.toUpperCase(), clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: ['FWD'],
  fame: { value: fame, source: 'sitelinks' }, spells,
});

const maguire = mk('maguire', ['LEI', 'MUN'], 70, { LEI: [76, 3], MUN: [150, 5] });
const son = mk('son', ['TOT'], 80, { TOT: [300, 9] });
// Bridges Maguire to Son via Leicester (13 apps) and Spurs (317).
const kane = mk('kane', ['LEI', 'TOT'], 96, { LEI: [13, 1], TOT: [317, 14] });
// Same fame, same clubs, but a proper stint at both — the fact is common knowledge.
const twin = mk('twin', ['LEI', 'TOT'], 96, { LEI: [200, 6], TOT: [200, 6] });
// Far less famous, full stints at both.
const journeyman = mk('journeyman', ['LEI', 'TOT'], 30, { LEI: [120, 4], TOT: [90, 3] });

const players = [maguire, son, kane, twin, journeyman];
const pool = new Map(players.map((p) => [p.id, p]));

describe('spell-weighted depth', () => {
  it('ranks a short stint above a long one at equal fame', () => {
    const fill = ['maguire', 'kane', 'son'];
    const given = ['maguire', null, 'son'];
    const d = chainSlotDepths(fill, given, players, pool, 'clubs')[1]!;
    const t = chainSlotDepths(['maguire', 'twin', 'son'], given, players, pool, 'clubs')[1]!;
    expect(d.fieldSize).toBe(3);
    expect(d.rank).toBeLessThan(t.rank!);
    expect(d.score).toBeGreaterThan(t.score);
    // Twin is the most famous fact in the field; Kane is not last.
    expect(t.rank).toBe(3);
  });

  it('lets a famous name beat a journeyman when the route is obscure enough', () => {
    // Kane at 96 × 0.26 ≈ 25 is below the journeyman at 30 × 1.
    const given = ['maguire', null, 'son'];
    const k = chainSlotDepths(['maguire', 'kane', 'son'], given, players, pool, 'clubs')[1]!;
    expect(k.rank).toBe(1);
    expect(k.score).toBe(100);
  });

  it('scores the route the same whichever end is the given', () => {
    // Kane given, Maguire placed: Maguire's Leicester spell is full but the
    // route still runs through Kane's 13 games, so Maguire gets the discount.
    const rival = mk('rival', ['LEI', 'MUN'], 70, { LEI: [200, 6], MUN: [150, 5] });
    const ps = [...players, rival];
    const pl = new Map(ps.map((p) => [p.id, p]));
    const given = ['kane', null];
    const m = chainSlotDepths(['kane', 'maguire'], given, ps, pl, 'clubs')[1]!;
    const r = chainSlotDepths(['kane', 'rival'], given, ps, pl, 'clubs')[1]!;
    // Both link via Leicester at the same fame; the discount is Kane's end,
    // so both are equally obscure — and neither is plain-fame.
    expect(m.rank).toBe(r.rank);
  });

  it('holds the famous name up on the wall when its route is the deepest', () => {
    const puzzle: ChainPuzzle = { id: 't', mode: 'clubs', slots: ['maguire', null, 'son'] };
    const r = chainResult(['maguire', 'journeyman', 'son'], puzzle, players, pool);
    expect(r.slots[0]!.best!.id).toBe('kane');
    expect(r.pinboard[0]!.id).toBe('kane');
    expect(r.pinboard[0]!.score).toBe(100);
  });
});
