import { describe, it, expect } from 'vitest';
import { plateMarks, shareLine } from '../../src/lib/chain/share';

describe('shareLine', () => {
  it('is the title and one glyph per plate, and nothing about who was on them', () => {
    expect(shareLine({ title: 'Chain #4', plates: ['held', 'held', 'held'] })).toBe('Chain #4\n🟩🟩🟩');
  });
  it('says a plate held with a hint in yellow, and still counts it as held', () => {
    expect(shareLine({ title: 'Chain #4', plates: ['held', 'hinted', 'held'] })).toBe('Chain #4\n🟩🟨🟩');
  });
  it('says how far a broken chain got', () => {
    expect(shareLine({ title: 'Chain #4', plates: ['held', 'missed', 'hinted'] })).toBe('Chain #4\n🟩🟥🟨 broken (2/3)');
  });
});

describe('plateMarks', () => {
  it('marks a held plate as hinted only when a hint was taken on it', () => {
    const slots = [{ index: 1, held: true }, { index: 3, held: false }, { index: 5, held: true }];
    expect(plateMarks(slots, [5])).toEqual(['held', 'missed', 'hinted']);
    expect(plateMarks(slots, [3])).toEqual(['held', 'missed', 'held']);
  });
});
