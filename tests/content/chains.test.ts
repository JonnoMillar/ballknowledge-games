import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chainFieldFor, chainLinks, chainProgress, linked } from '../../src/lib/chain/score';
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

describe.skipIf(!hasPool || files.length === 0)('graded chains', () => {
  /**
   * The grade has to be a measurement, not a label typed into a JSON file.
   *
   * ENTRY is the fame of the less famous half of the most findable legal pair
   * — the easiest way in that the board actually admits. Taking each blank's
   * most famous answer separately is the obvious version and it is wrong: the
   * two slots need two different players, and the boards that measure easiest
   * are the ones where a single player tops both blanks and can only fill one.
   * See scripts/build-graded-chains.ts.
   */
  function entryOf(chain: ChainPuzzle): number {
    const mode = chain.mode ?? 'chemistry';
    const blanks = chain.slots.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
    const fields = blanks.map((i) =>
      [...chainFieldFor(i, chain.slots, players, pool, mode, chain.prescribedLinks)]
        .sort((a, b) => b.fame.value - a.fame.value)
        .slice(0, 2),
    );
    let best = 0;
    for (const x of fields[0] ?? []) {
      for (const y of fields[1] ?? []) {
        if (x.id === y.id) continue;
        best = Math.max(best, Math.min(x.fame.value, y.fame.value));
      }
    }
    return best;
  }

  const graded = files
    .map((f) => JSON.parse(readFileSync(`content/chains/${f}`, 'utf8')) as ChainPuzzle)
    .filter((c) => c.difficulty !== undefined);

  it.skipIf(graded.length === 0)('a grade means the same thing on every board', () => {
    // Only two-blank boards are comparable this way, which is every graded
    // board we ship. If that stops being true the measure needs generalising
    // rather than the assertion relaxing.
    for (const c of graded) {
      expect(c.slots.filter((s) => s === null), `${c.id} is not a two-blank board`).toHaveLength(2);
    }
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const measured = graded
      .map((c) => ({ id: c.id, grade: c.difficulty!, entry: entryOf(c) }))
      .sort((a, b) => rank[a.grade] - rank[b.grade]);

    // Harder must never be more findable than easier. Stated as a strict drop
    // so a set that grades two boards the same is caught rather than tolerated.
    for (let i = 0; i + 1 < measured.length; i++) {
      const a = measured[i]!;
      const b = measured[i + 1]!;
      if (a.grade === b.grade) continue;
      expect(
        a.entry,
        `${b.id} (${b.grade}, entry ${b.entry}) is not harder than ${a.id} (${a.grade}, entry ${a.entry})`,
      ).toBeGreaterThan(b.entry);
    }
  });
});
