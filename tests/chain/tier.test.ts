import { describe, it, expect } from 'vitest';
import { tierFor, depthRead, shareLine } from '../../src/lib/chain/tier';

describe('the tier a pick earns', () => {
  it('calls the famous end a banker and the deep end a deep cut', () => {
    expect(tierFor(16, 16)).toBe('banker');
    expect(tierFor(15, 16)).toBe('banker');
    expect(tierFor(8, 16)).toBe('shout');
    expect(tierFor(1, 16)).toBe('deep');
    expect(tierFor(4, 16)).toBe('deep');
    expect(tierFor(5, 16)).toBe('shout');
  });

  it('treats the only way in as a deep cut', () => {
    expect(tierFor(1, 1)).toBe('deep');
  });

  it('splits a field of two', () => {
    expect(tierFor(1, 2)).toBe('deep');
    expect(tierFor(2, 2)).toBe('banker');
  });

  it('reads nothing into a pick that did not link', () => {
    expect(depthRead(null)).toBeNull();
    expect(depthRead({ score: 0, rank: null, fieldSize: 16 })).toBeNull();
    expect(depthRead({ score: 63, rank: 7, fieldSize: 16 })).toMatchObject({ tier: 'shout', deeperThan: 9, fieldSize: 16 });
  });
});

describe('the share line', () => {
  it('shows links and gems on a held scored chain', () => {
    expect(shareLine({ title: 'Chain #4', links: [true, true, true], tiers: ['deep', 'banker'] }))
      .toBe('Chain #4\n🟩🟩🟩 💎⚪');
  });

  it('shows no gems on a completion board', () => {
    expect(shareLine({ title: 'Chain #4', links: [true, true], tiers: [] })).toBe('Chain #4\n🟩🟩');
  });

  it('says broken and how many held', () => {
    expect(shareLine({ title: 'Chain #4', links: [true, false, true], tiers: ['deep', null] }))
      .toBe('Chain #4\n🟩🟥🟩 broken (2/3)');
  });
});
