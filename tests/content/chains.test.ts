import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chainFieldFor, chainLinks, chainProgress, clueMet, linked, neighboursOf, sidesOf } from '../../src/lib/chain/score';
import { factFame } from '../../src/lib/fame/spell';
import { chainResult } from '../../src/lib/chain/result';
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
    [...chainFieldFor(i, chain.slots, players, pool, mode, chain.prescribedLinks, chain.closed)]
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

describe.skipIf(!hasPool || files.length === 0)('shipped chains', () => {
  for (const file of files) {
    const chain = JSON.parse(readFileSync(`content/chains/${file}`, 'utf8')) as ChainPuzzle;
    const ref = chain.referenceSolution!;
    const mode = chain.mode ?? 'chemistry';

    it(`${file}: the reference solution links all the way`, () => {
      expect(chainProgress(chainLinks(ref, pool, mode, chain.prescribedLinks, chain.closed)).solved).toBe(true);
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
        for (const { slot: neighbour, link } of neighboursOf(i, chain.slots.length, chain.closed)) {
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

    it(`${file}: the reference solution answers every clue on a plate`, () => {
      for (const [slot, clue] of Object.entries(chain.clues ?? {})) {
        const p = pool.get(ref[Number(slot)]!)!;
        expect(clueMet(p, clue), `${p.name} is not ${clue.label}`).toBe(true);
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

  // ENTRY grades an open board. A clued board is graded on a different
  // measure — where its one answer sits on the fact-fame ruler — and is
  // checked below, not here.
  const graded = files
    .map((f) => JSON.parse(readFileSync(`content/chains/${f}`, 'utf8')) as ChainPuzzle)
    .filter((c) => c.difficulty !== undefined && c.slots.filter((s) => s === null).length === 2);

  it.skipIf(graded.length === 0)('a grade means the same thing on every two-blank board', () => {
    // Only two-blank boards are comparable this way. The ring (009) is graded
    // by hand: a plate with four ways in is not measured by ENTRY.
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

/**
 * A daily board is a promise: each plate has ONE answer a fan can reach,
 * and nothing else within reach of it. The same fact-fame ruler the open
 * boards are graded by is used here as a cut-off — 50 and up is a fact people hold,
 * under 35 is one nobody reaches for — and the board has to clear both bars
 * on every plate, or it is a scored board with the score hidden.
 */
describe.skipIf(!hasPool || files.length === 0)('daily boards', () => {
  const REACH = 50;
  const CLIFF = 35;
  const OPEN = 5;
  const boards = files
    .map((f) => JSON.parse(readFileSync(`content/chains/${f}`, 'utf8')) as ChainPuzzle)
    .filter((c) => c.difficulty === undefined && !c.deep);

  for (const chain of boards) {
    const mode = chain.mode ?? 'clubs';
    const ref = chain.referenceSolution!;

    it(`${chain.id}: each plate has one answer in reach and a cliff behind it, or asks nothing and has a few`, () => {
      // A plate with a clue on it promises ONE answer in reach. A plate with
      // nothing on it is allowed — it is the nicer kind, a plain "who links
      // these two" — but only where the field is naturally narrow: at most
      // OPEN answers a fan would think of, or it is a scored board with the
      // score hidden.
      const prescribed = chain.prescribedLinks ?? {};
      chain.slots.forEach((id, i) => {
        if (id !== null) return;
        const field = chainFieldFor(i, chain.slots, players, pool, mode, chain.prescribedLinks, chain.closed, chain.clues);
        const sides = sidesOf(i, chain.slots, pool, chain.prescribedLinks, chain.closed);
        const ranked = field.map((p) => ({ p, f: factFame(p, sides, mode) })).sort((a, b) => b.f - a.f);
        expect(ranked[0]?.p.id, `slot ${i}: the reference answer is not the findable one`).toBe(ref[i]);
        expect(ranked[0]!.f, `slot ${i}: ${ranked[0]!.p.name} is out of reach`).toBeGreaterThanOrEqual(REACH);
        const badged = neighboursOf(i, chain.slots.length, chain.closed).some(({ link }) => prescribed[link] !== undefined);
        if (chain.clues?.[i] !== undefined || badged) {
          if (ranked[1]) {
            expect(ranked[1].f, `slot ${i}: ${ranked[1].p.name} is a second answer in reach`).toBeLessThan(CLIFF);
          }
        } else {
          const inReach = ranked.filter((r) => r.f >= REACH).length;
          expect(inReach, `slot ${i} asks nothing and ${inReach} fit it`).toBeLessThanOrEqual(OPEN);
        }
      });
    });
  }
});

describe.skipIf(!hasPool || files.length === 0)('what the sealed sheet states', () => {
  /**
   * The reveal prints two measured numbers on the board: how many ways it
   * could have been filled, and the grade. Both are computed inside
   * `chainResult` by shortcuts — a product minus an overlap for the pair
   * count, and a two-deep sort for ENTRY — because the honest versions are a
   * double loop over the whole field and this runs on the main thread while
   * the reveal is trying to animate.
   *
   * A shortcut that is wrong is worse than no number at all, because the
   * sheet states it as fact. So these check the shortcuts against the slow,
   * obvious versions, and against the figures the design was signed off on.
   */
  const graded = files
    .map((f) => JSON.parse(readFileSync(`content/chains/${f}`, 'utf8')) as ChainPuzzle)
    .filter((c) => c.difficulty !== undefined && c.slots.filter((s) => s === null).length === 2);

  for (const chain of graded) {
    const mode = chain.mode ?? 'chemistry';
    const blanks = chain.slots.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
    const fields = blanks.map((i) =>
      chainFieldFor(i, chain.slots, players, pool, mode, chain.prescribedLinks, chain.closed),
    );
    const result = chainResult(chain.referenceSolution!, chain, players, pool);

    it(`${chain.id}: the pair count matches counting them one by one`, () => {
      const [a, b] = fields as [Player[], Player[]];
      expect(a.length * b.length).toBeLessThan(100_000); // keep the loop honest and quick
      let counted = 0;
      for (const x of a) for (const y of b) if (x.id !== y.id) counted++;
      expect(result.pairs).toBe(counted);
    });

    it(`${chain.id}: ENTRY agrees with the measure the grader uses`, () => {
      expect(result.entry).toBe(entryOf(chain));
    });

    it(`${chain.id}: the wall of answers is real, distinct and legal`, () => {
      expect(result.pinboard.length).toBeGreaterThan(0);
      expect(new Set(result.pinboard.map((p) => p.id)).size).toBe(result.pinboard.length);
      for (const answer of result.pinboard) {
        expect(pool.has(answer.id), `${answer.id} not in the pool`).toBe(true);
        // Every card claims the clubs that made it fit, and the sheet paints
        // them. A card with no clubs would be a blank diagonal.
        expect(answer.clubs.length, `${answer.name} has no club to show`).toBeGreaterThan(0);
        const inField = answer.either
          ? fields.every((f) => f.some((p) => p.id === answer.id))
          : fields.some((f) => f.some((p) => p.id === answer.id));
        expect(inField, `${answer.name} would not actually have worked`).toBe(true);
      }
    });
  }

  it('chain 006 states the figures the boards were graded on', () => {
    // The numbers in HANDOFF.md, held to by the code that prints them.
    const six = graded.find((c) => c.id === '006');
    if (!six) return;
    const result = chainResult(six.referenceSolution!, six, players, pool);
    expect(result.pairs).toBe(254);
    expect(result.entry).toBe(90);
  });
});

/**
 * A Deep Cuts board is the opposite promise to a daily: wide fields, so there
 * is somewhere to dig, and a famous way in, so anyone can hold it. The
 * reference solution is the deepest checkable pair, so sealing it has to earn
 * a Grail on both plates, which holds the grading and the board to each other.
 */
describe.skipIf(!hasPool || files.length === 0)('Deep Cuts boards', () => {
  const MIN_SIDE = 25;
  const MIN_ENTRY = 60;
  const boards = files
    .map((f) => JSON.parse(readFileSync(`content/chains/${f}`, 'utf8')) as ChainPuzzle)
    .filter((c) => c.deep);

  it('there are Deep Cuts boards, and none is also a daily or on the ladder', () => {
    expect(boards.length).toBeGreaterThanOrEqual(20);
    for (const c of boards) {
      expect(c.difficulty, `${c.id} has a difficulty`).toBeUndefined();
      expect(c.clues, `${c.id} has clues`).toBeUndefined();
    }
  });

  for (const chain of boards) {
    it(`${chain.id}: both plates are wide open, and there is a famous way in`, () => {
      const blanks = chain.slots.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
      expect(blanks).toHaveLength(2);
      for (const i of blanks) {
        const field = chainFieldFor(i, chain.slots, players, pool, chain.mode ?? 'clubs', chain.prescribedLinks, chain.closed);
        expect(field.length, `plate ${i} has ${field.length} answers`).toBeGreaterThanOrEqual(MIN_SIDE);
      }
      expect(entryOf(chain)).toBeGreaterThanOrEqual(MIN_ENTRY);
    });

    it(`${chain.id}: the deepest checkable pair is graded Grail on both plates`, () => {
      const result = chainResult(chain.referenceSolution!, chain, players, pool);
      expect(result.perfect).toBe(true);
      expect(result.slots.map((s) => s.grade)).toEqual(['grail', 'grail']);
      expect(result.pageGrade).toBe('grail');
    });
  }
});
