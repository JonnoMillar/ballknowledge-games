import { describe, expect, it } from 'vitest';
import { lazyScore, nextTier, packScore, points, ring, shareText, tier } from '../lib/score';

describe('rings', () => {
  it('has a 2 m bullseye, then 5 and 10', () => {
    expect(ring(2)).toBe('bullseye');
    expect(ring(2.01)).toBe('inner');
    expect(ring(5)).toBe('inner');
    expect(ring(5.01)).toBe('outer');
    expect(ring(10)).toBe('outer');
    expect(ring(10.01)).toBe('miss');
  });
});

describe('points', () => {
  it('gives 100 inside the bullseye and decays after', () => {
    expect(points(0)).toBe(100);
    expect(points(2)).toBe(100);
    expect(points(3)).toBe(88);
    expect(points(5)).toBe(69);
    expect(points(10)).toBe(37);
    expect(points(20)).toBe(11);
  });
});

describe('the pack score', () => {
  it('is the mean of the points, rounded down', () => {
    // 100 + 88 + 69 = 257, a mean of 85.67.
    expect(packScore([1, 3, 5])).toBe(85);
    expect(packScore([0, 0])).toBe(100);
  });
  it('makes the lazy pin the pack score of every goal pinned on the penalty spot', () => {
    expect(lazyScore([{ x: 34, y: 11 }, { x: 34, y: 14 }, { x: 34, y: 16 }])).toBe(packScore([0, 3, 5]));
  });
});

describe('tiers', () => {
  it('has five, on fixed floors', () => {
    expect([0, 39, 40, 59, 60, 74, 75, 89, 90, 100].map(tier)).toEqual([
      'wide', 'wide', 'close', 'close', 'sharp', 'sharp', 'deadly', 'deadly', 'pinpoint', 'pinpoint',
    ]);
  });
  it('says how far off the next tier is, and nothing at the top', () => {
    expect(nextTier(79)).toEqual({ tier: 'pinpoint', gap: 11 });
    expect(nextTier(0)).toEqual({ tier: 'close', gap: 40 });
    expect(nextTier(74)).toEqual({ tier: 'deadly', gap: 1 });
    expect(nextTier(90)).toBeNull();
  });
});

describe('the share text', () => {
  it('names nothing: the pack, the score and tier, one mark a goal', () => {
    expect(shareText("September's Goal of the Month", [1, 3, 4, 12, 6, 5.4])).toBe(
      "Pitch pin · September's Goal of the Month\n70 Sharp\n🎯🟩🟩⬜🟨🟨",
    );
  });
});
