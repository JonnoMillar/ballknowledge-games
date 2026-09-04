# Recall XI Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable prototype of board 003 — search, library, drag-to-position, live chemistry, one scored submission — so we find out whether the game is any good.

**Architecture:** Next.js App Router, one page, client-side. The board state is a pure reducer with no React in it, tested independently; components render it. Reuses `lib/chemistry` and `lib/puzzle` unchanged — the prototype adds no game rules, it exposes the ones already built and tested.

**Tech Stack:** Next.js 15, React 19, TypeScript, `@dnd-kit/core` for dragging, `flag-icons` for nation flags. All open source, nothing paid.

**Spec:** `docs/superpowers/specs/2026-09-03-recall-xi-design.md`
**Visual reference:** `design/Main.dc.html` — the settled direction. Copy its values.

---

## Spec amendment this plan makes

**The submission budget (§4.2) is replaced by free experimentation plus one scored submission.**

§4.2 made every placement cost, valid or invalid, to stop brute-forcing the autocomplete. A drag-from-library workspace makes that unenforceable and, on reflection, unnecessary: **fame is hidden, so free experimentation only helps a player satisfy the chemistry gate — it gives them nothing toward finding an obscure answer.** Dragging until the links turn green solves the constraint; it does not improve the score.

What this trades away: the deduction half gets easier, because a player can reach chemistry 100 by trial rather than reasoning. The game leans fully onto football knowledge. Since obscurity is the score and chemistry is only the gate (§6.1), that is the right side to lean on.

Everything else in §6 stands unchanged. **Fame stays hidden until a player is placed — that is now the single load-bearing rule of the whole design.**

## The rule that must not break

**The pool is searched, never listed.** No suggestions, no recent searches, no "players you might mean", no popular picks, no default results on an empty query. Search returns nothing until the player types, and only what they typed matches.

A mockup already shipped with three suggested names under an open slot; all three were valid answers for it and the first was the board's deep cut. `scripts/leak-check.ts` exists to catch exactly this and must pass on the prototype.

---

## File structure

| File | Responsibility |
|---|---|
| `app/layout.tsx`, `app/page.tsx` | Next.js shell; loads pool + board, renders `<Game>` |
| `app/globals.css` | Tokens lifted from `design/Main.dc.html` |
| `src/game/state.ts` | Pure reducer: placements, library, submission. No React. |
| `src/game/derive.ts` | Selectors: link states, per-slot chemistry, whether a drop is legal |
| `src/lib/search/index.ts` | Name index over the pool, diacritic-folded, alias-aware |
| `src/pipeline/nations.ts` | Nation QID → ISO 3166-1 alpha-2, for flags |
| `scripts/fetch-nations.ts` | Offline: builds `data/nations.json` |
| `components/Game.tsx` | Composition root, dnd-kit context, layout |
| `components/Pitch.tsx` | Formation, slots, SVG links |
| `components/PlayerCard.tsx` | The card. Draggable. Flag, fame, name. |
| `components/Library.tsx` | Left rail, scrollable, drop target |
| `components/SearchPanel.tsx` | Right rail, search only |
| `components/ChemistryBar.tsx` | Header meter + gate marker |

`src/lib/chemistry` and `src/lib/puzzle` are **not modified by this plan.**

---

### Task 1: Nation flags data

Cards need flags, which needs an ISO code per nation QID. `flag-icons` keys off
alpha-2 codes; Wikidata carries them on `P297`.

**Files:**
- Create: `src/pipeline/nations.ts`
- Create: `scripts/fetch-nations.ts`
- Test: `tests/pipeline/nations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { isoForNation } from '../../src/pipeline/nations';

const has = existsSync('data/nations.json');
const map: Record<string, string> = has
  ? JSON.parse(readFileSync('data/nations.json', 'utf8'))
  : {};

describe('isoForNation', () => {
  it('returns a lowercase two-letter code', () => {
    expect(isoForNation('Q145', { Q145: 'GB' })).toBe('gb');
  });

  it('returns null for an unmapped nation rather than guessing', () => {
    expect(isoForNation('Q99999', {})).toBeNull();
  });
});

describe.skipIf(!has)('data/nations.json', () => {
  it('covers the nations on board 003', () => {
    // Italy, Belgium, Netherlands, Spain, Brazil, UK, Argentina, Nigeria.
    for (const q of ['Q38', 'Q31', 'Q29999', 'Q29', 'Q155', 'Q145', 'Q414', 'Q1033']) {
      expect(map[q], `${q} has no ISO code`).toBeDefined();
    }
  });

  it('has plausible codes throughout', () => {
    for (const [q, iso] of Object.entries(map)) {
      expect(iso, `${q} -> ${iso}`).toMatch(/^[A-Z]{2}$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pipeline/nations.test.ts`
Expected: FAIL — cannot resolve `../../src/pipeline/nations`.

- [ ] **Step 3: Write the implementation**

Create `src/pipeline/nations.ts`:

```typescript
/**
 * Nation QID -> ISO 3166-1 alpha-2, for flag rendering.
 *
 * Returns null rather than guessing: an unmapped nation renders no flag, which
 * is correct. A wrong flag on a player card is worse than none.
 */
export function isoForNation(
  nationQid: string,
  map: Readonly<Record<string, string>>,
): string | null {
  const iso = map[nationQid];
  return iso ? iso.toLowerCase() : null;
}
```

Create `scripts/fetch-nations.ts`:

```typescript
import { readFile, writeFile } from 'node:fs/promises';
import { runQuery } from '../src/pipeline/sparql';
import type { Player } from '../src/lib/chemistry/types';

const pool = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
const nations = [...new Set(pool.map((p) => p.nation))].filter((n) => n !== 'UNKNOWN');
console.log(`${nations.length} distinct nations in pool`);

const out: Record<string, string> = {};
const CHUNK = 300;
for (let i = 0; i < nations.length; i += CHUNK) {
  const values = nations.slice(i, i + CHUNK).map((q) => `wd:${q}`).join(' ');
  const res = await runQuery(`
SELECT ?n ?iso WHERE {
  VALUES ?n { ${values} }
  ?n wdt:P297 ?iso .
}`.trim());
  for (const b of res.results.bindings) {
    const q = b['n']?.value.split('/').pop();
    const iso = b['iso']?.value;
    if (q && iso) out[q] = iso;
  }
}

await writeFile('data/nations.json', JSON.stringify(out, null, 2));
const missing = nations.filter((n) => !out[n]);
console.log(`${Object.keys(out).length} mapped, ${missing.length} without an ISO code`);
if (missing.length) console.log(`  unmapped: ${missing.slice(0, 20).join(', ')}`);
```

- [ ] **Step 4: Fetch and verify**

Run: `npx tsx scripts/fetch-nations.ts && npx vitest run tests/pipeline/nations.test.ts`
Expected: a mapped count near the nation total, then PASS.

Historic states (Soviet Union, Yugoslavia, Serbia and Montenegro) legitimately
have no current alpha-2 code. Those render without a flag — do not invent one.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/nations.ts scripts/fetch-nations.ts tests/pipeline/nations.test.ts data/nations.json
git commit -m "feat: add nation ISO code mapping for flags"
```

---

### Task 2: Next.js scaffold

**Files:**
- Modify: `package.json`
- Create: `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Install**

```bash
npm install next@15 react@19 react-dom@19 @dnd-kit/core flag-icons
npm install -D @types/react @types/react-dom
```

- [ ] **Step 2: Add scripts to `package.json`**

Add to the `scripts` block, keeping the existing entries:

```json
    "dev": "next dev",
    "build": "next build",
    "fetch:nations": "tsx scripts/fetch-nations.ts"
```

- [ ] **Step 3: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  // data/pool.json is ~3 MB and imported directly by the page. Fine for a
  // prototype; revisit before shipping (trim fields, or serve it as an asset).
  experimental: { largePageDataBytes: 8 * 1024 * 1024 },
};

export default config;
```

- [ ] **Step 4: Create `app/globals.css`**

Tokens lifted verbatim from `design/Main.dc.html` — do not re-pick colours.

```css
@import 'flag-icons/css/flag-icons.min.css';

:root {
  --bg: #0a0e16;
  --bg-deep: #070b12;
  --panel: #111c2f;
  --panel-2: #16223a;
  --line: #1d2942;
  --border: #26364f;
  --card-a: #1e3450;
  --card-b: #142136;
  --given-a: #24405f;
  --given-b: #16263f;
  --text: #eef2f8;
  --muted: #64789a;
  --dim: #4f658a;
  --soft: #7e97bb;
  --green: #5ee08a;
  --green-dim: #3fbf6d;
  --green-pill: #1f7a48;
  --gold: #f0b429;
  --gold-light: #f7d774;
  --slot-border: #2a3a58;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text);
  font-family: 'Barlow', system-ui, sans-serif; }
.cond { font-family: 'Barlow Condensed', system-ui, sans-serif; }
.card-shape { clip-path: polygon(9% 0, 91% 0, 100% 7%, 100% 100%, 0 100%, 0 7%); }
```

- [ ] **Step 5: Create `app/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Recall XI' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create `app/page.tsx`**

```tsx
import { readFile } from 'node:fs/promises';
import Game from '../components/Game';
import type { Player } from '../src/lib/chemistry/types';
import type { Board } from '../src/lib/puzzle/types';

export default async function Page() {
  const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const board = JSON.parse(await readFile('content/puzzles/003.json', 'utf8')) as Board;
  const nations = JSON.parse(await readFile('data/nations.json', 'utf8')) as Record<string, string>;
  return <Game players={players} board={board} nations={nations} />;
}
```

- [ ] **Step 7: Verify it boots**

Run: `npm run dev`
Expected: server starts. The page will error until Task 5 creates `Game` — that
is expected at this step; confirm the server itself starts and stop it.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.ts app
git commit -m "chore: scaffold Next.js app shell"
```

---

### Task 3: Board state reducer

Pure, no React. This is where the rules live, so it is the part that gets tests.

**Files:**
- Create: `src/game/state.ts`
- Test: `tests/game/state.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { initState, reduce } from '../../src/game/state';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, nation: string, clubs: string[], pos: Player['positions']): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: pos,
  fame: { value: 50, source: 'sitelinks' },
});

const gk = mk('gk', 'BRA', ['CITY'], ['GK']);
const d1 = mk('d1', 'NED', ['CITY'], ['DEF']);
const d2 = mk('d2', 'ESP', ['CITY'], ['DEF']);
const odd = mk('odd', 'JPN', ['URAWA'], ['DEF']);
const pool = new Map([gk, d1, d2, odd].map((p) => [p.id, p]));

const board: Board = {
  id: 't', formationId: '433',
  seeded: { LB: 'd1' },
  required: { [edgeKey('LB', 'LCB')]: 'green' },
  referenceSolution: { LB: 'd1', LCB: 'd2' },
};

const s0 = initState(board, FORMATION_433, pool);

describe('library', () => {
  it('starts empty', () => {
    expect(s0.library).toEqual([]);
  });

  it('adds a player', () => {
    const s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    expect(s.library).toEqual(['d2']);
  });

  it('does not add the same player twice', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'library/add', playerId: 'd2' });
    expect(s.library).toEqual(['d2']);
  });

  it('has no size limit', () => {
    let s = s0;
    for (const p of [gk, d1, d2, odd]) s = reduce(s, { type: 'library/add', playerId: p.id });
    expect(s.library.length).toBe(4);
  });

  it('removes a player', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'library/remove', playerId: 'd2' });
    expect(s.library).toEqual([]);
  });
});

describe('placement', () => {
  it('places a legal player and takes them out of the library', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    expect(s.placed['LCB']).toBe('d2');
    expect(s.library).toEqual([]);
  });

  it('refuses an illegal placement and says which link failed', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LCB', playerId: 'odd' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.lastRejection?.slotId).toBe('LCB');
    expect(s.lastRejection?.failedEdges).toContain(edgeKey('LB', 'LCB'));
  });

  it('refuses a position-class mismatch', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LCB', playerId: 'gk' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.lastRejection?.reason).toBe('position');
  });

  it('never places over a seeded slot', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LB', playerId: 'd2' });
    expect(s.placed['LB']).toBe('d1');
  });

  it('un-places back to the library, at no cost', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    s = reduce(s, { type: 'unplace', slotId: 'LCB' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.library).toContain('d2');
  });

  it('un-placing a seeded slot does nothing', () => {
    const s = reduce(s0, { type: 'unplace', slotId: 'LB' });
    expect(s.placed['LB']).toBe('d1');
  });

  it('moving between slots vacates the origin', () => {
    let s = reduce(s0, { type: 'library/add', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    s = reduce(s, { type: 'place', slotId: 'RCB', playerId: 'd2' });
    expect(s.placed['LCB']).toBeUndefined();
    expect(s.placed['RCB']).toBe('d2');
  });
});

describe('submission', () => {
  it('is not submitted at the start', () => {
    expect(s0.submitted).toBe(false);
  });

  it('refuses to submit an incomplete XI', () => {
    const s = reduce(s0, { type: 'submit' });
    expect(s.submitted).toBe(false);
  });

  it('experimenting costs nothing — there is no guess budget', () => {
    let s = s0;
    for (let i = 0; i < 50; i++) {
      s = reduce(s, { type: 'place', slotId: 'LCB', playerId: 'odd' });
    }
    expect(s.submitted).toBe(false);
    expect(s).not.toHaveProperty('guessesLeft');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/state.test.ts`
Expected: FAIL — cannot resolve `../../src/game/state`.

- [ ] **Step 3: Write the implementation**

Create `src/game/state.ts`:

```typescript
import { isValidPlacement, scoreBoard } from '../lib/puzzle/validate';
import type { Board, Formation, Placement } from '../lib/puzzle/types';
import type { Player } from '../lib/chemistry/types';

export interface Rejection {
  slotId: string;
  reason: 'occupied' | 'position' | 'links';
  failedEdges: string[];
}

export interface GameState {
  board: Board;
  formation: Formation;
  pool: ReadonlyMap<string, Player>;
  /** Seeded slots plus everything the player has placed. */
  placed: Record<string, string>;
  /** Candidates the player has gathered. Unbounded and free. */
  library: string[];
  lastRejection: Rejection | null;
  submitted: boolean;
}

export type Action =
  | { type: 'library/add'; playerId: string }
  | { type: 'library/remove'; playerId: string }
  | { type: 'place'; slotId: string; playerId: string }
  | { type: 'unplace'; slotId: string }
  | { type: 'submit' };

export function initState(
  board: Board,
  formation: Formation,
  pool: ReadonlyMap<string, Player>,
): GameState {
  return {
    board, formation, pool,
    placed: { ...board.seeded },
    library: [],
    lastRejection: null,
    submitted: false,
  };
}

const isSeeded = (s: GameState, slotId: string) => s.board.seeded[slotId] !== undefined;

export function reduce(s: GameState, a: Action): GameState {
  if (s.submitted) return s;

  switch (a.type) {
    case 'library/add':
      if (s.library.includes(a.playerId)) return s;
      if (Object.values(s.placed).includes(a.playerId)) return s;
      return { ...s, library: [...s.library, a.playerId], lastRejection: null };

    case 'library/remove':
      return { ...s, library: s.library.filter((id) => id !== a.playerId) };

    case 'place': {
      if (isSeeded(s, a.slotId)) return s;
      const player = s.pool.get(a.playerId);
      if (!player) return s;

      // Vacate wherever they currently are, so a move never duplicates them.
      const placed = { ...s.placed };
      for (const [slot, id] of Object.entries(placed)) {
        if (id === a.playerId && !isSeeded(s, slot)) delete placed[slot];
      }
      // A slot already holding someone else is swapped out to the library.
      const displaced = placed[a.slotId];
      delete placed[a.slotId];

      const r = isValidPlacement(s.board, s.formation, s.pool, placed as Placement, a.slotId, player);
      if (!r.ok) {
        return {
          ...s,
          lastRejection: { slotId: a.slotId, reason: r.reason, failedEdges: r.failedEdges },
        };
      }

      placed[a.slotId] = a.playerId;
      const library = s.library.filter((id) => id !== a.playerId);
      if (displaced && displaced !== a.playerId && !library.includes(displaced)) {
        library.push(displaced);
      }
      return { ...s, placed, library, lastRejection: null };
    }

    case 'unplace': {
      if (isSeeded(s, a.slotId)) return s;
      const id = s.placed[a.slotId];
      if (!id) return s;
      const placed = { ...s.placed };
      delete placed[a.slotId];
      return {
        ...s,
        placed,
        library: s.library.includes(id) ? s.library : [...s.library, id],
        lastRejection: null,
      };
    }

    case 'submit': {
      const score = scoreBoard(s.formation, s.pool, s.placed as Placement);
      // Only a complete XI at or above the gate can be locked in.
      return score.solved ? { ...s, submitted: true } : s;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/state.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/state.ts tests/game/state.test.ts
git commit -m "feat: add board state reducer with free experimentation"
```

---

### Task 4: Derived view data

Everything the UI needs, computed from state. Keeps components dumb.

**Files:**
- Create: `src/game/derive.ts`
- Test: `tests/game/derive.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { initState, reduce } from '../../src/game/state';
import { linkViews, canDrop } from '../../src/game/derive';
import { FORMATION_433 } from '../../src/lib/puzzle/formations';
import { edgeKey } from '../../src/lib/puzzle/edges';
import type { Board } from '../../src/lib/puzzle/types';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, nation: string, clubs: string[], pos: Player['positions']): Player => ({
  id, name: id, aliases: [], nation, clubIds: clubs,
  leagueIds: clubs.map((c) => `L_${c}`), positions: pos,
  fame: { value: 50, source: 'sitelinks' },
});
const d1 = mk('d1', 'NED', ['CITY'], ['DEF']);
const d2 = mk('d2', 'ESP', ['CITY'], ['DEF']);
const odd = mk('odd', 'JPN', ['URAWA'], ['DEF']);
const pool = new Map([d1, d2, odd].map((p) => [p.id, p]));

const board: Board = {
  id: 't', formationId: '433',
  seeded: { LB: 'd1' },
  required: { [edgeKey('LB', 'LCB')]: 'green', [edgeKey('LCB', 'RCB')]: 'green' },
  referenceSolution: { LB: 'd1', LCB: 'd2' },
};
const s0 = initState(board, FORMATION_433, pool);

describe('linkViews', () => {
  const views = linkViews(s0);
  const get = (a: string, b: string) => views.find((v) => v.key === edgeKey(a, b))!;

  it('marks a link touching a filled slot as required-but-unmet', () => {
    expect(get('LB', 'LCB').status).toBe('required');
    expect(get('LB', 'LCB').colour).toBe('green');
  });

  it('marks a link with both ends empty as hidden', () => {
    // Spec 4.1: a link is inert until one end is solved.
    expect(get('LCB', 'RCB').status).toBe('hidden');
  });

  it('marks a link with both ends filled as earned', () => {
    const s = reduce(s0, { type: 'place', slotId: 'LCB', playerId: 'd2' });
    const v = linkViews(s).find((x) => x.key === edgeKey('LB', 'LCB'))!;
    expect(v.status).toBe('earned');
  });

  it('covers every edge in the formation', () => {
    expect(views).toHaveLength(FORMATION_433.adjacency.length);
  });
});

describe('canDrop', () => {
  it('allows a legal drop', () => {
    expect(canDrop(s0, 'LCB', d2)).toBe(true);
  });

  it('refuses an illegal one', () => {
    expect(canDrop(s0, 'LCB', odd)).toBe(false);
  });

  it('refuses a seeded slot', () => {
    expect(canDrop(s0, 'LB', d2)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/derive.test.ts`
Expected: FAIL — cannot resolve `../../src/game/derive`.

- [ ] **Step 3: Write the implementation**

Create `src/game/derive.ts`:

```typescript
import { linkColour } from '../lib/chemistry/link';
import { scoreBoard, isValidPlacement } from '../lib/puzzle/validate';
import { edgeKey } from '../lib/puzzle/edges';
import type { LinkColour, Player } from '../lib/chemistry/types';
import type { Placement } from '../lib/puzzle/types';
import type { GameState } from './state';

export type LinkStatus = 'earned' | 'required' | 'hidden';

export interface LinkView {
  key: string;
  a: string;
  b: string;
  status: LinkStatus;
  /** For `earned`, what was achieved. Otherwise what the board requires. */
  colour: LinkColour | 'any';
}

/**
 * Three states, matching the visual language in design/Main.dc.html:
 *   earned   — both ends filled; render solid in the achieved colour
 *   required — one end filled; render dashed in the REQUIRED colour (the clue)
 *   hidden   — neither end filled; the link is inert (spec 4.1)
 */
export function linkViews(s: GameState): LinkView[] {
  return s.formation.adjacency.map(([a, b]) => {
    const key = edgeKey(a, b);
    const pa = s.placed[a];
    const pb = s.placed[b];
    const required = s.board.required[key] ?? 'any';

    if (pa && pb) {
      const achieved = linkColour(s.pool.get(pa)!, s.pool.get(pb)!);
      return { key, a, b, status: 'earned', colour: achieved };
    }
    if (pa || pb) return { key, a, b, status: 'required', colour: required };
    return { key, a, b, status: 'hidden', colour: required };
  });
}

export function canDrop(s: GameState, slotId: string, player: Player): boolean {
  if (s.board.seeded[slotId] !== undefined) return false;
  const placed = { ...s.placed };
  for (const [slot, id] of Object.entries(placed)) {
    if (id === player.id && s.board.seeded[slot] === undefined) delete placed[slot];
  }
  delete placed[slotId];
  return isValidPlacement(s.board, s.formation, s.pool, placed as Placement, slotId, player).ok;
}

export function chemistry(s: GameState) {
  return scoreBoard(s.formation, s.pool, s.placed as Placement);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/derive.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/derive.ts tests/game/derive.test.ts
git commit -m "feat: add derived link and drop-target views"
```

---

### Task 5: Search index

**Files:**
- Create: `src/lib/search/index.ts`
- Test: `tests/search/search.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildIndex, search } from '../../src/lib/search/index';
import type { Player } from '../../src/lib/chemistry/types';

const mk = (id: string, name: string, aliases: string[] = []): Player => ({
  id, name, aliases, nation: 'X', clubIds: [], leagueIds: [],
  positions: ['FWD'], fame: { value: 50, source: 'sitelinks' },
});

const players = [
  mk('a', 'Martin Ødegaard'),
  mk('b', 'Erling Haaland'),
  mk('c', 'Vinícius Júnior', ['Vini Jr']),
  mk('d', 'Son Heung-min'),
  mk('e', 'Philippe Sandler'),
];
const index = buildIndex(players);

describe('search', () => {
  it('returns NOTHING for an empty query', () => {
    // The pool is searched, never listed. An empty query must never enumerate
    // candidates — that would hand over the answers.
    expect(search(index, '')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });

  it('folds diacritics', () => {
    expect(search(index, 'odegaard').map((p) => p.id)).toContain('a');
    expect(search(index, 'vinicius').map((p) => p.id)).toContain('c');
  });

  it('matches aliases', () => {
    expect(search(index, 'vini jr').map((p) => p.id)).toContain('c');
  });

  it('matches on surname', () => {
    expect(search(index, 'haaland').map((p) => p.id)).toContain('b');
  });

  it('is case insensitive', () => {
    expect(search(index, 'SANDLER').map((p) => p.id)).toContain('e');
  });

  it('handles hyphenated names', () => {
    expect(search(index, 'heung').map((p) => p.id)).toContain('d');
  });

  it('caps results', () => {
    expect(search(index, 'a', 3).length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/search/search.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Write the implementation**

Create `src/lib/search/index.ts`:

```typescript
import type { Player } from '../chemistry/types';

export interface SearchEntry { player: Player; haystack: string }
export type SearchIndex = SearchEntry[];

const fold = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function buildIndex(players: readonly Player[]): SearchIndex {
  return players.map((player) => ({
    player,
    haystack: fold([player.name, ...player.aliases].join(' ')),
  }));
}

/**
 * Returns [] for an empty query, deliberately and permanently.
 *
 * The pool is searched, never listed. Any default result set beside an open
 * slot names valid answers to it — a mockup already shipped with three
 * suggestions, all three valid, the first being the board's deep cut.
 */
export function search(index: SearchIndex, query: string, limit = 12): Player[] {
  const q = fold(query);
  if (q.length === 0) return [];

  const out: Player[] = [];
  for (const entry of index) {
    if (!entry.haystack.includes(q)) continue;
    out.push(entry.player);
    if (out.length >= limit * 4) break;
  }

  // Prefix matches first; no fame ordering — fame is hidden until placement.
  out.sort((a, b) => {
    const ap = fold(a.name).startsWith(q) ? 0 : 1;
    const bp = fold(b.name).startsWith(q) ? 0 : 1;
    return ap - bp || a.name.localeCompare(b.name);
  });
  return out.slice(0, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/search/search.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/index.ts tests/search/search.test.ts
git commit -m "feat: add diacritic-folded player search that never lists the pool"
```

---

### Task 6: PlayerCard with flag

**Files:**
- Create: `components/PlayerCard.tsx`

- [ ] **Step 1: Create the component**

Values are lifted from `design/Main.dc.html`. Do not re-pick them.

```tsx
'use client';
import { useDraggable } from '@dnd-kit/core';
import { isoForNation } from '../src/pipeline/nations';
import type { Player } from '../src/lib/chemistry/types';

export type CardVariant = 'given' | 'found' | 'library';

export default function PlayerCard({
  player, variant, slotId, nations, revealFame,
}: {
  player: Player;
  variant: CardVariant;
  /** Undefined when the card is sitting in the library. */
  slotId?: string;
  nations: Record<string, string>;
  /** Fame is hidden until a player is placed. Never true in the library. */
  revealFame: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${slotId ?? 'lib'}:${player.id}`,
    data: { playerId: player.id, fromSlot: slotId },
    disabled: variant === 'given',
  });

  const iso = isoForNation(player.nation, nations);
  const given = variant === 'given';
  const surname = player.name.split(' ').slice(-1)[0]!.toUpperCase();

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="card-shape"
      style={{
        width: 108, height: 140, position: 'relative',
        background: given
          ? 'linear-gradient(165deg, var(--given-a), var(--given-b))'
          : 'linear-gradient(165deg, var(--card-a), var(--card-b))',
        boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
        opacity: isDragging ? 0.4 : 1,
        cursor: given ? 'default' : 'grab',
      }}
    >
      {given && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'var(--green)' }} />
      )}

      {revealFame && (
        <div className="cond" style={{ position: 'absolute', left: 8, top: 12, fontWeight: 700, fontSize: 20, lineHeight: 0.9, color: given ? 'var(--text)' : 'var(--gold)' }}>
          {player.fame.value}
        </div>
      )}

      {iso ? (
        <span className={`fi fi-${iso}`} style={{ position: 'absolute', left: 8, top: 38, width: 18, height: 13, borderRadius: 1 }} />
      ) : (
        <span style={{ position: 'absolute', left: 8, top: 38, width: 18, height: 13, borderRadius: 1, background: 'var(--slot-border)' }} />
      )}

      <svg style={{ position: 'absolute', right: 8, top: 22 }} width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--soft)" strokeWidth="1.4">
        <circle cx="12" cy="8" r="3.6" />
        <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
      </svg>

      <div className="cond" style={{ position: 'absolute', left: 0, right: 0, bottom: 22, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
        {surname}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 7, textAlign: 'center', fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', color: given ? 'var(--green)' : 'var(--dim)' }}>
        {given ? 'GIVEN' : variant === 'found' ? 'PLACED' : 'BENCH'}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PlayerCard.tsx
git commit -m "feat: add draggable player card with nation flag"
```

---

### Task 7: Pitch, Library, SearchPanel

**Files:**
- Create: `components/Pitch.tsx`, `components/Library.tsx`, `components/SearchPanel.tsx`

- [ ] **Step 1: Create `components/Pitch.tsx`**

Slot coordinates and link geometry are already worked out in
`design/Main.dc.html` — copy the numbers rather than re-deriving them. Each slot
is a `useDroppable` whose id is the slot id; empty slots render the dashed
placeholder and call `onSlotClick` to focus the search on that slot.

Link rendering follows `linkViews`: `earned` solid in the achieved colour
(`green` → `--green`, `hyper` → `--gold-light`, `orange` → `--gold`),
`required` dashed at 0.42 opacity in the required colour, `hidden` faint dotted
in `--line`.

- [ ] **Step 2: Create `components/Library.tsx`**

Left rail, fixed width 210, `overflow-y: auto`, unbounded contents. It is both a
drag source and a drop target (`useDroppable` id `library`), so a card dragged
off the pitch returns to it. Cards render at `variant="library"` with
`revealFame={false}`.

Header reads `BENCH · {n}`. Empty state is one line of copy, no illustration and
no suggested names.

- [ ] **Step 3: Create `components/SearchPanel.tsx`**

Right rail, width 292. An input plus results. Results render only when the query
is non-empty — `search()` already enforces this, and the component must not
add a default list of its own.

Each result row shows **name and nation only. Never fame.** Two actions per row:
add to bench, and — when a slot is focused — place directly into that slot.

Below the results, the focused slot's requirements, as in the mockup: each
neighbouring link named with its required colour, hidden links marked hidden.

- [ ] **Step 4: Verify the leak check still passes**

Run: `npx tsx scripts/leak-check.ts components/SearchPanel.tsx`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add components/Pitch.tsx components/Library.tsx components/SearchPanel.tsx
git commit -m "feat: add pitch, bench and search panels"
```

---

### Task 8: Wire it together

**Files:**
- Create: `components/Game.tsx`, `components/ChemistryBar.tsx`

- [ ] **Step 1: Create `components/ChemistryBar.tsx`**

Header meter from the mockup: value, `/110`, fill to `value/110`, gate marker at
90.9%, `100 TO SOLVE` label.

- [ ] **Step 2: Create `components/Game.tsx`**

```tsx
'use client';
import { useMemo, useReducer, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { initState, reduce } from '../src/game/state';
import { chemistry } from '../src/game/derive';
import { FORMATIONS } from '../src/lib/puzzle/formations';
import { buildIndex } from '../src/lib/search/index';
import type { Player } from '../src/lib/chemistry/types';
import type { Board } from '../src/lib/puzzle/types';

export default function Game({
  players, board, nations,
}: { players: Player[]; board: Board; nations: Record<string, string> }) {
  const pool = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const formation = FORMATIONS[board.formationId]!;
  const index = useMemo(() => buildIndex(players), [players]);

  const [state, dispatch] = useReducer(reduce, undefined, () => initState(board, formation, pool));
  const [focusedSlot, setFocusedSlot] = useState<string | null>(null);

  const score = chemistry(state);

  function onDragEnd(e: DragEndEvent) {
    const playerId = e.active.data.current?.playerId as string | undefined;
    const target = e.over?.id as string | undefined;
    if (!playerId || !target) return;
    if (target === 'library') {
      const from = e.active.data.current?.fromSlot as string | undefined;
      if (from) dispatch({ type: 'unplace', slotId: from });
      return;
    }
    dispatch({ type: 'place', slotId: target, playerId });
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      {/* Library (left) · Pitch (centre) · SearchPanel (right) */}
      {/* Header: board name, obscurity, ChemistryBar, Lock in XI */}
      {/* Lock in is enabled only when score.solved */}
    </DndContext>
  );
}
```

Fill in the layout using the mockup: three columns, header across the top, the
`Lock in XI` button disabled until `score.solved`.

- [ ] **Step 3: Play it**

Run: `npm run dev` and open the page.

Walk the whole loop once: search a name, add to bench, drag onto a slot, watch a
link turn solid and chemistry climb, drag a card between two slots, drag one back
to the bench, click an empty slot and place into it from search, reach 100, lock in.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add components/Game.tsx components/ChemistryBar.tsx
git commit -m "feat: wire the playable prototype together"
```

---

## Out of scope

Player photos · club badges (crests are trademarks — see below) · results screen ·
share mechanic · daily mode · multiple boards · accounts · animation · mobile
layout · the generator.

**On club badges:** club crests are registered trademarks, which is a firmer
constraint than the card silhouette we already worked around. Player photos on
Commons are *licensed for reuse*; crests are *protected marks*. Plan for an
original club representation, not badges.

## Definition of done

- `npm test` and `npm run typecheck` pass.
- Board 003 is playable start to finish: search, bench, drag, move, return,
  click-to-place, chemistry to 100, lock in.
- Fame appears nowhere before a player is placed — not in search, not on a bench
  card.
- `scripts/leak-check.ts` is clean against every component.
- Someone who is not the author has played it once.

## What the prototype is for

Answering these, which nothing built so far can:

1. Does progressive reveal feel like deduction, or like guessing?
2. Faced with ~100 legal answers, does a fan reach for a deep cut — or take the
   first name they think of and move on? **This is the whole game.**
3. Does the bench-and-drag loop feel like play, or like admin?
4. Does obscurity feel earned or arbitrary?
5. Is the loose-early / tight-late difficulty gradient satisfying or backwards?

Answer these before building anything else.
