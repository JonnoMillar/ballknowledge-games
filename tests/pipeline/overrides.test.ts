import { describe, it, expect } from 'vitest';
import { NAME_OVERRIDES, applyNameOverride } from '../../src/pipeline/overrides';
import { suspiciousName } from '../../src/pipeline/sanity';

describe('name overrides', () => {
  it('replaces a defaced name', () => {
    expect(applyNameOverride('Q3779221', 'Guido Carrillo EL GOAT')).toBe('Guido Carrillo');
  });

  it('leaves unknown ids untouched', () => {
    expect(applyNameOverride('Q21621995', 'Kylian Mbappé')).toBe('Kylian Mbappé');
  });

  it('every override produces a name that passes the sanity check', () => {
    // Otherwise the override is not actually fixing the problem.
    for (const [id, name] of Object.entries(NAME_OVERRIDES)) {
      expect(suspiciousName(name), `override for ${id} still looks defaced`).toBeNull();
    }
  });
});
