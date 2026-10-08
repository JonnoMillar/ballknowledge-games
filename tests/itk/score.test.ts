import { describe, expect, it } from 'vitest';
import { roundMark, itkShareLine, tierOf } from '../../src/lib/itk/score';

describe('roundMark', () => {
  it('is held when the first pick is the fake', () => {
    expect(roundMark([true])).toBe('held');
  });
  it('is hinted when the second pick is the fake', () => {
    expect(roundMark([false, true])).toBe('hinted');
  });
  it('is missed after two real picks', () => {
    expect(roundMark([false, false])).toBe('missed');
  });
  it('is null while the round is still open', () => {
    expect(roundMark([])).toBeNull();
    expect(roundMark([false])).toBeNull();
  });
});

describe('tierOf', () => {
  it('gives Tier 1 only for five first-time finds', () => {
    expect(tierOf(['held', 'held', 'held', 'held', 'held'])).toBe('Tier 1');
    expect(tierOf(['held', 'held', 'held', 'held', 'hinted'])).toBe('Tier 2');
  });
  it('steps down as the points go', () => {
    expect(tierOf(['held', 'held', 'hinted', 'missed', 'held'])).toBe('Tier 3');
    expect(tierOf(['hinted', 'hinted', 'missed', 'missed', 'held'])).toBe('Tier 4');
    expect(tierOf(['missed', 'missed', 'missed', 'missed', 'hinted'])).toBe('Parody account');
  });
});

describe('itkShareLine', () => {
  it('carries the day, the grid and the tier, and no names', () => {
    expect(itkShareLine(3, ['held', 'held', 'hinted', 'held', 'missed'])).toBe('ITK #3\n🟩🟩🟨🟩🟥\nTier 3');
  });
});
