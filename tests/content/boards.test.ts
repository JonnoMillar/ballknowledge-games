import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { scoreBoard } from '../../src/lib/puzzle/validate';
import { FORMATIONS } from '../../src/lib/puzzle/formations';
import { CHEMISTRY_GATE } from '../../src/lib/chemistry/score';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const hasPool = existsSync('data/pool.json');
const pool: Map<string, Player> = hasPool
  ? new Map((JSON.parse(readFileSync('data/pool.json', 'utf8')) as Player[]).map((p) => [p.id, p]))
  : new Map();

const boards = hasPool && existsSync('content/puzzles')
  ? readdirSync('content/puzzles').filter((f) => f.endsWith('.json'))
  : [];

describe.skipIf(!hasPool || boards.length === 0)('shipped boards', () => {
  for (const file of boards) {
    const board = JSON.parse(readFileSync(`content/puzzles/${file}`, 'utf8')) as Board;
    const formation = FORMATIONS[board.formationId]!;

    it(`${file}: reference solution reaches the chemistry gate`, () => {
      const s = scoreBoard(formation, pool, board.referenceSolution);
      expect(s.squadChemistry).toBeGreaterThanOrEqual(CHEMISTRY_GATE);
      expect(s.solved).toBe(true);
    });

    it(`${file}: every referenced player exists in the pool`, () => {
      for (const id of Object.values(board.referenceSolution)) {
        expect(pool.has(id), `${id} missing from pool`).toBe(true);
      }
    });

    it(`${file}: seeds are a subset of the reference solution`, () => {
      for (const [slot, id] of Object.entries(board.seeded)) {
        expect(board.referenceSolution[slot]).toBe(id);
      }
    });

    it(`${file}: every player is in their natural position`, () => {
      // Boards prescribe no links, so there is nothing else to be "legal"
      // against — chemistry is the only target and it is asserted above. What
      // still matters is that the generator never parked anyone out of
      // position, which would silently cost 5 chemistry.
      for (const slot of formation.slots) {
        const player = pool.get(board.referenceSolution[slot.id]!)!;
        expect(
          player.positions.includes(slot.position),
          `${slot.id}: ${player.name} is not a ${slot.position}`,
        ).toBe(true);
      }
    });

    it(`${file}: the three givens differ in club and nation`, () => {
      const seeds = Object.values(board.seeded).map((id) => pool.get(id)!);
      for (let i = 0; i < seeds.length; i++) {
        for (let j = i + 1; j < seeds.length; j++) {
          const a = seeds[i]!;
          const b = seeds[j]!;
          expect(a.nation, `${a.name} and ${b.name} share a nation`).not.toBe(b.nation);
          expect(
            a.clubIds.some((c) => b.clubIds.includes(c)),
            `${a.name} and ${b.name} share a club`,
          ).toBe(false);
        }
      }
    });

    it(`${file}: has a recognisable anchor among the seeds`, () => {
      // A board of nothing but deep cuts gives the player no way in. Spec 6.3.
      const seedFame = Object.values(board.seeded).map((id) => pool.get(id)!.fame.value);
      expect(Math.max(...seedFame)).toBeGreaterThanOrEqual(50);
    });
  }
});
