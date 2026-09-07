import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { shortClubName } from '../../components/ClubBadge';
import type { ClubRecord } from '../../src/lib/clubs';
import type { Player } from '../../src/lib/chemistry/types';

const hasData = existsSync('data/pool.json') && existsSync('data/clubs.json');
const players: Player[] = hasData
  ? (JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[])
  : [];
const clubs: Record<string, ClubRecord> = hasData
  ? (JSON.parse(readFileSync('data/clubs.json', 'utf8')) as Record<string, ClubRecord>)
  : {};

/** The clubs a player is most likely to meet, busiest first. */
function busiest(n: number): string[] {
  const counts = new Map<string, number>();
  for (const p of players) for (const id of p.clubIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
}

describe.skipIf(!hasData)('club crests', () => {
  it('the clubs that actually turn up in puzzles have a crest', () => {
    // A silently broken fetch leaves every link showing a monogram, which looks
    // like a design choice rather than a bug. Wikidata's own P154 covers 4.9%
    // of football clubs, so this is the difference between the right source and
    // the obvious one.
    const top = busiest(200);
    const withCrest = top.filter((id) => clubs[id]?.crest ?? clubs[id]?.crestUrl);
    expect(withCrest.length / top.length).toBeGreaterThan(0.9);
  });

  it('every club in the pool at least has a name to fall back on', () => {
    const named = busiest(500).filter((id) => clubs[id]?.name && !/^Q\d+$/.test(clubs[id]!.name));
    expect(named.length).toBe(500);
  });

  it('strips the legal furniture off club names', () => {
    expect(shortClubName('Manchester United F.C.')).toBe('Manchester United');
    expect(shortClubName('Real Madrid Club de Fútbol')).toBe('Real Madrid');
    expect(shortClubName('FC Bayern Munich')).toBe('Bayern Munich');
    // Nothing to strip, and nothing invented: an abbreviation no fan uses is
    // worse than the full name.
    expect(shortClubName('Boca Juniors')).toBe('Boca Juniors');
  });
});
