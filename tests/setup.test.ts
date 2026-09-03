import { describe, it, expect } from 'vitest';
import type { PlayerFacts } from '../src/lib/chemistry/types';

describe('project setup', () => {
  it('compiles and imports types', () => {
    const p: PlayerFacts = { id: 'Q1', nation: 'ESP', clubIds: [], leagueIds: [] };
    expect(p.id).toBe('Q1');
  });
});
