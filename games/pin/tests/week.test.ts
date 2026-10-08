import { describe, expect, it } from 'vitest';
import { planWeek, rankRecent, type Candidate } from '../lib/week';
import type { Spot } from '../lib/pitch';

const c = (slug: string, league: string, matchId: number, xg: number, at: Spot): Candidate => ({ slug, league, matchId, xg, at });

describe('ranking recent goals', () => {
  it('puts the Premier League first, then the lowest xG, one goal a match, never a lazy-pin goal', () => {
    const ranked = rankRecent([
      c('liga-low', 'La_liga', 1, 0.01, { x: 10, y: 25 }),
      c('epl-high', 'EPL', 2, 0.4, { x: 30, y: 4 }),
      c('epl-low', 'EPL', 3, 0.03, { x: 50, y: 22 }),
      c('epl-same-match', 'EPL', 3, 0.02, { x: 20, y: 22 }),
      c('epl-on-the-spot', 'EPL', 4, 0.01, { x: 34, y: 12 }),
    ]);
    expect(ranked.map((r) => r.slug)).toEqual(['epl-same-match', 'epl-high', 'liga-low']);
  });
});

describe('planning a week', () => {
  const at: Record<string, Spot> = { out: { x: 34, y: 30 }, in: { x: 34, y: 5 }, spot1: { x: 34, y: 9 }, spot2: { x: 34, y: 13 } };
  const far = (n: number) => Array.from({ length: n }, (_, i) => c(`r${i}`, 'EPL', i, 0.05, { x: 10, y: 20 }));

  it('gives each day four recent goals and two classics, never reusing a goal', () => {
    const week = planWeek(['2026-10-10', '2026-10-11'], far(8), () => ['out', 'in'], (s) => at[s]!);
    expect(week['2026-10-10']).toEqual(['r0', 'r1', 'out', 'r2', 'r3', 'in']);
    expect(week['2026-10-11']).toEqual(['r4', 'r5', 'out', 'r6', 'r7', 'in']);
  });

  it('swaps a goal in when the board would be unfair', () => {
    const near = Array.from({ length: 4 }, (_, i) => c(`n${i}`, 'EPL', i, 0.05, { x: 34, y: 8 }));
    const week = planWeek(['2026-10-10'], [...near, c('long', 'EPL', 9, 0.02, { x: 5, y: 40 })], () => ['spot1', 'spot2'], (s) => at[s]!);
    expect(week['2026-10-10']).toContain('long');
    expect(week['2026-10-10']).toHaveLength(6);
  });

  it('fails loudly when it runs out of goals', () => {
    expect(() => planWeek(['2026-10-10'], far(3), () => ['out', 'in'], (s) => at[s]!)).toThrow(/Not enough recent goals/);
  });
});
