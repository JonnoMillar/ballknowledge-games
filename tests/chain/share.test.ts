import { describe, it, expect } from 'vitest';
import { shareLine } from '../../src/lib/chain/share';

describe('shareLine', () => {
  it('is the title and the links, and nothing about who was on them', () => {
    expect(shareLine({ title: 'Chain #4', links: [true, true, true] })).toBe('Chain #4\n🟩🟩🟩');
  });
  it('says how far a broken chain got', () => {
    expect(shareLine({ title: 'Chain #4', links: [true, false, true] })).toBe('Chain #4\n🟩🟥🟩 broken (2/3)');
  });
});
