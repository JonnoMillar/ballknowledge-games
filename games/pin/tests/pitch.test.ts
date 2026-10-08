import { describe, expect, it } from 'vitest';
import { clamp, distance, fromStatsBomb, fromUnderstat, inArea, inHalf, mirror, mirrorNote, SPOT } from '../lib/pitch';

// The four goals of Leicester v Manchester United, both meetings in 2015/16,
// as each source has them: StatsBomb location, Understat X and Y.
const shared = [
  { who: 'Vardy', sb: [107.8, 53], us: [0.894, 0.295] },
  { who: 'Schweinsteiger', sb: [114.7, 38.8], us: [0.953, 0.515] },
  { who: 'Martial', sb: [112.9, 28.3], us: [0.930, 0.661] },
  { who: 'Morgan', sb: [113.5, 44.5], us: [0.940, 0.435] },
] as const;

describe('converting the sources', () => {
  it('puts the goal line at y = 0 and the middle at x = 34', () => {
    expect(fromStatsBomb(120, 40)).toEqual({ x: 34, y: 0 });
    const u = fromUnderstat(1, 0.5);
    expect(u.x).toBeCloseTo(34);
    expect(u.y).toBeCloseTo(0);
  });

  it('puts Carlos Alberto 1970, a right back arriving late, right of centre', () => {
    const s = fromStatsBomb(107.5, 57.5);
    expect(s.x).toBeCloseTo(48.9, 1);
    expect(s.y).toBeCloseTo(10.9, 1);
  });

  it('has the two sources within 3 m of each other on the same goals', () => {
    for (const g of shared) {
      const d = distance(fromStatsBomb(g.sb[0], g.sb[1]), fromUnderstat(g.us[0], g.us[1]));
      expect(d, g.who).toBeLessThan(3);
    }
  });

  it('flips Understat across: Martial is on the attacker\'s left in both', () => {
    expect(fromStatsBomb(112.9, 28.3).x).toBeLessThan(34);
    expect(fromUnderstat(0.930, 0.661).x).toBeLessThan(34);
  });
});

describe('geometry', () => {
  it('measures straight-line metres', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it('mirrors left to right', () => {
    expect(mirror({ x: 10, y: 7 })).toEqual({ x: 58, y: 7 });
  });
  it('clamps to the half and knows what is in it', () => {
    expect(clamp({ x: -2, y: 60 })).toEqual({ x: 0, y: 52.5 });
    expect(inHalf({ x: -0.1, y: 3 })).toBe(false);
    expect(inHalf({ x: 68, y: 52.5 })).toBe(true);
  });
  it('knows the penalty area', () => {
    expect(inArea(SPOT)).toBe(true);
    expect(inArea({ x: 34, y: 17 })).toBe(false);
    expect(inArea({ x: 13, y: 10 })).toBe(false);
  });
});

describe('the wrong-side note', () => {
  it('fires when the pin is near the mirror image', () => {
    expect(mirrorNote({ x: 20, y: 10 }, { x: 48, y: 10 })).toBe(0);
  });
  it('stays quiet on a near miss', () => {
    expect(mirrorNote({ x: 36, y: 10 }, { x: 34, y: 8 })).toBeNull();
  });
  it('stays quiet when the mirror is no closer', () => {
    expect(mirrorNote({ x: 34, y: 30 }, { x: 34, y: 10 })).toBeNull();
  });
});
