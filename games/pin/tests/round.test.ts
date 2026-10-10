import { describe, expect, it } from 'vitest';
import { fair, pickRound, rankRecent, type Candidate } from '../lib/round';
import type { Spot } from '../lib/pitch';

const c = (slug: string, matchId: number, xg: number, at: Spot): Candidate => ({ slug, matchId, xg, at });
const OUT: Spot = { x: 10, y: 20 }; // 25.6 m from the spot, outside the area
const IN: Spot = { x: 20, y: 5 }; // 15.2 m from the spot, inside the area

describe('fair', () => {
  it('rejects a pack the lazy pin coasts', () => {
    expect(fair(Array.from({ length: 6 }, () => ({ x: 34, y: 9 })))).toBe(false);
  });
  it('wants goals from in and out of the area', () => {
    expect(fair(Array.from({ length: 6 }, () => ({ x: 34, y: 30 })))).toBe(false);
    expect(fair([{ x: 34, y: 30 }, { x: 34, y: 30 }, { x: 34, y: 30 }, { x: 10, y: 5 }, { x: 34, y: 5 }, { x: 34, y: 5 }])).toBe(true);
  });
  it('keeps the lazy pin under 60', () => {
    // Four on the edge of the bullseye (100 each) and two out at 19 m (12 each): 70.
    const coasts: Spot[] = [...Array.from({ length: 4 }, () => ({ x: 34, y: 13 })), { x: 34, y: 30 }, { x: 34, y: 30 }];
    expect(fair(coasts)).toBe(false);
    // 7.5 m from the spot each, three in the area and three out: 50.
    const six: Spot[] = [{ x: 34, y: 18.5 }, { x: 34, y: 18.5 }, { x: 34, y: 18.5 }, { x: 34, y: 3.5 }, { x: 34, y: 3.5 }, { x: 34, y: 3.5 }];
    expect(fair(six)).toBe(true);
  });
});

describe('ranking recent goals', () => {
  it('puts the lowest xG first and drops goals the lazy pin would land on', () => {
    const ranked = rankRecent([
      c('high', 2, 0.4, { x: 30, y: 4 }),
      c('low', 3, 0.03, { x: 50, y: 22 }),
      c('lower', 3, 0.02, { x: 20, y: 22 }),
      c('on-the-spot', 4, 0.01, { x: 34, y: 12 }),
    ]);
    expect(ranked.map((r) => r.slug)).toEqual(['lower', 'low', 'high']);
  });
});

describe('picking a round', () => {
  it('takes the first goal of each match in rank order when that is fair', () => {
    const ranked = [
      c('a', 1, 0.01, OUT), c('a2', 1, 0.02, IN), c('b', 2, 0.03, OUT), c('c', 3, 0.04, OUT),
      c('d', 4, 0.05, IN), c('e', 5, 0.06, IN), c('f', 6, 0.07, IN), c('g', 7, 0.08, IN),
    ];
    expect(pickRound(ranked).map((p) => p.slug)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('swaps in a later goal, a second goal from a match included, to make it fair', () => {
    const ranked = [
      ...Array.from({ length: 6 }, (_, i) => c(`out${i}`, i, 0.01 * (i + 1), OUT)),
      c('in-from-match-9', 9, 0.3, IN),
    ];
    const picks = pickRound(ranked);
    expect(picks).toHaveLength(6);
    expect(picks.map((p) => p.slug)).toContain('in-from-match-9');
    expect(new Set(picks.map((p) => p.matchId)).size).toBe(6);
  });
  it('never puts two goals from one match in a pack', () => {
    const ranked = [
      ...Array.from({ length: 6 }, (_, i) => c(`out${i}`, i, 0.01 * (i + 1), OUT)),
      c('in-from-match-0', 0, 0.3, IN),
    ];
    // The only goal inside the area shares match 0; swapping it in for out0 is the one legal move.
    expect(pickRound(ranked).map((p) => p.slug)).toEqual(['in-from-match-0', 'out1', 'out2', 'out3', 'out4', 'out5']);
  });
  it('fails loudly when there are too few matches or nothing fair', () => {
    expect(() => pickRound(Array.from({ length: 5 }, (_, i) => c(`g${i}`, i, 0.1, OUT)))).toThrow(/Only 5 matches/);
    expect(() => pickRound(Array.from({ length: 7 }, (_, i) => c(`g${i}`, i, 0.1, OUT)))).toThrow(/No fair pack/);
  });
});
