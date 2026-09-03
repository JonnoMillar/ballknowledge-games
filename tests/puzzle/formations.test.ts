import { describe, it, expect } from 'vitest';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey, adjacentSlots, linkCountFor } from '../../src/lib/puzzle/edges';

describe('FORMATION_433', () => {
  it('has eleven slots', () => {
    expect(FORMATION_433.slots).toHaveLength(11);
  });

  it('has sixteen edges', () => {
    expect(FORMATION_433.adjacency).toHaveLength(16);
  });

  it('has no isolated slot, since playerChemistry returns 0 for one', () => {
    for (const slot of FORMATION_433.slots) {
      expect(linkCountFor(FORMATION_433, slot.id)).toBeGreaterThan(0);
    }
  });

  it('allows a perfect squad to reach exactly 110', () => {
    const total = FORMATION_433.slots.length * 10;
    expect(total).toBe(110);
  });

  it('references only declared slot ids in its adjacency', () => {
    const ids = new Set(FORMATION_433.slots.map((s) => s.id));
    for (const [a, b] of FORMATION_433.adjacency) {
      expect(ids.has(a)).toBe(true);
      expect(ids.has(b)).toBe(true);
    }
  });

  it('has exactly one goalkeeper', () => {
    expect(FORMATION_433.slots.filter((s) => s.position === 'GK')).toHaveLength(1);
  });
});

describe('edgeKey', () => {
  it('is order independent', () => {
    expect(edgeKey('a', 'b')).toBe(edgeKey('b', 'a'));
  });
});

describe('adjacentSlots', () => {
  it('finds both centre backs from the goalkeeper', () => {
    expect(adjacentSlots(FORMATION_433, 'GK').sort()).toEqual(['LCB', 'RCB']);
  });
});
