import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { normalise } from '../../src/pipeline/normalise';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../../src/pipeline/pool';
import type { SparqlResponse } from '../../src/pipeline/sparql';

const FIXTURE = 'tests/fixtures/Q8682.json';
const hasFixture = existsSync(FIXTURE);

describe.skipIf(!hasFixture)('pipeline traps (spec 8.1)', () => {
  const parsed = JSON.parse(readFileSync(FIXTURE, 'utf8')) as SparqlResponse;
  const raw = normalise(parsed.results.bindings, new Map());
  const byName = (n: string) => raw.find((p) => p.name === n);

  it('trap 1: Mbappé resolves to a name, not a bare QID', () => {
    const m = byName('Kylian Mbappé');
    expect(m, 'Mbappé missing — the mul label fallback has regressed').toBeDefined();
    expect(m!.id).toBe('Q21621995');
  });

  it('trap 1: no player is named as a bare QID', () => {
    const qidNamed = raw.filter((p) => /^Q\d+$/.test(p.name));
    expect(qidNamed, `${qidNamed.length} players fell back to QIDs`).toHaveLength(0);
  });

  it('trap 2: Mbappé has more than one club', () => {
    const m = byName('Kylian Mbappé');
    expect(m!.clubs.length).toBeGreaterThan(1);
  });

  it('trap 2: Mbappé links to both Real Madrid and PSG', () => {
    const clubs = byName('Kylian Mbappé')!.clubs.map((c) => c.clubId);
    expect(clubs).toContain('Q8682');
    expect(clubs).toContain('Q483020');
  });

  it('trap 3: Julio Iglesias is excluded by the QUERY, not by a later filter', () => {
    // Asserted against `raw`, deliberately not against the finished pool.
    //
    // He was originally absent from the pool only because he has no spell
    // dates, so the era filter dropped him. That made this test pass while the
    // notability protection did not exist at all — a modern non-footballer
    // with dated spells would have sailed straight through. Assert the
    // mechanism, not the outcome.
    expect(raw.find((p) => p.name === 'Julio Iglesias')).toBeUndefined();
  });

  it('trap 3: the notability filter does not remove real footballers', () => {
    // Regression guard. Excluding occupation `actor` removes David Beckham,
    // who holds it. Measured against the live endpoint on 2026-09-03.
    const beckham = raw.find((p) => p.name === 'David Beckham');
    expect(beckham, 'Beckham removed — the exclusion list is too broad').toBeDefined();
  });

  it('trap 3: the finished pool is also clean', () => {
    const pool = applyPoolFilters(raw, DEFAULT_POOL_RULES);
    expect(pool.find((p) => p.name === 'Julio Iglesias')).toBeUndefined();
  });

  it('sanity: the fixture is large enough to be meaningful', () => {
    expect(raw.length).toBeGreaterThan(500);
  });
});
