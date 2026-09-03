import { describe, it, expect } from 'vitest';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../../src/pipeline/pool';
import type { RawPlayer } from '../../src/pipeline/normalise';

const raw = (
  id: string, name: string, sitelinks: number, firstSpell: number | null,
): RawPlayer => ({
  id, name, sitelinks, aliases: [], nation: 'ESP',
  positions: ['FWD'],
  clubs: [{ clubId: 'Q8682', leagueId: 'LIGA', from: firstSpell, to: null }],
});

describe('applyPoolFilters', () => {
  const players = [
    raw('mbappe', 'Kylian Mbappé', 133, 2024),
    raw('mariano', 'Mariano Díaz', 45, 2011),
    raw('unknown', 'Jose Martinez Lopez', 0, 2016),   // academy, spec 11.4
    // Sitelinks deliberately ABOVE the fame floor so this row isolates the era
    // filter. At 12 it would be removed by fame, and the era test below would
    // still pass with the era filter deleted.
    raw('prewar', 'Félix Quesada', 60, 1926),         // pre-war, spec 11.4
  ];

  it('removes players below the fame floor', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).not.toContain('unknown');
  });

  it('removes players outside the era bound', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).not.toContain('prewar');
  });

  it('keeps recognisable deep cuts', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).toContain('mariano');
  });

  it('keeps household names', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).toContain('mbappe');
  });

  it('treats the fame floor as tunable, since it varies by league', () => {
    const strict = applyPoolFilters(players, { ...DEFAULT_POOL_RULES, fameFloor: 100 });
    expect(strict.map((p) => p.id)).toEqual(['mbappe']);
  });

  it('drops players with no dated spell rather than guessing an era', () => {
    const undated = [raw('undated', 'Someone', 60, null)];
    expect(applyPoolFilters(undated, DEFAULT_POOL_RULES)).toHaveLength(0);
  });

  it('sets fame from sitelinks', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    const m = out.find((p) => p.id === 'mariano');
    expect(m?.fame).toEqual({ value: 45, source: 'sitelinks' });
  });
});
