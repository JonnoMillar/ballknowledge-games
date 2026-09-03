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

describe.skipIf(!hasFixture)('position mapping (spec 5.3)', () => {
  const parsed2 = JSON.parse(readFileSync(FIXTURE, 'utf8')) as SparqlResponse;
  const raw2 = normalise(parsed2.results.bindings, new Map());

  it('classifies the large majority of players', () => {
    // An earlier map written from memory left 42% unclassified because seven
    // of ten QIDs pointed at unrelated entities — a beetle, a starfish, a drug.
    // This guards against a silent regression of the same kind.
    const unclassified = raw2.filter((p) => p.positions.length === 0).length;
    const ratio = unclassified / raw2.length;
    expect(ratio, `${(ratio * 100).toFixed(1)}% unclassified`).toBeLessThan(0.15);
  });

  it('classifies known players into the expected class', () => {
    const find = (n: string) => raw2.find((p) => p.name === n);
    expect(find('Iker Casillas')?.positions).toContain('GK');
    expect(find('Sergio Ramos')?.positions).toContain('DEF');
    expect(find('Luka Modrić')?.positions).toContain('MID');
    expect(find('Kylian Mbappé')?.positions).toContain('FWD');
  });
});

describe.skipIf(!hasFixture)('national teams are not clubs (spec 5.1)', () => {
  const parsed3 = JSON.parse(readFileSync(FIXTURE, 'utf8')) as SparqlResponse;
  const raw3 = normalise(parsed3.results.bindings, new Map());

  it('excludes national teams from club sets', () => {
    // P54 covers national teams too. Left in, every Spanish international
    // would share a "club" with every other, turning nationality into a green
    // club link and double-counting the nation dimension.
    const NATIONAL_TEAM_QIDS = [
      'Q207337',  // Morocco
      'Q42267',   // Spain
      'Q83459',   // France
      'Q47774',   // France (alternate item)
    ];
    const allClubs = new Set(raw3.flatMap((p) => p.clubs.map((c) => c.clubId)));
    for (const qid of NATIONAL_TEAM_QIDS) {
      expect(allClubs.has(qid), `${qid} is a national team and must not be a club`).toBe(false);
    }
  });

  it('still keeps real clubs', () => {
    const allClubs = new Set(raw3.flatMap((p) => p.clubs.map((c) => c.clubId)));
    expect(allClubs.has('Q8682')).toBe(true);   // Real Madrid
    expect(allClubs.has('Q483020')).toBe(true); // PSG
  });
});
