import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chainLinks, chainProgress, linked } from '../../src/lib/chain/score';
import type { ChainPuzzle } from '../../src/lib/chain/types';
import type { Player } from '../../src/lib/chemistry/types';

const hasPool = existsSync('data/pool.json');
const players: Player[] = hasPool
  ? (JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[])
  : [];
const pool = new Map(players.map((p) => [p.id, p]));

const files = hasPool && existsSync('content/chains')
  ? readdirSync('content/chains').filter((f) => f.endsWith('.json'))
  : [];

describe.skipIf(!hasPool || files.length === 0)('shipped chains', () => {
  for (const file of files) {
    const chain = JSON.parse(readFileSync(`content/chains/${file}`, 'utf8')) as ChainPuzzle;
    const ref = chain.referenceSolution!;
    const mode = chain.mode ?? 'chemistry';

    it(`${file}: the reference solution links all the way`, () => {
      expect(chainProgress(chainLinks(ref, pool, mode, chain.prescribedLinks)).solved).toBe(true);
    });

    it(`${file}: every referenced player exists in the pool`, () => {
      for (const id of ref) expect(pool.has(id), `${id} missing from pool`).toBe(true);
    });

    it(`${file}: the givens match the reference solution`, () => {
      expect(chain.slots).toHaveLength(ref.length);
      chain.slots.forEach((id, i) => { if (id !== null) expect(id).toBe(ref[i]); });
    });

    it(`${file}: every blank is constrained on both sides`, () => {
      // A blank must be pinned by what sits next to it: a given neighbour, or
      // a link whose club the puzzle names. An unconstrained pair of adjacent
      // blanks is not a puzzle — measured over 2,642 famous end-pairs in club
      // mode, 2,551 admitted more than 600 answers and none landed in a
      // playable range. See scripts/measure-layouts.ts.
      const prescribed = chain.prescribedLinks ?? {};
      chain.slots.forEach((id, i) => {
        if (id !== null) return;
        for (const [neighbour, link] of [[i - 1, i - 1], [i + 1, i]] as const) {
          expect(
            chain.slots[neighbour] != null || prescribed[link] !== undefined,
            `slot ${i} is unconstrained towards slot ${neighbour}`,
          ).toBe(true);
        }
      });
    });

    it(`${file}: neighbouring givens do not already link to each other`, () => {
      // If they did, the blanks between them would have nothing to do. The
      // test has to use the chain's OWN rule: a club-mode pair may link green
      // by nation and league and still be a perfectly good puzzle, because in
      // that mode nation and league connect nothing.
      const givenAt = chain.slots
        .map((id, i) => (id === null ? -1 : i))
        .filter((i) => i >= 0);
      for (let n = 0; n + 1 < givenAt.length; n++) {
        const u = pool.get(chain.slots[givenAt[n]!]!)!;
        const v = pool.get(chain.slots[givenAt[n + 1]!]!)!;
        expect(linked(u, v, mode), `${u.name} already links to ${v.name}`).toBe(false);
      }
    });

    it(`${file}: a named club really is the club that makes its link`, () => {
      // The whole point of naming it: a pair sharing some OTHER club does not
      // satisfy the link, so the reference solution has to go through the one
      // on the board.
      for (const [link, club] of Object.entries(chain.prescribedLinks ?? {})) {
        const a = pool.get(ref[Number(link)]!)!;
        const b = pool.get(ref[Number(link) + 1]!)!;
        expect(a.clubIds, `${a.name} never played for ${club}`).toContain(club);
        expect(b.clubIds, `${b.name} never played for ${club}`).toContain(club);
      }
    });

    it(`${file}: every link in the reference solution is explainable`, () => {
      // In club mode the UI names the club that made each link, so a link with
      // no shared club would render as a green line with nothing on it.
      if (mode !== 'clubs') return;
      for (const link of chainLinks(ref, pool, mode, chain.prescribedLinks)) {
        expect(link.clubs.length, `link ${link.index} has no club to show`).toBeGreaterThan(0);
      }
    });

    it(`${file}: no player appears twice`, () => {
      expect(new Set(ref).size).toBe(ref.length);
    });

    it(`${file}: has a recognisable given`, () => {
      // A chain of nothing but deep cuts gives the player no way in.
      const fame = chain.slots
        .filter((id): id is string => id !== null)
        .map((id) => pool.get(id)!.fame.value);
      expect(Math.max(...fame)).toBeGreaterThanOrEqual(50);
    });
  }
});
