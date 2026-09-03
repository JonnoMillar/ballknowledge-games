# Recall XI Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data pipeline, chemistry engine and solution counter for Recall XI, then use them to answer the go/no-go question in spec §16 — does a usable obscurity spread exist outside Real Madrid?

**Architecture:** Three layers with one-way dependencies. `lib/chemistry` is pure and depends on nothing. `lib/puzzle` builds board validation and solution enumeration on top of it. `pipeline/` fetches and normalises Wikidata into a committed JSON pool, and is never called at runtime. Scripts at the top drive the pipeline and produce the coverage report. No UI in this plan.

**Tech Stack:** TypeScript, Vitest, tsx, Node 20+. No paid services, no runtime dependencies beyond the standard library. Wikidata's public SPARQL endpoint is free and needs no key.

**Scope:** Spec §16 steps 1–3 only. Steps 4–6 (authoring page, pitch rendering, play loop) get a separate plan once the gate in Task 10 passes.

**Spec:** `docs/superpowers/specs/2026-09-03-recall-xi-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | Project setup |
| `src/lib/chemistry/types.ts` | `LinkColour`, `PlayerFacts`, `PositionClass` |
| `src/lib/chemistry/link.ts` | Link colour, points, rank. The heart. Pure. |
| `src/lib/chemistry/score.ts` | Player and squad chemistry. Pure. |
| `src/lib/puzzle/types.ts` | `Formation`, `Board`, `Placement` |
| `src/lib/puzzle/formations.ts` | The 4-3-3 formation as data |
| `src/lib/puzzle/edges.ts` | Edge key helper, shared by validate and solve |
| `src/lib/puzzle/validate.ts` | `isValidPlacement`, `scoreBoard` |
| `src/lib/puzzle/solve.ts` | Capped solution enumeration, per-slot answer sets |
| `src/lib/fame/obscurity.ts` | Slot-relative obscurity scoring |
| `src/pipeline/sparql.ts` | SPARQL client with required User-Agent |
| `src/pipeline/queries.ts` | Query builders. Encodes the §8.1 trap fixes. |
| `src/pipeline/normalise.ts` | SPARQL JSON → `Player` records |
| `src/pipeline/pool.ts` | Occupation, era and fame-floor filters |
| `scripts/fetch-club.ts` | CLI: fetch one club into `data/raw/` |
| `scripts/build-pool.ts` | CLI: raw → committed `data/pool.json` |
| `scripts/coverage-report.ts` | CLI: the Task 10 go/no-go measurement |
| `tests/fixtures/*.json` | Recorded SPARQL responses. Tests never hit the network. |

`data/raw/` is gitignored. `data/pool.json` is committed as a pinned snapshot per spec §8.2.

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/lib/chemistry/types.ts`
- Test: `tests/setup.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "recall-xi",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "fetch:club": "tsx scripts/fetch-club.ts",
    "build:pool": "tsx scripts/build-pool.ts",
    "report:coverage": "tsx scripts/coverage-report.ts"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `src/lib/chemistry/types.ts`**

```typescript
/** A link's colour, using the FIFA pre-23 names kept in spec 5.1. */
export type LinkColour = 'red' | 'orange' | 'green' | 'hyper';

/** Coarse position class. Spec 5.3 — deliberately coarse, P413 cannot support more. */
export type PositionClass = 'GK' | 'DEF' | 'MID' | 'FWD';

/**
 * The minimum a player needs for the chemistry engine.
 * Career/all-time model: clubIds and leagueIds are every club and league
 * the player ever appeared for. No dates. Spec 7.1.
 */
export interface PlayerFacts {
  id: string;
  nation: string;
  clubIds: readonly string[];
  leagueIds: readonly string[];
}

/** A pool entry: facts plus everything the app needs to display and score. */
export interface Player extends PlayerFacts {
  name: string;
  aliases: readonly string[];
  positions: readonly PositionClass[];
  fame: { value: number; source: 'sitelinks' | 'pageviews' | 'pickrate' | 'manual' };
}
```

- [ ] **Step 5: Create `tests/setup.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import type { PlayerFacts } from '../src/lib/chemistry/types';

describe('project setup', () => {
  it('compiles and imports types', () => {
    const p: PlayerFacts = { id: 'Q1', nation: 'ESP', clubIds: [], leagueIds: [] };
    expect(p.id).toBe('Q1');
  });
});
```

- [ ] **Step 6: Install and run**

Run: `npm install && npm test`
Expected: 1 test passes.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/lib/chemistry/types.ts tests/setup.test.ts package-lock.json
git commit -m "chore: scaffold TypeScript project with vitest"
```

---

### Task 2: Link colour — the heart of the engine

Spec §5.1. This function decides every constraint in the game. It is pure, has no
dependencies, and must never gain any.

**Files:**
- Create: `src/lib/chemistry/link.ts`
- Test: `tests/chemistry/link.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { linkColour, linkPoints, linkRank } from '../../src/lib/chemistry/link';
import type { PlayerFacts } from '../../src/lib/chemistry/types';

const p = (
  nation: string,
  clubIds: string[],
  leagueIds: string[],
): PlayerFacts => ({ id: 'x', nation, clubIds, leagueIds });

describe('linkColour', () => {
  it('is hyper when club and nation both match', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('ESP', ['RM'], ['LIGA']))).toBe('hyper');
  });

  it('is green on a shared club alone', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('BRA', ['RM'], ['LIGA']))).toBe('green');
  });

  it('is green on nation plus league without a shared club', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('ESP', ['FCB'], ['LIGA']))).toBe('green');
  });

  it('is orange on nation alone', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('ESP', ['MU'], ['PL']))).toBe('orange');
  });

  it('is orange on league alone', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('BRA', ['FCB'], ['LIGA']))).toBe('orange');
  });

  it('is red when nothing is shared', () => {
    expect(linkColour(p('ESP', ['RM'], ['LIGA']), p('BRA', ['MU'], ['PL']))).toBe('red');
  });

  it('matches on any shared club across full careers', () => {
    // Career model: Beckham and Ronaldo link via Real Madrid despite never
    // overlapping. Spec 7.1 accepts this deliberately.
    const beckham = p('ENG', ['MU', 'RM', 'MIL', 'LA', 'PSG'], ['PL', 'LIGA', 'SERIEA', 'MLS', 'L1']);
    const ronaldo = p('POR', ['SPT', 'MU', 'RM', 'JUV'], ['LIGAPT', 'PL', 'LIGA', 'SERIEA']);
    expect(linkColour(beckham, ronaldo)).toBe('green');
  });

  it('is symmetric', () => {
    const a = p('ESP', ['RM'], ['LIGA']);
    const b = p('BRA', ['FCB'], ['LIGA']);
    expect(linkColour(a, b)).toBe(linkColour(b, a));
  });
});

describe('linkPoints', () => {
  it('scores hyper the same as green so the arithmetic stays hand-computable', () => {
    expect(linkPoints('hyper')).toBe(2);
    expect(linkPoints('green')).toBe(2);
    expect(linkPoints('orange')).toBe(1);
    expect(linkPoints('red')).toBe(0);
  });
});

describe('linkRank', () => {
  it('ranks hyper above green even though they score the same', () => {
    expect(linkRank('hyper')).toBeGreaterThan(linkRank('green'));
    expect(linkRank('green')).toBeGreaterThan(linkRank('orange'));
    expect(linkRank('orange')).toBeGreaterThan(linkRank('red'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chemistry/link.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/chemistry/link`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/chemistry/link.ts`:

```typescript
import type { LinkColour, PlayerFacts } from './types';

/**
 * Chemistry points. Hyper scores the same as green deliberately: it renders
 * distinctly to keep the FIFA visual language, but scoring it higher would
 * break the hand-computable requirement in spec 5.2.
 */
const POINTS: Record<LinkColour, number> = { red: 0, orange: 1, green: 2, hyper: 2 };

/**
 * Constraint ordering, which is NOT the same as points. A board requiring
 * `green` is satisfied by `hyper`, so rank must separate them.
 */
const RANK: Record<LinkColour, number> = { red: 0, orange: 1, green: 2, hyper: 3 };

function intersects(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

export function linkColour(a: PlayerFacts, b: PlayerFacts): LinkColour {
  const sameClub = intersects(a.clubIds, b.clubIds);
  const sameNation = a.nation === b.nation;
  const sameLeague = intersects(a.leagueIds, b.leagueIds);

  if (sameClub && sameNation) return 'hyper';
  if (sameClub || (sameNation && sameLeague)) return 'green';
  if (sameNation || sameLeague) return 'orange';
  return 'red';
}

export function linkPoints(colour: LinkColour): number {
  return POINTS[colour];
}

export function linkRank(colour: LinkColour): number {
  return RANK[colour];
}

/** A required colour of `any` imposes no constraint. Spec 4.4. */
export function meetsRequirement(
  achieved: LinkColour,
  required: LinkColour | 'any',
): boolean {
  if (required === 'any') return true;
  return linkRank(achieved) >= linkRank(required);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chemistry/link.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Add the requirement-matching test**

First add `meetsRequirement` to the existing import at the top of
`tests/chemistry/link.test.ts`, so the line reads:

```typescript
import { linkColour, linkPoints, linkRank, meetsRequirement } from '../../src/lib/chemistry/link';
```

Then append to the end of the file:

```typescript
describe('meetsRequirement', () => {
  it('treats required colours as a minimum, not an exact match', () => {
    expect(meetsRequirement('hyper', 'green')).toBe(true);
    expect(meetsRequirement('green', 'green')).toBe(true);
    expect(meetsRequirement('orange', 'green')).toBe(false);
  });

  it('accepts anything when the requirement is any', () => {
    expect(meetsRequirement('red', 'any')).toBe(true);
  });
});
```

- [ ] **Step 6: Run and commit**

Run: `npx vitest run tests/chemistry/link.test.ts`
Expected: PASS, 11 tests.

```bash
git add src/lib/chemistry/link.ts tests/chemistry/link.test.ts
git commit -m "feat: add chemistry link colour, points and rank"
```

---

### Task 3: Player and squad chemistry

Spec §5.2. Note the partial-board rule: `linkCount` is the slot's total adjacency
in the formation and never changes; only links with both ends filled earn points.

**Files:**
- Create: `src/lib/chemistry/score.ts`
- Test: `tests/chemistry/score.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import {
  playerChemistry,
  squadChemistry,
  CHEMISTRY_GATE,
  MAX_SQUAD_CHEMISTRY,
} from '../../src/lib/chemistry/score';

describe('playerChemistry', () => {
  it('gives 10 when every link is green', () => {
    expect(playerChemistry(4, 8)).toBe(10);
  });

  it('gives 0 when every link is red', () => {
    expect(playerChemistry(4, 0)).toBe(0);
  });

  it('gives 5 when every link is orange', () => {
    expect(playerChemistry(4, 4)).toBe(5);
  });

  it('counts unresolved links as zero, so partial boards score low', () => {
    // 4 links, only 2 resolved and both green = 4 points of a possible 8.
    expect(playerChemistry(4, 4)).toBe(5);
  });

  it('never exceeds 10 or drops below 0', () => {
    expect(playerChemistry(2, 99)).toBe(10);
    expect(playerChemistry(2, -5)).toBe(0);
  });

  it('returns 0 for an isolated slot rather than dividing by zero', () => {
    expect(playerChemistry(0, 0)).toBe(0);
  });
});

describe('squadChemistry', () => {
  it('sums the eleven players', () => {
    expect(squadChemistry([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10])).toBe(110);
  });

  it('is not capped at the gate, so a better solve shows a higher number', () => {
    const perfect = squadChemistry(Array(11).fill(10));
    expect(perfect).toBe(MAX_SQUAD_CHEMISTRY);
    expect(perfect).toBeGreaterThan(CHEMISTRY_GATE);
  });

  it('leaves ten points of slack above the gate', () => {
    expect(MAX_SQUAD_CHEMISTRY - CHEMISTRY_GATE).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chemistry/score.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/chemistry/score`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/chemistry/score.ts`:

```typescript
/** A solved board must reach this. Spec 6.1. */
export const CHEMISTRY_GATE = 100;

/** Eleven players at 10 each. Spec 5.2 — deliberately above the gate. */
export const MAX_SQUAD_CHEMISTRY = 110;

/**
 * Individual chemistry, 0..10.
 *
 * `linkCount` is the slot's TOTAL adjacency count in the formation and is
 * fixed for the whole solve. `earnedPoints` counts only links whose other end
 * is already filled. An unresolved link therefore contributes nothing and
 * drags the number down until completed, so chemistry climbs as the board
 * fills rather than starting misleadingly high. Spec 5.2.
 */
export function playerChemistry(linkCount: number, earnedPoints: number): number {
  if (linkCount <= 0) return 0;
  const raw = Math.round((10 * earnedPoints) / (2 * linkCount));
  return Math.min(10, Math.max(0, raw));
}

/** Squad chemistry, 0..110, uncapped. Spec 5.2. */
export function squadChemistry(perPlayer: readonly number[]): number {
  return perPlayer.reduce((sum, n) => sum + n, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chemistry/score.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chemistry/score.ts tests/chemistry/score.test.ts
git commit -m "feat: add player and squad chemistry scoring"
```

---

### Task 4: Formation data and edge helpers

Spec §9.1 — formations live in data so adding one later costs nothing.

**Files:**
- Create: `src/lib/puzzle/types.ts`
- Create: `src/lib/puzzle/edges.ts`
- Create: `src/lib/puzzle/formations.ts`
- Test: `tests/puzzle/formations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey, adjacentSlots, linkCountFor } from '../../src/lib/puzzle/edges';

describe('FORMATION_433', () => {
  it('has eleven slots', () => {
    expect(FORMATION_433.slots).toHaveLength(11);
  });

  it('has sixteen edges', () => {
    expect(FORMATION_433.adjacency).toHaveLength(16);
  });

  it('has no isolated slot, since playerChemistry returns 0 for one', () => {
    for (const slot of FORMATION_433.slots) {
      expect(linkCountFor(FORMATION_433, slot.id)).toBeGreaterThan(0);
    }
  });

  it('allows a perfect squad to reach exactly 110', () => {
    // Every slot at 10 requires every slot to have at least one link.
    const total = FORMATION_433.slots.length * 10;
    expect(total).toBe(110);
  });

  it('references only declared slot ids in its adjacency', () => {
    const ids = new Set(FORMATION_433.slots.map((s) => s.id));
    for (const [a, b] of FORMATION_433.adjacency) {
      expect(ids.has(a)).toBe(true);
      expect(ids.has(b)).toBe(true);
    }
  });

  it('has exactly one goalkeeper', () => {
    expect(FORMATION_433.slots.filter((s) => s.position === 'GK')).toHaveLength(1);
  });
});

describe('edgeKey', () => {
  it('is order independent', () => {
    expect(edgeKey('a', 'b')).toBe(edgeKey('b', 'a'));
  });
});

describe('adjacentSlots', () => {
  it('finds both centre backs from the goalkeeper', () => {
    expect(adjacentSlots(FORMATION_433, 'GK').sort()).toEqual(['LCB', 'RCB']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/puzzle/formations.test.ts`
Expected: FAIL — cannot resolve the puzzle modules.

- [ ] **Step 3: Create `src/lib/puzzle/types.ts`**

```typescript
import type { LinkColour, PositionClass } from '../chemistry/types';

export interface Slot {
  id: string;
  position: PositionClass;
  /** Layout coordinates, 0..100 on both axes. Unused until the UI plan. */
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  slots: readonly Slot[];
  adjacency: readonly (readonly [string, string])[];
}

/** Map of slotId to playerId. */
export type Placement = Readonly<Record<string, string>>;

export interface Board {
  id: string;
  formationId: string;
  /** Slots revealed at the start. Spec 4 step 1. */
  seeded: Placement;
  /** Keyed by edgeKey(a, b). Spec 4.4. */
  required: Readonly<Record<string, LinkColour | 'any'>>;
  /** Proves the board is solvable. Never the required answer. Spec 4.4. */
  referenceSolution: Placement;
}
```

- [ ] **Step 4: Create `src/lib/puzzle/edges.ts`**

```typescript
import type { Formation } from './types';

/** Order-independent key for an unordered pair of slots. */
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function adjacentSlots(formation: Formation, slotId: string): string[] {
  const out: string[] = [];
  for (const [a, b] of formation.adjacency) {
    if (a === slotId) out.push(b);
    else if (b === slotId) out.push(a);
  }
  return out;
}

/** Total adjacency for a slot. Fixed for the whole solve. Spec 5.2. */
export function linkCountFor(formation: Formation, slotId: string): number {
  return adjacentSlots(formation, slotId).length;
}
```

- [ ] **Step 5: Create `src/lib/puzzle/formations.ts`**

```typescript
import type { Formation } from './types';

/**
 * 4-3-3. Sixteen edges, every slot linked at least twice.
 * Degree per slot: GK 2, LB 2, LCB 4, RCB 4, RB 2, LCM 4, CM 3, RCM 4,
 * LW 2, ST 3, RW 2 — summing to 32, which is 2 x 16 edges.
 */
export const FORMATION_433: Formation = {
  id: '433',
  slots: [
    { id: 'GK', position: 'GK', x: 50, y: 95 },
    { id: 'LB', position: 'DEF', x: 15, y: 75 },
    { id: 'LCB', position: 'DEF', x: 38, y: 80 },
    { id: 'RCB', position: 'DEF', x: 62, y: 80 },
    { id: 'RB', position: 'DEF', x: 85, y: 75 },
    { id: 'LCM', position: 'MID', x: 28, y: 50 },
    { id: 'CM', position: 'MID', x: 50, y: 55 },
    { id: 'RCM', position: 'MID', x: 72, y: 50 },
    { id: 'LW', position: 'FWD', x: 18, y: 20 },
    { id: 'ST', position: 'FWD', x: 50, y: 15 },
    { id: 'RW', position: 'FWD', x: 82, y: 20 },
  ],
  adjacency: [
    ['GK', 'LCB'], ['GK', 'RCB'],
    ['LB', 'LCB'], ['LB', 'LCM'],
    ['LCB', 'RCB'], ['LCB', 'LCM'],
    ['RCB', 'RB'], ['RCB', 'RCM'],
    ['RB', 'RCM'],
    ['LCM', 'CM'], ['LCM', 'LW'],
    ['CM', 'RCM'], ['CM', 'ST'],
    ['RCM', 'RW'],
    ['LW', 'ST'], ['ST', 'RW'],
  ],
};

export const FORMATIONS: Readonly<Record<string, Formation>> = {
  [FORMATION_433.id]: FORMATION_433,
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/puzzle/formations.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/puzzle/types.ts src/lib/puzzle/edges.ts src/lib/puzzle/formations.ts tests/puzzle/formations.test.ts
git commit -m "feat: add formation data model and 4-3-3 layout"
```

---

### Task 5: Placement validation and board scoring

Spec §4.1 — a link is inert until one end is solved, which is what guarantees no
placement can fail for an invisible reason.

**Files:**
- Create: `src/lib/puzzle/validate.ts`
- Test: `tests/puzzle/validate.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { isValidPlacement, scoreBoard } from '../../src/lib/puzzle/validate';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (
  id: string,
  nation: string,
  clubIds: string[],
  positions: Player['positions'],
): Player => ({
  id, name: id, aliases: [], nation, clubIds,
  leagueIds: clubIds.map((c) => `L_${c}`),
  positions,
  fame: { value: 50, source: 'sitelinks' },
});

const alisson = mk('alisson', 'BRA', ['LIV'], ['GK']);
const vanDijk = mk('vandijk', 'NED', ['LIV'], ['DEF']);
const konate = mk('konate', 'FRA', ['LIV'], ['DEF']);
const stranger = mk('stranger', 'JPN', ['URAWA'], ['DEF']);
const keeper = mk('keeper', 'BRA', ['LIV'], ['GK']);

const pool = new Map<string, Player>(
  [alisson, vanDijk, konate, stranger, keeper].map((p) => [p.id, p]),
);

const board: Board = {
  id: 'test',
  formationId: '433',
  seeded: { GK: 'alisson' },
  required: { [edgeKey('GK', 'LCB')]: 'green', [edgeKey('GK', 'RCB')]: 'green' },
  referenceSolution: { GK: 'alisson', LCB: 'vandijk', RCB: 'konate' },
};

describe('isValidPlacement', () => {
  it('accepts a player satisfying every resolved link', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', vanDijk);
    expect(r.ok).toBe(true);
  });

  it('rejects a player failing a resolved link and names the failing edge', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', stranger);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failedEdges).toContain(edgeKey('GK', 'LCB'));
  });

  it('rejects a position-class mismatch', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', keeper);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('position');
  });

  it('ignores links whose other end is still empty', () => {
    // LCB-LCM and LCB-RCB are unresolved here, so only GK-LCB is checked.
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'LCB', vanDijk);
    expect(r.ok).toBe(true);
  });

  it('rejects placing into an already-filled slot', () => {
    const r = isValidPlacement(board, FORMATION_433, pool, { GK: 'alisson' }, 'GK', keeper);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('occupied');
  });
});

describe('scoreBoard', () => {
  it('reports zero chemistry for an empty board', () => {
    expect(scoreBoard(FORMATION_433, pool, {}).squadChemistry).toBe(0);
  });

  it('scores only links with both ends filled', () => {
    const s = scoreBoard(FORMATION_433, pool, { GK: 'alisson', LCB: 'vandijk' });
    // GK has 2 links, 1 resolved and green = 2 of 4 points -> 5.
    expect(s.perSlot['GK']).toBe(5);
    // LCB has 4 links, 1 resolved and green = 2 of 8 points -> round(2.5) = 3.
    expect(s.perSlot['LCB']).toBe(3);
    expect(s.squadChemistry).toBe(8);
  });

  it('does not report the board as solved below the gate', () => {
    expect(scoreBoard(FORMATION_433, pool, { GK: 'alisson' }).solved).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/puzzle/validate.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/puzzle/validate`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/puzzle/validate.ts`:

```typescript
import { linkColour, linkPoints, meetsRequirement } from '../chemistry/link';
import { playerChemistry, squadChemistry, CHEMISTRY_GATE } from '../chemistry/score';
import type { Player } from '../chemistry/types';
import { adjacentSlots, edgeKey, linkCountFor } from './edges';
import type { Board, Formation, Placement } from './types';

export type PlacementResult =
  | { ok: true }
  | { ok: false; reason: 'occupied' | 'position' | 'links'; failedEdges: string[] };

export interface BoardScore {
  perSlot: Record<string, number>;
  squadChemistry: number;
  solved: boolean;
}

/**
 * A link is inert until one end is solved, so a candidate is only ever checked
 * against links to already-filled neighbours. Every such link is visible to the
 * player by the progressive-reveal rule, which is what makes rejection fair.
 * Spec 4.1.
 */
export function isValidPlacement(
  board: Board,
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
  filled: Placement,
  slotId: string,
  candidate: Player,
): PlacementResult {
  if (filled[slotId] !== undefined) {
    return { ok: false, reason: 'occupied', failedEdges: [] };
  }

  const slot = formation.slots.find((s) => s.id === slotId);
  if (!slot) return { ok: false, reason: 'position', failedEdges: [] };
  if (!candidate.positions.includes(slot.position)) {
    return { ok: false, reason: 'position', failedEdges: [] };
  }

  const failedEdges: string[] = [];
  for (const otherId of adjacentSlots(formation, slotId)) {
    const otherPlayerId = filled[otherId];
    if (otherPlayerId === undefined) continue; // inert
    const other = pool.get(otherPlayerId);
    if (!other) continue;

    const key = edgeKey(slotId, otherId);
    const required = board.required[key] ?? 'any';
    if (!meetsRequirement(linkColour(candidate, other), required)) {
      failedEdges.push(key);
    }
  }

  return failedEdges.length === 0
    ? { ok: true }
    : { ok: false, reason: 'links', failedEdges };
}

export function scoreBoard(
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
  filled: Placement,
): BoardScore {
  const perSlot: Record<string, number> = {};

  for (const slot of formation.slots) {
    const playerId = filled[slot.id];
    if (playerId === undefined) {
      perSlot[slot.id] = 0;
      continue;
    }
    const player = pool.get(playerId);
    if (!player) {
      perSlot[slot.id] = 0;
      continue;
    }

    let earned = 0;
    for (const otherId of adjacentSlots(formation, slot.id)) {
      const otherPlayerId = filled[otherId];
      if (otherPlayerId === undefined) continue;
      const other = pool.get(otherPlayerId);
      if (!other) continue;
      earned += linkPoints(linkColour(player, other));
    }
    perSlot[slot.id] = playerChemistry(linkCountFor(formation, slot.id), earned);
  }

  const total = squadChemistry(Object.values(perSlot));
  const complete = formation.slots.every((s) => filled[s.id] !== undefined);

  return { perSlot, squadChemistry: total, solved: complete && total >= CHEMISTRY_GATE };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/puzzle/validate.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/puzzle/validate.ts tests/puzzle/validate.test.ts
git commit -m "feat: add placement validation and board scoring"
```

---

### Task 6: Solution enumeration and per-slot answer sets

Spec §9.2. This is the difficulty instrument, the source of the fame
distribution used for scoring, and most of the future generator.

**Files:**
- Create: `src/lib/puzzle/solve.ts`
- Test: `tests/puzzle/solve.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { enumerateSolutions } from '../../src/lib/puzzle/solve';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board, Formation } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

// A deliberately tiny 3-slot formation keeps the search space checkable by hand.
const TINY: Formation = {
  id: 'tiny',
  slots: [
    { id: 'A', position: 'GK', x: 0, y: 0 },
    { id: 'B', position: 'DEF', x: 0, y: 0 },
    { id: 'C', position: 'DEF', x: 0, y: 0 },
  ],
  adjacency: [['A', 'B'], ['B', 'C']],
};

const mk = (id: string, nation: string, clubs: string[], pos: Player['positions']): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: pos,
  fame: { value: 50, source: 'sitelinks' },
});

const gk = mk('gk', 'BRA', ['LIV'], ['GK']);
const d1 = mk('d1', 'NED', ['LIV'], ['DEF']);
const d2 = mk('d2', 'FRA', ['LIV'], ['DEF']);
const d3 = mk('d3', 'JPN', ['URAWA'], ['DEF']);

const pool = new Map([gk, d1, d2, d3].map((p) => [p.id, p]));

const board: Board = {
  id: 't',
  formationId: 'tiny',
  seeded: { A: 'gk' },
  required: { [edgeKey('A', 'B')]: 'green', [edgeKey('B', 'C')]: 'green' },
  referenceSolution: { A: 'gk', B: 'd1', C: 'd2' },
};

describe('enumerateSolutions', () => {
  it('finds every valid arrangement', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    // B and C must both be LIV defenders: d1/d2 or d2/d1. d3 shares nothing.
    expect(r.count).toBe(2);
    expect(r.truncated).toBe(false);
  });

  it('never places the same player twice', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    for (const sol of r.solutions) {
      expect(new Set(Object.values(sol)).size).toBe(Object.keys(sol).length);
    }
  });

  it('keeps the seeded players fixed', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    for (const sol of r.solutions) expect(sol['A']).toBe('gk');
  });

  it('reports per-slot answer sets drawn from actual solutions', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 100 });
    expect(new Set(r.answerSets['B'])).toEqual(new Set(['d1', 'd2']));
    expect(r.answerSets['A']).toEqual(['gk']);
  });

  it('flags truncation when the cap is hit', () => {
    const r = enumerateSolutions(board, TINY, pool, { maxSolutions: 1 });
    expect(r.count).toBe(1);
    expect(r.truncated).toBe(true);
  });

  it('returns zero for an unsatisfiable board', () => {
    const impossible: Board = {
      ...board,
      required: { [edgeKey('A', 'B')]: 'hyper', [edgeKey('B', 'C')]: 'hyper' },
    };
    const r = enumerateSolutions(impossible, TINY, pool, { maxSolutions: 100 });
    expect(r.count).toBe(0);
  });

  it('handles the real 4-3-3 without throwing', () => {
    const empty: Board = { id: 'e', formationId: '433', seeded: {}, required: {}, referenceSolution: {} };
    const r = enumerateSolutions(empty, FORMATION_433, pool, { maxSolutions: 5 });
    expect(r.count).toBe(0); // pool has too few players to fill eleven slots
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/puzzle/solve.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/puzzle/solve`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/puzzle/solve.ts`:

```typescript
import type { Player } from '../chemistry/types';
import { isValidPlacement } from './validate';
import type { Board, Formation, Placement } from './types';

export interface EnumerateOptions {
  /** Stop after this many solutions. Guards against combinatorial blow-up. */
  maxSolutions: number;
}

export interface EnumerateResult {
  count: number;
  truncated: boolean;
  solutions: Placement[];
  /** slotId -> every player id appearing there across all found solutions. */
  answerSets: Record<string, string[]>;
}

/**
 * Backtracking search over empty slots.
 *
 * Slots are ordered most-constrained-first, which prunes hard and mirrors how
 * a player experiences the board tightening. Spec 9.2.
 */
export function enumerateSolutions(
  board: Board,
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
  options: EnumerateOptions,
): EnumerateResult {
  const players = [...pool.values()];
  const empty = formation.slots
    .filter((s) => board.seeded[s.id] === undefined)
    .map((s) => s.id);

  // Candidate lists by position class, computed once.
  const byPosition = new Map<string, Player[]>();
  for (const slot of formation.slots) {
    byPosition.set(slot.id, players.filter((p) => p.positions.includes(slot.position)));
  }

  // Most-constrained-first: fewest position-eligible candidates goes earliest.
  const order = [...empty].sort(
    (a, b) => (byPosition.get(a)?.length ?? 0) - (byPosition.get(b)?.length ?? 0),
  );

  const solutions: Placement[] = [];
  const answerSets: Record<string, string[]> = {};
  const answerSeen: Record<string, Set<string>> = {};
  let truncated = false;

  for (const slot of formation.slots) {
    answerSets[slot.id] = [];
    answerSeen[slot.id] = new Set();
  }

  const used = new Set<string>(Object.values(board.seeded));

  function record(placement: Placement): void {
    solutions.push({ ...placement });
    for (const [slotId, playerId] of Object.entries(placement)) {
      const seen = answerSeen[slotId];
      if (seen && !seen.has(playerId)) {
        seen.add(playerId);
        answerSets[slotId]?.push(playerId);
      }
    }
  }

  function recurse(index: number, filled: Placement): void {
    if (solutions.length >= options.maxSolutions) {
      truncated = true;
      return;
    }
    if (index === order.length) {
      record(filled);
      return;
    }

    const slotId = order[index];
    if (slotId === undefined) return;

    for (const candidate of byPosition.get(slotId) ?? []) {
      if (used.has(candidate.id)) continue;
      if (!isValidPlacement(board, formation, pool, filled, slotId, candidate).ok) continue;

      used.add(candidate.id);
      recurse(index + 1, { ...filled, [slotId]: candidate.id });
      used.delete(candidate.id);

      if (solutions.length >= options.maxSolutions) {
        truncated = true;
        return;
      }
    }
  }

  recurse(0, { ...board.seeded });

  return { count: solutions.length, truncated, solutions, answerSets };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/puzzle/solve.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/puzzle/solve.ts tests/puzzle/solve.test.ts
git commit -m "feat: add capped solution enumeration with per-slot answer sets"
```

---

### Task 7: Slot-relative obscurity scoring

Spec §6.2. Scoring against the slot's own answer set rather than a global scale
is what cancels era bias — it compares Real Madrid strikers to Real Madrid
strikers, so fame only needs to be ordinally correct within a comparable group.

**Files:**
- Create: `src/lib/fame/obscurity.ts`
- Test: `tests/fame/obscurity.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { slotObscurityScore, boardObscurityScore } from '../../src/lib/fame/obscurity';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, fame: number): Player => ({
  id, name: id, aliases: [], nation: 'X', clubIds: [], leagueIds: [],
  positions: ['FWD'], fame: { value: fame, source: 'sitelinks' },
});

// Real measured values from spec 11.2.
const mbappe = mk('mbappe', 133);
const benzema = mk('benzema', 107);
const mariano = mk('mariano', 45);
const answerSet = [mbappe, benzema, mariano];

describe('slotObscurityScore', () => {
  it('rewards the least famous valid answer most', () => {
    const a = slotObscurityScore(mariano, answerSet);
    const b = slotObscurityScore(benzema, answerSet);
    const c = slotObscurityScore(mbappe, answerSet);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it('scores 100 for the most obscure and 0 for the most famous', () => {
    expect(slotObscurityScore(mariano, answerSet)).toBe(100);
    expect(slotObscurityScore(mbappe, answerSet)).toBe(0);
  });

  it('scores 50 when every valid answer is equally famous', () => {
    const flat = [mk('a', 20), mk('b', 20)];
    expect(slotObscurityScore(flat[0]!, flat)).toBe(50);
  });

  it('scores 50 for a single-answer slot, which carries no information', () => {
    expect(slotObscurityScore(mariano, [mariano])).toBe(50);
  });

  it('scores 0 for a player outside the answer set', () => {
    expect(slotObscurityScore(mk('other', 10), answerSet)).toBe(0);
  });
});

describe('boardObscurityScore', () => {
  it('averages the slot scores', () => {
    const total = boardObscurityScore(
      { ST: mariano, LW: mbappe },
      { ST: answerSet, LW: answerSet },
    );
    expect(total).toBe(50);
  });

  it('is zero for an empty board', () => {
    expect(boardObscurityScore({}, {})).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fame/obscurity.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/fame/obscurity`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/fame/obscurity.ts`:

```typescript
import type { Player } from '../chemistry/types';

/**
 * Score a placement 0..100 against the fame range of that slot's valid answers.
 * 100 is the most obscure valid answer, 0 the most famous.
 *
 * Scoring locally rather than globally cancels most era bias, because it
 * compares like with like. Fame therefore only needs to be ordinally correct
 * within a comparable group, not globally calibrated. Spec 6.2.
 */
export function slotObscurityScore(
  chosen: Player,
  answerSet: readonly Player[],
): number {
  if (answerSet.length === 0) return 0;
  if (!answerSet.some((p) => p.id === chosen.id)) return 0;
  if (answerSet.length === 1) return 50;

  const values = answerSet.map((p) => p.fame.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;

  return Math.round(((max - chosen.fame.value) / (max - min)) * 100);
}

export function boardObscurityScore(
  placed: Readonly<Record<string, Player>>,
  answerSets: Readonly<Record<string, readonly Player[]>>,
): number {
  const slots = Object.keys(placed);
  if (slots.length === 0) return 0;

  const total = slots.reduce(
    (sum, slotId) => sum + slotObscurityScore(placed[slotId]!, answerSets[slotId] ?? []),
    0,
  );
  return Math.round(total / slots.length);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/fame/obscurity.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fame/obscurity.ts tests/fame/obscurity.test.ts
git commit -m "feat: add slot-relative obscurity scoring"
```

---

### Task 8: Wikidata client and query builders

Spec §8.1 and §8.3. The three traps are encoded here and asserted in Task 9.

**Files:**
- Create: `src/pipeline/sparql.ts`
- Create: `src/pipeline/queries.ts`
- Test: `tests/pipeline/queries.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { clubRosterQuery } from '../../src/pipeline/queries';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pipeline/queries.test.ts`
Expected: FAIL — cannot resolve `../../src/pipeline/queries`.

- [ ] **Step 3: Create `src/pipeline/sparql.ts`**

```typescript
const ENDPOINT = 'https://query.wikidata.org/sparql';

/** Wikidata rejects requests without a User-Agent. Spec 8.3. */
const USER_AGENT = 'RecallXI/0.1 (https://github.com/recall-xi)';

export interface SparqlBinding {
  [key: string]: { value: string; type: string } | undefined;
}

export interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

export async function runQuery(query: string): Promise<SparqlResponse> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    // 502 usually means the query timed out. Unbounded CONTAINS filters over
    // labels are the common cause — always bound by club. Spec 8.3.
    throw new Error(`SPARQL ${res.status}: bound the query more tightly`);
  }
  return (await res.json()) as SparqlResponse;
}
```

- [ ] **Step 4: Create `src/pipeline/queries.ts`**

```typescript
/**
 * Every club spell for every player who ever appeared for `clubQid`.
 *
 * Three non-obvious rules are load-bearing, and breaking any of them produces a
 * plausible-looking file that is silently wrong. See spec 8.1.
 *
 *   1. p:/ps: traversal, never wdt: — wdt: returns best-rank only.
 *   2. COALESCE(en, mul) — names have migrated to the mul language code.
 *   3. Occupation filter — excludes book editions and video-game characters.
 */
export function clubRosterQuery(clubQid: string): string {
  return `
SELECT DISTINCT ?player ?name ?sitelinks ?club ?clubLabel ?start ?end ?nation ?position WHERE {
  ?player p:P54 ?anchor .
  ?anchor ps:P54 wd:${clubQid} .
  ?player wdt:P106 wd:Q937857 .
  ?player wikibase:sitelinks ?sitelinks .

  ?player p:P54 ?spell .
  ?spell ps:P54 ?club .
  OPTIONAL { ?spell pq:P580 ?start }
  OPTIONAL { ?spell pq:P582 ?end }

  OPTIONAL { ?player wdt:P27 ?nation }
  OPTIONAL { ?player wdt:P413 ?position }

  OPTIONAL { ?player rdfs:label ?en  FILTER(LANG(?en)  = "en")  }
  OPTIONAL { ?player rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)
  FILTER(BOUND(?name))

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}`.trim();
}

/** Club to league, needed for the league dimension of the link table. */
export function clubLeagueQuery(clubQids: readonly string[]): string {
  const values = clubQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?club ?clubLabel ?league ?leagueLabel WHERE {
  VALUES ?club { ${values} }
  OPTIONAL { ?club wdt:P118 ?league }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}`.trim();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/pipeline/queries.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline/sparql.ts src/pipeline/queries.ts tests/pipeline/queries.test.ts
git commit -m "feat: add Wikidata SPARQL client and trap-safe query builders"
```

---

### Task 9: Normalisation, pool filters, and the fetch CLI

Spec §7.3. The fame floor is what stops the score selecting unknowable academy
players, per the §11.4 measurement.

**Files:**
- Create: `src/pipeline/normalise.ts`
- Create: `src/pipeline/pool.ts`
- Create: `scripts/fetch-club.ts`
- Create: `scripts/build-pool.ts`
- Test: `tests/pipeline/pool.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../../src/pipeline/pool';
import type { RawPlayer } from '../../src/pipeline/normalise';

const raw = (
  id: string, name: string, sitelinks: number, firstSpell: number | null,
): RawPlayer => ({
  id, name, sitelinks, aliases: [], nation: 'ESP',
  positions: ['FWD'],
  clubs: [{ clubId: 'Q8682', leagueId: 'LIGA', from: firstSpell, to: null }],
});

describe('applyPoolFilters', () => {
  const players = [
    raw('mbappe', 'Kylian Mbappé', 133, 2024),
    raw('mariano', 'Mariano Díaz', 45, 2011),
    raw('unknown', 'Jose Martinez Lopez', 0, 2016),   // academy, spec 11.4
    // Sitelinks deliberately ABOVE the fame floor so this row isolates the era
    // filter. At 12 it would be removed by fame, and the era test below would
    // still pass with the era filter deleted.
    raw('prewar', 'Félix Quesada', 60, 1926),         // pre-war, spec 11.4
  ];

  it('removes players below the fame floor', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).not.toContain('unknown');
  });

  it('removes players outside the era bound', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).not.toContain('prewar');
  });

  it('keeps recognisable deep cuts', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).toContain('mariano');
  });

  it('keeps household names', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    expect(out.map((p) => p.id)).toContain('mbappe');
  });

  it('treats the fame floor as tunable, since it varies by league', () => {
    const strict = applyPoolFilters(players, { ...DEFAULT_POOL_RULES, fameFloor: 100 });
    expect(strict.map((p) => p.id)).toEqual(['mbappe']);
  });

  it('drops players with no dated spell rather than guessing an era', () => {
    const undated = [raw('undated', 'Someone', 60, null)];
    expect(applyPoolFilters(undated, DEFAULT_POOL_RULES)).toHaveLength(0);
  });

  it('sets fame from sitelinks', () => {
    const out = applyPoolFilters(players, DEFAULT_POOL_RULES);
    const m = out.find((p) => p.id === 'mariano');
    expect(m?.fame).toEqual({ value: 45, source: 'sitelinks' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pipeline/pool.test.ts`
Expected: FAIL — cannot resolve `../../src/pipeline/pool`.

- [ ] **Step 3: Create `src/pipeline/normalise.ts`**

```typescript
import type { PositionClass } from '../lib/chemistry/types';
import type { SparqlBinding } from './sparql';

export interface RawSpell {
  clubId: string;
  leagueId: string;
  from: number | null;
  to: number | null;
}

export interface RawPlayer {
  id: string;
  name: string;
  aliases: string[];
  nation: string;
  sitelinks: number;
  positions: PositionClass[];
  clubs: RawSpell[];
}

const qid = (uri: string): string => uri.split('/').pop() ?? uri;
const year = (iso: string | undefined): number | null =>
  iso ? Number.parseInt(iso.slice(0, 4), 10) : null;

/**
 * P413 is coarse — Mbappe's whole record is one value. We map to GK/DEF/MID/FWD
 * and no finer, which is all spec 5.3 requires.
 */
const POSITION_CLASS: Record<string, PositionClass> = {
  Q201330: 'GK',   // goalkeeper
  Q2005335: 'DEF', // defender
  Q17505298: 'DEF',// centre-back
  Q3341015: 'DEF', // full-back
  Q193592: 'MID',  // midfielder
  Q1379556: 'MID', // defensive midfielder
  Q1932482: 'MID', // attacking midfielder
  Q280658: 'FWD',  // forward
  Q21057452: 'FWD',// winger
  Q1130256: 'FWD', // striker
};

export function positionClassOf(positionQid: string): PositionClass | null {
  return POSITION_CLASS[positionQid] ?? null;
}

/** Collapse the row-per-spell SPARQL result into one record per player. */
export function normalise(
  bindings: readonly SparqlBinding[],
  clubToLeague: ReadonlyMap<string, string>,
): RawPlayer[] {
  const byId = new Map<string, RawPlayer>();

  for (const b of bindings) {
    const playerUri = b['player']?.value;
    const name = b['name']?.value;
    if (!playerUri || !name) continue;

    const id = qid(playerUri);
    let player = byId.get(id);
    if (!player) {
      player = {
        id, name, aliases: [],
        nation: b['nation'] ? qid(b['nation'].value) : 'UNKNOWN',
        sitelinks: Number.parseInt(b['sitelinks']?.value ?? '0', 10),
        positions: [], clubs: [],
      };
      byId.set(id, player);
    }

    const posUri = b['position']?.value;
    if (posUri) {
      const cls = positionClassOf(qid(posUri));
      if (cls && !player.positions.includes(cls)) player.positions.push(cls);
    }

    const clubUri = b['club']?.value;
    if (clubUri) {
      const clubId = qid(clubUri);
      const from = year(b['start']?.value);
      const already = player.clubs.some((c) => c.clubId === clubId && c.from === from);
      if (!already) {
        player.clubs.push({
          clubId,
          leagueId: clubToLeague.get(clubId) ?? `UNKNOWN_${clubId}`,
          from,
          to: year(b['end']?.value),
        });
      }
    }
  }

  return [...byId.values()];
}
```

- [ ] **Step 4: Create `src/pipeline/pool.ts`**

```typescript
import type { Player } from '../lib/chemistry/types';
import type { RawPlayer } from './normalise';

export interface PoolRules {
  /** Minimum sitelinks. Per-league tunable, not a global constant. Spec 7.3. */
  fameFloor: number;
  /** Earliest spell start year. Spec 7.3. */
  eraFrom: number;
}

/**
 * Initial values from spec 14. The floor exists because pure lowest-fame-wins
 * selects academy players nobody can recognise, which destroys the social proof
 * the score exists for. Spec 6.3.
 */
export const DEFAULT_POOL_RULES: PoolRules = { fameFloor: 20, eraFrom: 1992 };

export function applyPoolFilters(
  players: readonly RawPlayer[],
  rules: PoolRules,
): Player[] {
  const out: Player[] = [];

  for (const p of players) {
    if (p.sitelinks < rules.fameFloor) continue;

    const years = p.clubs.map((c) => c.from).filter((y): y is number => y !== null);
    // No dated spell means we cannot place them in an era. Drop rather than guess.
    if (years.length === 0) continue;
    if (Math.max(...years) < rules.eraFrom) continue;

    if (p.positions.length === 0) continue;

    out.push({
      id: p.id,
      name: p.name,
      aliases: p.aliases,
      nation: p.nation,
      positions: p.positions,
      clubIds: [...new Set(p.clubs.map((c) => c.clubId))],
      leagueIds: [...new Set(p.clubs.map((c) => c.leagueId))],
      fame: { value: p.sitelinks, source: 'sitelinks' },
    });
  }

  return out;
}
```

- [ ] **Step 5: Create `scripts/fetch-club.ts`**

```typescript
import { writeFile, mkdir } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { clubRosterQuery } from '../src/pipeline/queries';

const clubQid = process.argv[2];
if (!clubQid) {
  console.error('usage: npm run fetch:club -- <clubQid>   e.g. Q8682');
  process.exit(1);
}

const res = await runQuery(clubRosterQuery(clubQid));
await mkdir('data/raw', { recursive: true });
await writeFile(`data/raw/${clubQid}.json`, JSON.stringify(res, null, 2));
console.log(`${clubQid}: ${res.results.bindings.length} rows -> data/raw/${clubQid}.json`);
```

- [ ] **Step 6: Create `scripts/build-pool.ts`**

```typescript
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { normalise } from '../src/pipeline/normalise';
import { applyPoolFilters, DEFAULT_POOL_RULES } from '../src/pipeline/pool';
import { runQuery } from '../src/pipeline/sparql';
import { clubLeagueQuery } from '../src/pipeline/queries';
import type { SparqlResponse } from '../src/pipeline/sparql';

const files = (await readdir('data/raw')).filter((f) => f.endsWith('.json'));
const bindings = [];
for (const f of files) {
  const parsed = JSON.parse(await readFile(`data/raw/${f}`, 'utf8')) as SparqlResponse;
  bindings.push(...parsed.results.bindings);
}

const clubQids = [
  ...new Set(bindings.map((b) => b['club']?.value.split('/').pop()).filter(Boolean)),
] as string[];

const leagueRes = await runQuery(clubLeagueQuery(clubQids));
const clubToLeague = new Map<string, string>();
for (const b of leagueRes.results.bindings) {
  const club = b['club']?.value.split('/').pop();
  const league = b['league']?.value.split('/').pop();
  if (club && league) clubToLeague.set(club, league);
}

const raw = normalise(bindings, clubToLeague);
const pool = applyPoolFilters(raw, DEFAULT_POOL_RULES);

await mkdir('data', { recursive: true });
await writeFile('data/pool.json', JSON.stringify(pool, null, 2));
console.log(`${raw.length} raw -> ${pool.length} in pool -> data/pool.json`);
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npx vitest run tests/pipeline/pool.test.ts && npm run typecheck`
Expected: PASS, 7 tests, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/pipeline/normalise.ts src/pipeline/pool.ts scripts/fetch-club.ts scripts/build-pool.ts tests/pipeline/pool.test.ts
git commit -m "feat: add normalisation, pool filters and pipeline CLIs"
```

---

### Task 10: Real-boundary regression tests

Spec §12. Task 8 asserts the query *text* is right. That is not the same as the
*data* being right, and the spec names three data assertions directly. These are
the failures that pass silently otherwise — a green unit suite over a corrupt
pool.

Tests run against a recorded fixture so they are fast and offline. A separate
script hits the live endpoint and is run deliberately, not in CI.

**Files:**
- Create: `tests/fixtures/README.md`
- Create: `scripts/record-fixture.ts`
- Create: `scripts/spot-check.ts`
- Test: `tests/pipeline/traps.test.ts`

- [ ] **Step 1: Create `scripts/record-fixture.ts`**

```typescript
import { writeFile, mkdir } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import { clubRosterQuery } from '../src/pipeline/queries';

// Real Madrid is the fixture club: it contains all three traps at once —
// Mbappe (mul label + preferred rank) and Julio Iglesias (contamination).
const res = await runQuery(clubRosterQuery('Q8682'));
await mkdir('tests/fixtures', { recursive: true });
await writeFile('tests/fixtures/Q8682.json', JSON.stringify(res, null, 2));
console.log(`recorded ${res.results.bindings.length} rows -> tests/fixtures/Q8682.json`);
```

- [ ] **Step 2: Record the fixture**

Run: `npx tsx scripts/record-fixture.ts`
Expected: a row count in the thousands, and `tests/fixtures/Q8682.json` written.

- [ ] **Step 3: Create `tests/fixtures/README.md`**

```markdown
# Recorded SPARQL fixtures

`Q8682.json` is a pinned Real Madrid response, regenerated with
`npx tsx scripts/record-fixture.ts`.

Real Madrid is the fixture club because it exhibits all three pipeline traps
from spec 8.1 simultaneously: Kylian Mbappé (name only under `mul`, Real Madrid
spell at `preferred` rank) and Julio Iglesias (a singer with a Castilla spell).

Regenerate deliberately and review the diff — Wikidata is community-edited and
changes underneath you. Spec 8.2.
```

- [ ] **Step 4: Write the failing test**

```typescript
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
    // His name exists only under the mul language code. An en-only label
    // service yields "Q21621995" and he silently vanishes from the pool.
    const m = byName('Kylian Mbappé');
    expect(m, 'Mbappé missing — the mul label fallback has regressed').toBeDefined();
    expect(m!.id).toBe('Q21621995');
  });

  it('trap 1: no player is named as a bare QID', () => {
    const qidNamed = raw.filter((p) => /^Q\d+$/.test(p.name));
    expect(qidNamed, `${qidNamed.length} players fell back to QIDs`).toHaveLength(0);
  });

  it('trap 2: Mbappé has more than one club', () => {
    // wdt:P54 collapses him from 7 clubs to 1 because Real Madrid is
    // preferred-rank. That would gut the "ever played for" model.
    const m = byName('Kylian Mbappé');
    expect(m!.clubs.length).toBeGreaterThan(1);
  });

  it('trap 2: Mbappé links to both Real Madrid and PSG', () => {
    const clubs = byName('Kylian Mbappé')!.clubs.map((c) => c.clubId);
    expect(clubs).toContain('Q8682');
    expect(clubs).toContain('Q483020');
  });

  it('trap 3: Julio Iglesias is not in the finished pool', () => {
    // He kept goal for Castilla and ranks ~20th by sitelinks. Famous as a
    // singer, not a footballer. Contamination the pool must exclude.
    const pool = applyPoolFilters(raw, DEFAULT_POOL_RULES);
    expect(pool.find((p) => p.name === 'Julio Iglesias')).toBeUndefined();
  });

  it('sanity: the fixture is large enough to be meaningful', () => {
    expect(raw.length).toBeGreaterThan(500);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run tests/pipeline/traps.test.ts`
Expected: FAIL on trap 3. The occupation filter in `clubRosterQuery` keeps Julio
Iglesias, because he genuinely holds occupation `association football player` on
Wikidata. Occupation alone is not enough.

- [ ] **Step 6: Add a notability guard to the query**

The fix is not a name blocklist. Iglesias is famous for singing, so his sitelink
count measures the wrong thing — exactly the failure spec §7.2 warns about.
Exclude people whose notability is not football.

Add to `src/pipeline/queries.ts`, inside `clubRosterQuery` immediately before the
`SERVICE wikibase:label` line:

```sparql
  # Exclude people whose notability is not football. Spec 8.1 trap 3.
  FILTER NOT EXISTS {
    ?player wdt:P106 ?other .
    VALUES ?other { wd:Q177220 wd:Q639669 wd:Q33999 wd:Q2405480 }
  }
```

Those QIDs are singer, musician, actor and voice actor.

- [ ] **Step 7: Re-record the fixture and re-run**

Run: `npx tsx scripts/record-fixture.ts && npx vitest run tests/pipeline/traps.test.ts`
Expected: PASS, 6 tests.

If a player you expect is now missing, the exclusion list is too broad — narrow
the `VALUES` list rather than widening it.

- [ ] **Step 8: Create `scripts/spot-check.ts`**

```typescript
import { readFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';

/**
 * Samples the pool and prints each player with clubs and nation, for manual
 * comparison against Wikidata.
 *
 * Deliberately manual. Unit tests happily pass over data claiming a player
 * appeared for a club they never played for, and no automated check catches
 * that. Spec 12.
 */
const n = Number.parseInt(process.argv[2] ?? '20', 10);
const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];

const sample = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
for (const p of sample) {
  console.log(`\n${p.name}  [${p.id}]  fame=${p.fame.value}  ${p.nation}`);
  console.log(`  positions: ${p.positions.join(', ')}`);
  console.log(`  clubs:     ${p.clubIds.join(', ')}`);
  console.log(`  check:     https://www.wikidata.org/wiki/${p.id}`);
}
console.log(`\n${n} players sampled. Open a few and confirm clubs and nation.`);
console.log('Record anything wrong in docs/superpowers/plans/coverage-findings.md.');
```

- [ ] **Step 9: Commit**

```bash
git add tests/pipeline/traps.test.ts tests/fixtures scripts/record-fixture.ts scripts/spot-check.ts src/pipeline/queries.ts
git commit -m "test: add data-level pipeline trap regressions and spot-check script"
```

---

### Task 11: The go/no-go coverage report

Spec §16 steps 1–3. **This is the gate.** Real Madrid is the best-documented club
on earth, so every figure in spec §11 is a best case. This task measures clubs
outside that comfort zone.

**Files:**
- Create: `scripts/coverage-report.ts`
- Create: `docs/superpowers/plans/coverage-findings.md` (output of the run)

- [ ] **Step 1: Create `scripts/coverage-report.ts`**

```typescript
import { readFile } from 'node:fs/promises';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
}

const byClub = new Map<string, Player[]>();
for (const p of pool) {
  for (const c of p.clubIds) {
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p);
  }
}

console.log('club       n    min  p25  med  p75  max   deep(<=30)  famous(>=80)');
for (const [club, players] of [...byClub.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  const f = players.map((p) => p.fame.value).sort((a, b) => a - b);
  const deep = players.filter((p) => p.fame.value <= 30).length;
  const famous = players.filter((p) => p.fame.value >= 80).length;
  console.log(
    club.padEnd(10),
    String(players.length).padStart(4),
    String(f[0] ?? 0).padStart(5),
    String(percentile(f, 0.25)).padStart(4),
    String(percentile(f, 0.5)).padStart(4),
    String(percentile(f, 0.75)).padStart(4),
    String(f[f.length - 1] ?? 0).padStart(5),
    String(deep).padStart(11),
    String(famous).padStart(13),
  );
}

console.log(`\ntotal pool: ${pool.length}`);
console.log('GATE: a club needs enough spread that deep cuts exist AND are recognisable.');
console.log('If deep(<=30) is near zero outside elite clubs, raise the era bound or');
console.log('lower the fame floor per league before building any UI. Spec 16.');
```

- [ ] **Step 2: Fetch a deliberately varied set of clubs**

One elite club, one mid-table side from a big league, and one outside the top
five leagues. This is the whole point of the task.

```bash
npm run fetch:club -- Q8682    # Real Madrid — the known best case
npm run fetch:club -- Q18656   # Southampton — mid-table Premier League
npm run fetch:club -- Q1130849 # Feyenoord — outside the top five leagues
```

Expected: three files in `data/raw/`, each reporting its row count.

- [ ] **Step 3: Build the pool**

Run: `npm run build:pool`
Expected: a line reading `N raw -> M in pool -> data/pool.json`, with M well below N.

- [ ] **Step 4: Run the report**

Run: `npm run report:coverage`
Expected: a per-club table of fame distribution.

- [ ] **Step 5: Record the findings and make the call**

Create `docs/superpowers/plans/coverage-findings.md` with the table, and answer
in one line each:

1. Does every club have players in the `deep(<=30)` band, or only Real Madrid?
2. Are those deep cuts recognisable names, or academy filler? Read twenty aloud.
3. Does the `fameFloor` of 20 need to differ per league?

**Gate:** if deep cuts are absent or unrecognisable outside elite clubs, stop.
Re-tune `fameFloor` and `eraFrom` and re-run before any further work. Spec §16
exists precisely so this is discovered here rather than after a UI is built.

- [ ] **Step 6: Commit**

```bash
git add scripts/coverage-report.ts docs/superpowers/plans/coverage-findings.md data/pool.json
git commit -m "feat: add coverage report and record go/no-go findings"
```

---

### Task 12: Three hand-made boards

Only start this once Task 11's gate has passed.

**Files:**
- Create: `content/puzzles/001.json`, `002.json`, `003.json`
- Create: `scripts/check-board.ts`
- Test: `tests/content/boards.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { enumerateSolutions } from '../../src/lib/puzzle/solve';
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
        expect(pool.has(id)).toBe(true);
      }
    });

    it(`${file}: has at least one solution`, () => {
      const r = enumerateSolutions(board, formation, pool, { maxSolutions: 1 });
      expect(r.count).toBeGreaterThan(0);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it is skipped**

Run: `npx vitest run tests/content/boards.test.ts`
Expected: tests skipped — no boards exist yet. This confirms the guard works.

- [ ] **Step 3: Create `scripts/check-board.ts`**

This is the authoring aid from spec §9.2. It must print the full answer set per
slot for human review, which is what catches a missing player before a board
ships.

```typescript
import { readFile } from 'node:fs/promises';
import { enumerateSolutions } from '../src/lib/puzzle/solve';
import { scoreBoard } from '../src/lib/puzzle/validate';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import type { Board } from '../src/lib/puzzle/types';
import type { Player } from '../src/lib/chemistry/types';

const path = process.argv[2];
if (!path) {
  console.error('usage: npx tsx scripts/check-board.ts content/puzzles/001.json');
  process.exit(1);
}

const board = JSON.parse(await readFile(path, 'utf8')) as Board;
const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const pool = new Map(players.map((p) => [p.id, p]));
const formation = FORMATIONS[board.formationId];
if (!formation) throw new Error(`unknown formation ${board.formationId}`);

const score = scoreBoard(formation, pool, board.referenceSolution);
console.log(`chemistry ${score.squadChemistry}/110   solved=${score.solved}`);

const r = enumerateSolutions(board, formation, pool, { maxSolutions: 20000 });
console.log(`solutions: ${r.count}${r.truncated ? '+ (truncated)' : ''}\n`);

for (const slot of formation.slots) {
  const ids = r.answerSets[slot.id] ?? [];
  const named = ids
    .map((id) => pool.get(id))
    .filter((p): p is Player => p !== undefined)
    .sort((a, b) => a.fame.value - b.fame.value);

  console.log(`${slot.id} (${slot.position}) — ${named.length} valid answers`);
  for (const p of named.slice(0, 25)) {
    console.log(`    ${String(p.fame.value).padStart(4)}  ${p.name}`);
  }
  if (named.length > 25) console.log(`    ... and ${named.length - 25} more`);
  console.log('');
}

console.log('REVIEW: read the answer sets. A missing obvious player means a pool gap.');
console.log('Tens of thousands of solutions means the board is too loose;');
console.log('single digits means it is trial and error. Spec 9.2.');
```

- [ ] **Step 4: Author board 001**

Pick eleven real players from `data/pool.json`, place them in the 4-3-3, and
derive `required` from the links their arrangement actually produces. Start from
a club core so the links resolve, then loosen edges to `any` until the solution
count lands in a sane range.

Create `content/puzzles/001.json`:

```json
{
  "id": "001",
  "formationId": "433",
  "seeded": { "GK": "REPLACE_WITH_REAL_QID", "ST": "REPLACE_WITH_REAL_QID" },
  "required": {},
  "referenceSolution": {}
}
```

Fill `referenceSolution` with all eleven slot-to-QID pairs from the pool, set
`seeded` to two of them, and populate `required` using the output of Step 5.

- [ ] **Step 5: Check the board and iterate**

Run: `npx tsx scripts/check-board.ts content/puzzles/001.json`

Target: **solution count between roughly 50 and 5,000**, and answer sets whose
low-fame end reads as recognisable players. Adjust `required` (tighten to
`green`, loosen to `any`) and re-run until both hold.

- [ ] **Step 6: Repeat for boards 002 and 003**

Aim for a range: one loose, one tight, one in between. Record the solution count
of each in `docs/superpowers/plans/coverage-findings.md`.

- [ ] **Step 7: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: all tests pass, board tests now active rather than skipped.

- [ ] **Step 8: Commit**

```bash
git add content/puzzles scripts/check-board.ts tests/content/boards.test.ts docs/superpowers/plans/coverage-findings.md
git commit -m "feat: add board authoring checker and first three boards"
```

---

## What this plan deliberately excludes

Per spec §13 and the split at the top: no UI, no pitch rendering, no search or
autocomplete, no submission budget, no share mechanic, no daily mode, no
generator, no pageview or pick-rate fame. Those belong to the next plan, written
after Task 11's gate is answered.

The submission budget, medal thresholds and share format are specified in §4.2,
§6.2 and §14 but are player-facing, so they are implemented alongside the UI
rather than here.

## Definition of done

- `npm test` passes and `npm run typecheck` is clean.
- `data/pool.json` is committed as a pinned snapshot, covering at least three
  clubs of varying profile.
- `docs/superpowers/plans/coverage-findings.md` answers the three gate questions.
- Three boards exist, each with a validating reference solution and a recorded
  solution count.
- The Task 11 gate has been explicitly passed or failed in writing.
