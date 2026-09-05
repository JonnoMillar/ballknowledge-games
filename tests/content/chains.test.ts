import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chainLinks, chainProgress, isGreen } from '../../src/lib/chain/score';
import { linkColour } from '../../src/lib/chemistry/link';
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

    it(`${file}: the reference solution is green all the way`, () => {
      expect(chainProgress(chainLinks(ref, pool)).solved).toBe(true);
    });

    it(`${file}: every referenced player exists in the pool`, () => {
      for (const id of ref) expect(pool.has(id), `${id} missing from pool`).toBe(true);
    });

    it(`${file}: the givens match the reference solution`, () => {
      expect(chain.slots).toHaveLength(ref.length);
      chain.slots.forEach((id, i) => { if (id !== null) expect(id).toBe(ref[i]); });
    });

    it(`${file}: givens sit at even indices and blanks at odd ones`, () => {
      // A blank must have both neighbours given. Two blanks side by side is not
      // a puzzle: measured over 1,349 famous pairs, 1,290 had more than a
      // thousand valid fills. See scripts/build-chain.ts.
      chain.slots.forEach((id, i) => {
        expect(id === null, `slot ${i}`).toBe(i % 2 === 1);
      });
    });

    it(`${file}: consecutive givens do not link green to each other`, () => {
      // If they did, the blank between them would have nothing to do.
      for (let i = 0; i + 2 < chain.slots.length; i += 2) {
        const u = pool.get(chain.slots[i]!)!;
        const v = pool.get(chain.slots[i + 2]!)!;
        expect(isGreen(linkColour(u, v)), `${u.name} already links to ${v.name}`).toBe(false);
        expect(u.nation, `${u.name} and ${v.name} share a nation`).not.toBe(v.nation);
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
