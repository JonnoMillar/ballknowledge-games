import { describe, it, expect } from 'vitest';
import { clubRosterQuery, famousElsewhereQuery } from '../../src/pipeline/queries';

describe('clubRosterQuery', () => {
  const q = clubRosterQuery('Q8682');

  it('traverses p:/ps: and never wdt:P54', () => {
    // wdt:P54 returns only best-rank statements, cutting Mbappe from 7 clubs
    // to 1. Fatal for an "ever played for" game. Spec 8.1 trap 2.
    expect(q).toContain('p:P54');
    expect(q).toContain('ps:P54');
    expect(q).not.toContain('wdt:P54');
  });

  it('falls back to the mul label', () => {
    // Wikidata moved personal names to the mul language code. An en-only
    // label service drops Beckham, Mbappe, Ramos and Aragones. Spec 8.1 trap 1.
    expect(q).toContain('"mul"');
    expect(q).toContain('COALESCE');
  });

  it('restricts to human association footballers', () => {
    // Filters out book editions and an EA FC 24 character. Spec 8.1 trap 3.
    expect(q).toContain('wd:Q937857');
  });

  it('requests sitelinks for the fame signal', () => {
    expect(q).toContain('wikibase:sitelinks');
  });

  it('requests spell dates even though v1 ignores them', () => {
    // Ingested now so overlap mode is a switch, not a pipeline re-run. Spec 7.1.
    expect(q).toContain('P580');
    expect(q).toContain('P582');
  });

  it('embeds the club id', () => {
    expect(q).toContain('wd:Q8682');
  });
});

describe('famousElsewhereQuery', () => {
  const q = famousElsewhereQuery(['Q122003']);

  it('spares anyone with a recorded appearance for a football club', () => {
    // Ronaldinho is a musician and Shane Williams has 129 rugby appearances:
    // the club type is what tells them apart. Measured 2026-10-19.
    expect(q).toContain('pq:P1350');
    expect(q).toContain('wd:Q476028');
  });

  it('never lists actor, which would remove David Beckham', () => {
    expect(q).not.toContain('wd:Q33999');
  });

  it('is the same rule the club roster query applies inline', () => {
    expect(clubRosterQuery('Q8682')).toContain(q.slice(q.indexOf('?player wdt:P106 ?other'), q.lastIndexOf('}')).trim().slice(0, 200));
  });
});
