import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { isoForNation } from '../../src/pipeline/nations';

const has = existsSync('data/nations.json');
const map: Record<string, string> = has
  ? JSON.parse(readFileSync('data/nations.json', 'utf8'))
  : {};

describe('isoForNation', () => {
  it('returns a lowercase two-letter code', () => {
    expect(isoForNation('Q145', { Q145: 'GB' })).toBe('gb');
  });

  it('returns null for an unmapped nation rather than guessing', () => {
    expect(isoForNation('Q99999', {})).toBeNull();
  });
});

describe.skipIf(!has)('data/nations.json', () => {
  it('covers the nations on board 003', () => {
    for (const q of ['Q38', 'Q31', 'Q29999', 'Q29', 'Q155', 'Q145', 'Q414', 'Q1033']) {
      expect(map[q], `${q} has no ISO code`).toBeDefined();
    }
  });

  it('has plausible codes throughout', () => {
    // Alpha-2 for countries, plus ISO 3166-2 subdivisions for the home nations:
    // England, Scotland, Wales and Northern Ireland are footballing nations
    // with no alpha-2 code of their own, and flag-icons ships gb-eng etc.
    for (const [q, iso] of Object.entries(map)) {
      expect(iso, `${q} -> ${iso}`).toMatch(/^[A-Z]{2}(-[A-Z]{3})?$/);
    }
  });

  it('maps the home nations separately, not as the United Kingdom', () => {
    expect(map['Q21']).toBe('GB-ENG');
    expect(map['Q22']).toBe('GB-SCT');
    expect(map['Q25']).toBe('GB-WLS');
    expect(map['Q26']).toBe('GB-NIR');
  });
});
