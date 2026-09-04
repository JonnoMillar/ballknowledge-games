import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { scoreBoard, isValidPlacement } from '../../src/lib/puzzle/validate';
import { FORMATIONS } from '../../src/lib/puzzle/formations';
import { CHEMISTRY_GATE } from '../../src/lib/chemistry/score';
import type { Board, Placement } from '../../src/lib/puzzle/types';
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

    it(`${file}: the reference solution is legal under its own constraints`, () => {
      // Replay it slot by slot, exactly as the game would validate it.
      const filled: Record<string, string> = { ...board.seeded };
      for (const slot of formation.slots) {
        if (filled[slot.id]) continue;
        const player = pool.get(board.referenceSolution[slot.id]!)!;
        const r = isValidPlacement(board, formation, pool, filled as Placement, slot.id, player);
        expect(r.ok, `${slot.id} (${player.name}) illegal on its own board`).toBe(true);
        filled[slot.id] = player.id;
      }
    });

    it(`${file}: has a recognisable anchor among the seeds`, () => {
      // A board of nothing but deep cuts gives the player no way in. Spec 6.3.
      const seedFame = Object.values(board.seeded).map((id) => pool.get(id)!.fame.value);
      expect(Math.max(...seedFame)).toBeGreaterThanOrEqual(50);
    });
  }
});
