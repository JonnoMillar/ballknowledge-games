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

  it('dates a player from his infobox when Wikidata has no dated spell', () => {
    // Tyrique George: no P54 on Wikidata at all; the infobox has Chelsea 2024.
    const george = { ...raw('george', 'Tyrique George', 25, null), clubs: [] };
    expect(applyPoolFilters([george], DEFAULT_POOL_RULES)).toHaveLength(0);
    const years = new Map([['george', [2024]]]);
    expect(applyPoolFilters([george], DEFAULT_POOL_RULES, years).map((p) => p.id)).toEqual(['george']);
    const old = new Map([['george', [1971, 1975]]]);
    expect(applyPoolFilters([george], DEFAULT_POOL_RULES, old)).toHaveLength(0);
  });

  it('keeps a player with no position class rather than dropping him', () => {
    // Pedri, Mkhitaryan and 100 others were dropped for it until 2026-10-19.
    const pedri = { ...raw('pedri', 'Pedri', 68, 2020), positions: [] };
    const out = applyPoolFilters([pedri], DEFAULT_POOL_RULES);
    expect(out.map((p) => [p.id, p.positions])).toEqual([['pedri', []]]);
  });

  it('sets fame from sitelinks', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    const m = out.find((p) => p.id === 'mariano');
    expect(m?.fame).toEqual({ value: 45, source: 'sitelinks' });
  });
});
