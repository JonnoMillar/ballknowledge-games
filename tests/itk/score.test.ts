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
  it('gives Fabrizio only for five first-time finds', () => {
    expect(tierOf(['held', 'held', 'held', 'held', 'held'])).toBe('Fabrizio');
  });
  it('puts a podium of Fabrizio, Agent and Scout on 10, 9 and 8', () => {
    expect(tierOf(['held', 'held', 'held', 'held', 'hinted'])).toBe('Agent');
    expect(tierOf(['held', 'held', 'held', 'held', 'missed'])).toBe('Scout');
  });
  it('bands the rest: Pundit 5-7, Casual 2-4, Mascot 0-1', () => {
    expect(tierOf(['held', 'held', 'hinted', 'held', 'missed'])).toBe('Pundit');
    expect(tierOf(['hinted', 'hinted', 'hinted', 'hinted', 'hinted'])).toBe('Pundit');
    expect(tierOf(['held', 'hinted', 'hinted', 'missed', 'missed'])).toBe('Casual');
    expect(tierOf(['held', 'missed', 'missed', 'missed', 'missed'])).toBe('Casual');
    expect(tierOf(['missed', 'missed', 'missed', 'missed', 'hinted'])).toBe('Mascot');
    expect(tierOf(['missed', 'missed', 'missed', 'missed', 'missed'])).toBe('Mascot');
  });
});

describe('itkShareLine', () => {
  it('carries the day, the grid and the tier, and no names', () => {
    expect(itkShareLine(3, ['held', 'held', 'hinted', 'held', 'missed'])).toBe('ITK #3\n🟩🟩🟨🟩🟥\nPundit');
  });
});
