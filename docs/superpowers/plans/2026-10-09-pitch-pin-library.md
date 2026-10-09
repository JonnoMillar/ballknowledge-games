# Pitch pin pack library: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans
> to implement this plan task by task, **inline in one session, no per-task
> subagents** (Jonno's standing rule). Steps use checkbox (`- [ ]`) syntax.

**Goal:** turn Pitch pin from a daily into a library of goal packs that grows
on its own: weekly Premier League round packs, the official Goal of the Month
shortlist, an archive of past winners, and hand-made classics.

**Spec:** `docs/superpowers/specs/2026-10-09-pitch-pin-library-design.md`.
Read it first. Where this plan and the spec differ, this plan is newer.

**Architecture:** packs are JSON files in `games/pin/data/packs/`, goals stay
in `games/pin/data/goals.json` (server-only, it holds the answers). The
server reads both once. Pure logic lives in `games/pin/lib/` with unit tests;
the scripts in `scripts/` fetch from Understat, premierleague.com and
Wikipedia and write pack files. A daily GitHub Action runs the two recurring
scripts and commits what they write.

**Tech stack:** Next.js 15 (App Router), React 19, TypeScript (strict,
`noUncheckedIndexedAccess`), Vitest 2, `tsx` for scripts, Node 24's `fetch`.

---

## Rules for whoever runs this plan

- Work in the worktree `.claude/worktrees/sad-nightingale-82892f`, branch
  `feat/pitch-pin`. If `node_modules` is missing, run `npm ci` first.
- **Commit after every task** once its checks pass (project rule: auto-commit
  verified work). End every commit message with the `Co-Authored-By` line
  your session's attribution instructions give.
- **Never push.** No remote is configured. Never force anything, reset, or
  rewrite history.
- If a check fails, stop and fix the cause; do not commit broken work. If you
  cannot fix it, say so plainly and leave it uncommitted.
- Real-data steps (Tasks 8, 9, 10) must show their actual command output in
  your reply before the commit. "It should work" is not a check.
- Show `git status --short` before each commit; nothing outside the task's
  files should be staged. The `games/pin/tests/fixtures/` folder is already
  committed with this plan.
- Copy is gender-neutral (a test enforces no he/his/him in components).
- Commands are for the Bash tool (Git Bash) from the worktree root.

## Facts found while planning (2026-10-09), so you do not have to rediscover them

- **Understat** league data: `GET https://understat.com/getLeagueData/EPL/<season start year>`
  with header `X-Requested-With: XMLHttpRequest`. Returns `{ teams, players, dates }`;
  each fixture in `dates` is
  `{ id, isResult, h: { id, title, short_title }, a: {...}, goals: { h, a }, xG, datetime: "2026-08-21 19:00:00" }`.
  Titles are short: "Tottenham", "Brighton", "Manchester United", "Coventry".
  2026/27 had 50 results, 21 Aug to 20 Sep; next fixtures 10 Oct.
  Responses are gzipped; Node's `fetch` handles that (curl needs `--compressed`).
- **Understat** match data: `GET https://understat.com/getMatchData/<id>` →
  `{ shots: { h: Shot[], a: Shot[] } }`. `result` is `Goal`, `OwnGoal`, etc.;
  an `OwnGoal` is filed under the scorer's own side and counts for the other.
- **premierleague.com** shortlist page:
  `https://www.premierleague.com/en/awards/goal-of-the-month/2026-27/september`
  is plain HTML; a month with no page is a 404. Each nominee is a link to
  `/players/<id>/<slug>/overview` followed by a link to
  `/match/<id>/<home-slug>-vs-<away-slug>...`. The bold tags move around from
  month to month, so the parser relies only on those two links.
  Trimmed copies of September 2026 and August 2025 are in
  `games/pin/tests/fixtures/`.
- **Wikipedia** "Premier League Goal of the Month" winners table, via
  `https://en.wikipedia.org/w/api.php?action=parse&page=Premier_League_Goal_of_the_Month&prop=wikitext&format=json&formatversion=2`.
  91 winners: 9 a season from 2016/17 to 2025/26 except 2022/23 (8), plus 2
  so far in 2026/27. The score column is the score just after the goal, the
  scorer's team first. A copy of the table is in
  `games/pin/tests/fixtures/gotm-wikipedia.txt`.
- The matcher in Task 4 was prototyped against real data before this plan
  was written: 8 of 8 September 2026 nominees and 89 of 89 archive winners
  matched (15 of the 89 were braces that needed the score rule).
- Club packs that will come out of the archive: Manchester United (10
  winners, kept 9), Chelsea 9, Fulham 7, Newcastle United 7, Liverpool 6,
  Tottenham Hotspur 6, Brighton & Hove Albion 6.
- The default git branch is `master`, not `main`.

## File structure

| Path | Responsibility |
|---|---|
| `games/pin/lib/dates.ts` (new) | UTC date helpers: `isDate`, `addDays`, `daysBetween`, `utcToday`, `weekEnd`, `seasonOf`, `seasonTag`, `seasonLabel`, `monthName`, `spanTitle`. |
| `games/pin/lib/round.ts` (new, replaces `week.ts`) | `fair`, `PAR_PER_GOAL`, `rankRecent`, `pickRound`. |
| `games/pin/lib/shelves.ts` (new) | Library order (`shelve`) and the New badge (`isNew`). |
| `games/pin/lib/match.ts` (new) | Matching an official pick to an Understat shot: `normalise`, `sameClub`, `nameScore`, `scoreAfter`, `fixturesFor`, `goalFor`. |
| `games/pin/lib/gotm.ts` (new) | The shortlist page: `gotmUrl`, `parseShortlist`, `monthsDue`. |
| `games/pin/lib/wiki.ts` (new) | The Wikipedia winners table: `parseWinners`, `isoDate`. |
| `games/pin/lib/types.ts` | `Pack` gains kind/subtitle/season/published; `BoardView` loses date/number; new `PackCard`, `Shelf`. |
| `games/pin/lib/progress.ts` | Loses `streakOf`; gains `packStatus`, `nextPack`. |
| `games/pin/server.ts` | Reads pack files; `boardView`, `library`, `parseThrow`, `judge`. |
| `games/pin/data/packs/*.json` (new) | One file per pack. |
| `games/pin/components/Library.tsx` (new) | The library page body. |
| `games/pin/components/PitchPin.tsx`, `FullTime.tsx` | No streak, no daily; back link and Next pack. |
| `app/pin/page.tsx`, `app/pin/[id]/page.tsx` (new) | The library and a pack. |
| `scripts/pin-files.ts` (new) | Reading and writing goals, packs and the model check. |
| `scripts/understat.ts` (new) | Understat fetches and turning a shot into a `Goal`. |
| `scripts/build-pin-round.ts`, `build-pin-gotm.ts`, `import-pin-archive.ts` (new) | The three data scripts. |
| `.github/workflows/pin-packs.yml` (new) | The daily run. |

Deleted: `games/pin/lib/boards.ts`, `games/pin/lib/week.ts`,
`games/pin/data/days.json`, `games/pin/data/packs.json`,
`games/pin/tests/boards.test.ts`, `games/pin/tests/week.test.ts`,
`app/pin/[date]/`, `app/pin/pack/`, `scripts/build-pin-week.ts`.

---

### Task 1: Date helpers

**Files:**
- Create: `games/pin/lib/dates.ts`
- Test: `games/pin/tests/dates.test.ts`

- [ ] **Step 1: Write the failing test**

Create `games/pin/tests/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addDays, daysBetween, isDate, monthName, seasonLabel, seasonOf, seasonTag, spanTitle, utcToday, weekEnd,
} from '../lib/dates';

describe('isDate', () => {
  it('takes real calendar dates only', () => {
    expect(isDate('2026-10-08')).toBe(true);
    expect(isDate('2026-02-30')).toBe(false);
    expect(isDate('2026-1-8')).toBe(false);
    expect(isDate('../etc')).toBe(false);
  });
});

describe('day arithmetic', () => {
  it('adds days across a year end', () => {
    expect(addDays('2026-10-09', 1)).toBe('2026-10-10');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-09', -4)).toBe('2026-10-05');
  });
  it('counts days between', () => {
    expect(daysBetween('2026-10-09', '2026-10-16')).toBe(7);
    expect(daysBetween('2026-10-09', '2026-10-08')).toBe(-1);
  });
  it('takes today in UTC', () => {
    expect(utcToday(new Date('2026-10-09T23:30:00Z'))).toBe('2026-10-09');
  });
});

describe('weekEnd', () => {
  it('is the Monday ending the Tuesday-to-Monday week', () => {
    expect(weekEnd('2026-10-13')).toBe('2026-10-19'); // Tuesday
    expect(weekEnd('2026-10-18')).toBe('2026-10-19'); // Sunday
    expect(weekEnd('2026-10-19')).toBe('2026-10-19'); // Monday
    expect(weekEnd('2026-10-12')).toBe('2026-10-12'); // the Monday before
  });
});

describe('seasons', () => {
  it('starts a season in July', () => {
    expect(seasonOf('2026-10-09')).toBe(2026);
    expect(seasonOf('2027-05-20')).toBe(2026);
    expect(seasonOf('2027-07-01')).toBe(2027);
  });
  it('writes a season for ids and for people', () => {
    expect(seasonTag(2026)).toBe('2026-27');
    expect(seasonTag(2099)).toBe('2099-00');
    expect(seasonLabel(2026)).toBe('2026/27');
  });
});

describe('titles', () => {
  it('names a month', () => {
    expect(monthName('2026-09')).toBe('September');
    expect(monthName('2027-01-03')).toBe('January');
  });
  it('writes a span of match dates', () => {
    expect(spanTitle('2026-10-17', '2026-10-19')).toBe('17–19 October');
    expect(spanTitle('2026-09-30', '2026-10-06')).toBe('30 September – 6 October');
    expect(spanTitle('2026-10-17', '2026-10-17')).toBe('17 October');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run games/pin/tests/dates.test.ts`
Expected: FAIL, cannot resolve `../lib/dates`.

- [ ] **Step 3: Write the helpers**

Create `games/pin/lib/dates.ts`:

```ts
/**
 * Dates for Pitch pin, as YYYY-MM-DD strings in UTC. The scripts run in UTC
 * and the library's New badge is worked out on the server, so every browser
 * sees the same thing.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ms = (date: string): number => Date.parse(`${date}T00:00:00Z`);

/** A real calendar date in YYYY-MM-DD. Also what keeps an id from being a path. */
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = ms(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export const utcToday = (now = new Date()): string => now.toISOString().slice(0, 10);
export const addDays = (date: string, n: number): string => new Date(ms(date) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string): number => Math.round((ms(to) - ms(from)) / 86400000);

/** The Monday that ends the Tuesday-to-Monday week holding the date: Monday night games finish the weekend's round. */
export function weekEnd(date: string): string {
  const day = new Date(ms(date)).getUTCDay(); // 0 Sunday … 6 Saturday
  return addDays(date, (8 - day) % 7);
}

/** The season a date falls in, by its start year. July on is the new season. */
export const seasonOf = (date: string): number => Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) >= 7 ? 0 : 1);
const nextYear = (start: number): string => String((start + 1) % 100).padStart(2, '0');
/** "2026-27", for ids and pack files. */
export const seasonTag = (start: number): string => `${start}-${nextYear(start)}`;
/** "2026/27", for people. */
export const seasonLabel = (start: number): string => `${start}/${nextYear(start)}`;

/** "2026-09" (or a full date) → "September". */
export const monthName = (date: string): string => MONTH_NAMES[Number(date.slice(5, 7)) - 1]!;

/** A run of match dates as a pack title: "17–19 October", "30 September – 6 October", "17 October". */
export function spanTitle(first: string, last: string): string {
  const d1 = Number(first.slice(8, 10));
  const d2 = Number(last.slice(8, 10));
  const m1 = monthName(first);
  const m2 = monthName(last);
  if (first === last) return `${d2} ${m2}`;
  return m1 === m2 ? `${d1}–${d2} ${m2}` : `${d1} ${m1} – ${d2} ${m2}`;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run games/pin/tests/dates.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add games/pin/lib/dates.ts games/pin/tests/dates.test.ts
git commit -m "feat(pin): UTC date helpers for packs" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 2: Ranking and picking a round

`week.ts` stays until Task 7 (the old week script still imports it); this
task adds `round.ts` beside it.

**Files:**
- Create: `games/pin/lib/round.ts`
- Test: `games/pin/tests/round.test.ts`

- [ ] **Step 1: Write the failing test**

Create `games/pin/tests/round.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fair, pickRound, rankRecent, type Candidate } from '../lib/round';
import type { Spot } from '../lib/pitch';

const c = (slug: string, matchId: number, xg: number, at: Spot): Candidate => ({ slug, matchId, xg, at });
const OUT: Spot = { x: 10, y: 20 }; // 25.6 m from the spot, outside the area
const IN: Spot = { x: 20, y: 5 }; // 15.2 m from the spot, inside the area

describe('fair', () => {
  it('rejects a pack the lazy pin coasts', () => {
    expect(fair(Array.from({ length: 6 }, () => ({ x: 34, y: 9 })))).toBe(false);
  });
  it('wants goals from in and out of the area', () => {
    expect(fair(Array.from({ length: 6 }, () => ({ x: 34, y: 30 })))).toBe(false);
    expect(fair([{ x: 34, y: 30 }, { x: 34, y: 30 }, { x: 34, y: 30 }, { x: 10, y: 5 }, { x: 34, y: 5 }, { x: 34, y: 5 }])).toBe(true);
  });
  it('scales the par floor with the size of the pack: 7 m a goal', () => {
    // 7.5 m from the spot each: three outside the area, three inside. 45 m ≥ 42.
    const six: Spot[] = [{ x: 34, y: 18.5 }, { x: 34, y: 18.5 }, { x: 34, y: 18.5 }, { x: 34, y: 3.5 }, { x: 34, y: 3.5 }, { x: 34, y: 3.5 }];
    expect(fair(six)).toBe(true);
    // A seventh goal 1 m from the spot: 46 m < 49.
    expect(fair([...six, { x: 34, y: 12 }])).toBe(false);
  });
});

describe('ranking recent goals', () => {
  it('puts the lowest xG first and drops goals the lazy pin would land on', () => {
    const ranked = rankRecent([
      c('high', 2, 0.4, { x: 30, y: 4 }),
      c('low', 3, 0.03, { x: 50, y: 22 }),
      c('lower', 3, 0.02, { x: 20, y: 22 }),
      c('on-the-spot', 4, 0.01, { x: 34, y: 12 }),
    ]);
    expect(ranked.map((r) => r.slug)).toEqual(['lower', 'low', 'high']);
  });
});

describe('picking a round', () => {
  it('takes the first goal of each match in rank order when that is fair', () => {
    const ranked = [
      c('a', 1, 0.01, OUT), c('a2', 1, 0.02, IN), c('b', 2, 0.03, OUT), c('c', 3, 0.04, OUT),
      c('d', 4, 0.05, IN), c('e', 5, 0.06, IN), c('f', 6, 0.07, IN), c('g', 7, 0.08, IN),
    ];
    expect(pickRound(ranked).map((p) => p.slug)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('swaps in a later goal, a second goal from a match included, to make it fair', () => {
    const ranked = [
      ...Array.from({ length: 6 }, (_, i) => c(`out${i}`, i, 0.01 * (i + 1), OUT)),
      c('in-from-match-9', 9, 0.3, IN),
    ];
    const picks = pickRound(ranked);
    expect(picks).toHaveLength(6);
    expect(picks.map((p) => p.slug)).toContain('in-from-match-9');
    expect(new Set(picks.map((p) => p.matchId)).size).toBe(6);
  });
  it('never puts two goals from one match in a pack', () => {
    const ranked = [
      ...Array.from({ length: 6 }, (_, i) => c(`out${i}`, i, 0.01 * (i + 1), OUT)),
      c('in-from-match-0', 0, 0.3, IN),
    ];
    // The only goal inside the area shares match 0; swapping it in for out0 is the one legal move.
    expect(pickRound(ranked).map((p) => p.slug)).toEqual(['in-from-match-0', 'out1', 'out2', 'out3', 'out4', 'out5']);
  });
  it('fails loudly when there are too few matches or nothing fair', () => {
    expect(() => pickRound(Array.from({ length: 5 }, (_, i) => c(`g${i}`, i, 0.1, OUT)))).toThrow(/Only 5 matches/);
    expect(() => pickRound(Array.from({ length: 7 }, (_, i) => c(`g${i}`, i, 0.1, OUT)))).toThrow(/No fair pack/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run games/pin/tests/round.test.ts`
Expected: FAIL, cannot resolve `../lib/round`.

- [ ] **Step 3: Write `round.ts`**

Create `games/pin/lib/round.ts`:

```ts
import { distance, inArea, SPOT, type Spot } from './pitch';
import { par } from './score';

/** A pack's par must be at least this much a goal: the lazy pin (the penalty spot) cannot coast it. */
export const PAR_PER_GOAL = 7;

/** A fair pack: the lazy pin cannot coast it, and it has goals from in and out of the area. */
export function fair(ats: readonly Spot[]): boolean {
  return par(ats).metres >= PAR_PER_GOAL * ats.length && ats.some(inArea) && ats.some((a) => !inArea(a));
}

/** A Premier League goal a round pack could use. */
export interface Candidate { slug: string; matchId: number; xg: number; at: Spot }

/** A goal the lazy pin is this close to tests nothing. */
const TOO_EASY = 4;

/** The memorable first: lowest xG (a 0.04 goal is the one in the highlights), none the lazy pin would land on. */
export function rankRecent(cs: readonly Candidate[]): Candidate[] {
  return cs.filter((c) => distance(SPOT, c.at) >= TOO_EASY).sort((a, b) => a.xg - b.xg);
}

const oneAMatch = (picks: readonly Candidate[]): boolean => new Set(picks.map((p) => p.matchId)).size === picks.length;

/**
 * A round pack: the first goal of each match in rank order, n of them. When
 * those are unfair, try each later goal (a second goal from a match
 * included) in each place, last place first, keeping one goal a match.
 * Throws when there are fewer than n matches or no fair set, so a bad pack
 * is never written.
 */
export function pickRound(ranked: readonly Candidate[], n = 6): Candidate[] {
  const seen = new Set<number>();
  const firsts = ranked.filter((c) => (seen.has(c.matchId) ? false : (seen.add(c.matchId), true)));
  if (firsts.length < n) throw new Error(`Only ${firsts.length} matches with a goal to pick from, need ${n}`);
  const picks = firsts.slice(0, n);
  const ok = (p: Candidate[]) => oneAMatch(p) && fair(p.map((x) => x.at));
  if (ok(picks)) return picks;
  for (const c of ranked) {
    if (picks.includes(c)) continue;
    for (let i = n - 1; i >= 0; i--) {
      const next = picks.map((p, j) => (j === i ? c : p));
      if (ok(next)) return next;
    }
  }
  throw new Error('No fair pack in these goals');
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run games/pin/tests/round.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add games/pin/lib/round.ts games/pin/tests/round.test.ts
git commit -m "feat(pin): rank and pick a fair round pack" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 3: Shelves and the New badge

**Files:**
- Modify: `games/pin/lib/types.ts` (add `PackKind`, `PACK_KINDS`, widen `Pack`)
- Create: `games/pin/lib/shelves.ts`
- Test: `games/pin/tests/shelves.test.ts`

The old `Pack` (`{ id, title, goals }`) is still used by `boards.ts`, the
week script and `server.ts` until Task 7. To keep this task green, the new
fields are added **optional** here and made required in Task 7.

- [ ] **Step 1: Widen `Pack` in `games/pin/lib/types.ts`**

Replace the line `export interface Pack { id: string; title: string; goals: string[] }` with:

```ts
/** Where a pack comes from: our weekly pick, the official monthly shortlist, past winners by season or club, or hand-made. */
export type PackKind = 'round' | 'month' | 'season' | 'club' | 'classic';
export const PACK_KINDS: readonly PackKind[] = ['round', 'month', 'season', 'club', 'classic'];

/**
 * A pack file, games/pin/data/packs/<id>.json. `season` ("2026-27") is on
 * round, month and season packs only. `published` is a UTC date.
 * (kind, subtitle and published become required in Task 7.)
 */
export interface Pack {
  id: string;
  kind?: PackKind;
  title: string;
  subtitle?: string;
  season?: string;
  published?: string;
  goals: string[];
}
```

- [ ] **Step 2: Write the failing test**

Create `games/pin/tests/shelves.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isNew, shelve } from '../lib/shelves';
import type { Pack, PackKind } from '../lib/types';

const p = (id: string, kind: PackKind, published: string, season?: string): Pack =>
  ({ id, kind, title: id, subtitle: '', published, goals: [], ...(season ? { season } : {}) });

describe('shelve', () => {
  it('puts this season first, then the archive in its order', () => {
    const packs = [
      p('classic-b', 'classic', '2026-10-09'),
      p('classic-a', 'classic', '2026-10-08'),
      p('club-z', 'club', '2026-10-09'),
      p('club-a', 'club', '2026-10-09'),
      p('gotm-winners-2019-20', 'season', '2026-10-09', '2019-20'),
      p('gotm-winners-2024-25', 'season', '2026-10-09', '2024-25'),
      p('pl-old', 'round', '2026-05-20', '2025-26'),
      p('gotm-2026-08', 'month', '2026-09-12', '2026-27'),
      p('pl-a', 'round', '2026-09-15', '2026-27'),
      p('pl-b', 'round', '2026-10-06', '2026-27'),
    ];
    expect(shelve(packs).map((s) => [s.title, s.packs.map((x) => x.id)])).toEqual([
      ['This season', ['pl-b', 'pl-a', 'gotm-2026-08']],
      ['Archive', ['gotm-winners-2024-25', 'gotm-winners-2019-20', 'club-a', 'club-z', 'classic-a', 'classic-b', 'pl-old']],
    ]);
  });
  it('leaves an empty shelf out', () => {
    expect(shelve([p('classic-a', 'classic', '2026-10-08')]).map((s) => s.title)).toEqual(['Archive']);
  });
});

describe('isNew', () => {
  it('lasts a week from publishing, for round and month packs only', () => {
    expect(isNew(p('r', 'round', '2026-10-06', '2026-27'), '2026-10-09')).toBe(true);
    expect(isNew(p('m', 'month', '2026-10-06', '2026-27'), '2026-10-12')).toBe(true);
    expect(isNew(p('r', 'round', '2026-10-06', '2026-27'), '2026-10-13')).toBe(false);
    expect(isNew(p('c', 'classic', '2026-10-09'), '2026-10-09')).toBe(false);
    expect(isNew(p('s', 'season', '2026-10-09', '2019-20'), '2026-10-09')).toBe(false);
  });
  it('is not new before it is published', () => {
    expect(isNew(p('r', 'round', '2026-10-10', '2026-27'), '2026-10-09')).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run games/pin/tests/shelves.test.ts`
Expected: FAIL, cannot resolve `../lib/shelves`.

- [ ] **Step 4: Write `shelves.ts`**

Create `games/pin/lib/shelves.ts`:

```ts
import { daysBetween } from './dates';
import type { Pack } from './types';

/** The packs football's calendar brings. Only these are ever New. */
const FRESH = new Set(['round', 'month']);

/** New for seven days from the day it was published. */
export function isNew(p: Pack, today: string): boolean {
  if (!p.kind || !FRESH.has(p.kind) || !p.published) return false;
  const age = daysBetween(p.published, today);
  return age >= 0 && age < 7;
}

const newestFirst = (a: Pack, b: Pack) => (b.published ?? '').localeCompare(a.published ?? '') || b.id.localeCompare(a.id);

/**
 * The library in order. This season: round and month packs of the latest
 * season, newest first. Archive: season packs (newest season first), club
 * packs (A to Z), classic packs (oldest first), then round and month packs
 * of earlier seasons (newest first). An empty shelf is left out.
 */
export function shelve(packs: readonly Pack[]): { title: string; packs: Pack[] }[] {
  const fresh = packs.filter((p) => p.kind && FRESH.has(p.kind));
  const latest = fresh.reduce<string | null>((m, p) => (p.season && (!m || p.season > m) ? p.season : m), null);
  const of = (kind: string) => packs.filter((p) => p.kind === kind);
  const archive = [
    ...of('season').sort((a, b) => (b.season ?? '').localeCompare(a.season ?? '')),
    ...of('club').sort((a, b) => a.title.localeCompare(b.title)),
    ...of('classic').sort((a, b) => (a.published ?? '').localeCompare(b.published ?? '') || a.id.localeCompare(b.id)),
    ...fresh.filter((p) => p.season !== latest).sort(newestFirst),
  ];
  return [
    { title: 'This season', packs: fresh.filter((p) => p.season === latest).sort(newestFirst) },
    { title: 'Archive', packs: archive },
  ].filter((s) => s.packs.length);
}
```

- [ ] **Step 5: Run the test and the typecheck**

Run: `npx vitest run games/pin/tests/shelves.test.ts && npm run typecheck`
Expected: PASS, 4 tests; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add games/pin/lib/types.ts games/pin/lib/shelves.ts games/pin/tests/shelves.test.ts
git commit -m "feat(pin): library shelves and the New badge" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 4: Matching an official pick to an Understat shot

**Files:**
- Create: `games/pin/lib/match.ts`
- Test: `games/pin/tests/match.test.ts`

- [ ] **Step 1: Write the failing test**

Create `games/pin/tests/match.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  fixturesFor, goalFor, nameScore, normalise, sameClub, scoreAfter, type FixtureLike, type ShotLike,
} from '../lib/match';

const fx = (id: string, h: string, a: string, datetime: string, isResult = true): FixtureLike =>
  ({ id, isResult, datetime, h: { title: h }, a: { title: a } });
const shot = (id: string, player: string, minute: number, h_a: 'h' | 'a', result = 'Goal', situation = 'OpenPlay'): ShotLike =>
  ({ id, player, minute: String(minute), h_a, result, situation });

describe('names', () => {
  it('normalises accents, case and punctuation', () => {
    expect(normalise('Emiliano Buendía')).toBe('emiliano buendia');
    expect(normalise('Brighton & Hove Albion')).toBe('brighton hove albion');
    expect(normalise("Nott'm Forest")).toBe('nott m forest');
  });
  it('matches a club when every word of Understat’s title is there', () => {
    expect(sameClub('Tottenham', 'tottenham hotspur')).toBe(true);
    expect(sameClub('Brighton', 'Brighton & Hove Albion')).toBe(true);
    expect(sameClub('West Ham', 'West Ham United')).toBe(true);
    expect(sameClub('Manchester City', 'manchester united')).toBe(false);
    expect(sameClub('Coventry', 'Bournemouth')).toBe(false);
  });
  it('scores how well two names for a player agree', () => {
    expect(nameScore('Emiliano Buendia', 'Emiliano Buendía')).toBe(3);
    expect(nameScore('Bruno Guimaraes', 'Bruno Guimarães')).toBe(3);
    expect(nameScore('Rodrigo Muniz', 'Muniz')).toBe(2);
    expect(nameScore('Son Heung-min', 'Heung-Min Son')).toBe(1);
    expect(nameScore('Rodri', 'Rodrigo Hernández')).toBe(0);
  });
});

describe('the score after each goal', () => {
  it('counts an own goal for the other side', () => {
    const { after, final } = scoreAfter([shot('2', 'B', 20, 'h', 'OwnGoal'), shot('1', 'A', 10, 'h'), shot('3', 'C', 30, 'a', 'MissedShots')]);
    expect(after.get('1')).toEqual([1, 0]);
    expect(after.get('2')).toEqual([1, 1]);
    expect(after.has('3')).toBe(false);
    expect(final).toEqual([1, 1]);
  });
});

describe('finding the fixture', () => {
  const league = [
    fx('1', 'Tottenham', 'Aston Villa', '2026-09-27 14:00:00'),
    fx('2', 'Aston Villa', 'Tottenham', '2027-02-01 14:00:00'),
    fx('3', 'Coventry', 'Brighton', '2026-09-13 14:00:00'),
    fx('4', 'Arsenal', 'Leeds', '2026-10-10 11:30:00', false),
  ];
  it('takes the clubs in either order, within the month', () => {
    expect(fixturesFor({ player: 'x', clubs: ['tottenham hotspur', 'aston villa'], when: '2026-09' }, league).map((f) => f.id)).toEqual(['1']);
  });
  it('takes a date give or take a day', () => {
    expect(fixturesFor({ player: 'x', clubs: ['Brighton & Hove Albion', 'Coventry City'], when: '2026-09-14' }, league).map((f) => f.id)).toEqual(['3']);
    expect(fixturesFor({ player: 'x', clubs: ['Brighton & Hove Albion', 'Coventry City'], when: '2026-09-16' }, league)).toEqual([]);
  });
  it('skips fixtures not played yet', () => {
    expect(fixturesFor({ player: 'x', clubs: ['arsenal', 'leeds united'], when: '2026-10' }, league)).toEqual([]);
  });
});

describe('finding the goal', () => {
  const coventryBrighton = fx('3', 'Coventry', 'Brighton', '2026-09-13 14:00:00');
  const pick = { player: 'Lewis Dunk', clubs: ['Brighton & Hove Albion', 'Coventry City'] as [string, string], when: '2026-09-13' };
  it('takes the one goal the pick names', () => {
    const shots = [shot('1', 'Lewis Dunk', 82, 'a'), shot('2', 'Danny Welbeck', 10, 'a')];
    expect(goalFor(pick, coventryBrighton, shots)?.id).toBe('1');
  });
  it('never takes a penalty', () => {
    expect(goalFor(pick, coventryBrighton, [shot('1', 'Lewis Dunk', 82, 'a', 'Goal', 'Penalty')])).toBeNull();
  });
  it('gives up on a brace when there is no score to tell them apart', () => {
    expect(goalFor(pick, coventryBrighton, [shot('1', 'Lewis Dunk', 20, 'a'), shot('2', 'Lewis Dunk', 82, 'a')])).toBeNull();
  });
  it('tells a brace apart by the score after the goal, scorer’s side first', () => {
    // Brighton are away: 0–1 after shot 1, 1–1 after shot 3, 1–2 after shot 2.
    const shots = [shot('1', 'Lewis Dunk', 20, 'a'), shot('3', 'Someone Else', 50, 'h'), shot('2', 'Lewis Dunk', 82, 'a')];
    expect(goalFor({ ...pick, score: [2, 1] }, coventryBrighton, shots)?.id).toBe('2');
    expect(goalFor({ ...pick, score: [1, 0] }, coventryBrighton, shots)?.id).toBe('1');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run games/pin/tests/match.test.ts`
Expected: FAIL, cannot resolve `../lib/match`.

- [ ] **Step 3: Write `match.ts`**

Create `games/pin/lib/match.ts`:

```ts
/**
 * Matching an official pick (a player and a match, no minute) to an
 * Understat shot. No table of club names: a club matches when every word of
 * Understat's short title is among the words given for it, so "Tottenham"
 * matches "tottenham hotspur" and "Manchester City" never matches
 * "manchester united". A promoted club needs no upkeep.
 */

/** Lower case, no accents, no punctuation, single spaces. */
export function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const words = (s: string): string[] => normalise(s).split(' ').filter(Boolean);

/** Understat's title for a club, against the words of a name for it from elsewhere. */
export function sameClub(understatTitle: string, other: string): boolean {
  const have = new Set(words(other));
  const need = words(understatTitle);
  return need.length > 0 && need.every((w) => have.has(w));
}

/**
 * How well two names for a player agree: 3 the same, 2 the same last word,
 * 1 a shared word of three letters or more, 0 nothing.
 */
export function nameScore(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.length || !y.length) return 0;
  if (x.join(' ') === y.join(' ')) return 3;
  if (x[x.length - 1] === y[y.length - 1]) return 2;
  return x.some((w) => w.length >= 3 && y.includes(w)) ? 1 : 0;
}

export interface FixtureLike { id: string; isResult: boolean; datetime: string; h: { title: string }; a: { title: string } }
export interface ShotLike { id: string; player: string; result: string; situation: string; minute: string; h_a: 'h' | 'a' }

/**
 * An official pick: who, the two clubs (the scorer's first when known), when
 * (a date, or a month as YYYY-MM), and the score just after the goal, the
 * scorer's side first, when known.
 */
export interface Pick { player: string; clubs: [string, string]; when: string; score?: [number, number] }

/**
 * The score, home first, just after each goal. An own goal is filed under
 * the side of the player who scored it and counts for the other side
 * (checked on 50 Premier League matches). Also returns the final score.
 */
export function scoreAfter(shots: readonly ShotLike[]): { after: Map<string, [number, number]>; final: [number, number] } {
  const sorted = [...shots].sort((p, q) => Number(p.minute) - Number(q.minute) || Number(p.id) - Number(q.id));
  const score = { h: 0, a: 0 };
  const after = new Map<string, [number, number]>();
  for (const s of sorted) {
    if (s.result === 'Goal') score[s.h_a]++;
    else if (s.result === 'OwnGoal') score[s.h_a === 'h' ? 'a' : 'h']++;
    else continue;
    after.set(s.id, [score.h, score.a]);
  }
  return { after, final: [score.h, score.a] };
}

const DAY = 86400000;
const near = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) <= DAY;

/** The played fixtures the pick could be: right clubs in either order, and on the day (give or take one) or in the month. */
export function fixturesFor<F extends FixtureLike>(pick: Pick, fixtures: readonly F[]): F[] {
  const [p, q] = pick.clubs;
  return fixtures.filter((f) => {
    if (!f.isResult) return false;
    const day = f.datetime.slice(0, 10);
    const when = pick.when.length === 7 ? day.startsWith(pick.when) : near(day, pick.when);
    const clubs = (sameClub(f.h.title, p) && sameClub(f.a.title, q)) || (sameClub(f.h.title, q) && sameClub(f.a.title, p));
    return when && clubs;
  });
}

/**
 * The one non-penalty goal in the fixture's shots that the pick names, or
 * null. When the pick carries the score after the goal, goals at that score
 * are kept first (this tells a brace apart). Then the best name score wins,
 * only when no other goal shares it.
 */
export function goalFor<S extends ShotLike>(pick: Pick, fixture: FixtureLike, shots: readonly S[]): S | null {
  let goals = shots.filter((s) => s.result === 'Goal' && s.situation !== 'Penalty');
  if (pick.score) {
    const [mine, theirs] = pick.score;
    const want = sameClub(fixture.h.title, pick.clubs[0]) ? [mine, theirs] : [theirs, mine];
    const { after } = scoreAfter(shots);
    const at = goals.filter((s) => after.get(s.id)?.[0] === want[0] && after.get(s.id)?.[1] === want[1]);
    if (at.length) goals = at;
  }
  const scored = goals.map((s) => ({ s, n: nameScore(pick.player, s.player) })).filter((x) => x.n > 0);
  const best = Math.max(0, ...scored.map((x) => x.n));
  const top = scored.filter((x) => x.n === best);
  return top.length === 1 ? top[0]!.s : null;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run games/pin/tests/match.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add games/pin/lib/match.ts games/pin/tests/match.test.ts
git commit -m "feat(pin): match an official pick to an Understat goal" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 5: Reading the Goal of the Month shortlist

**Files:**
- Create: `games/pin/lib/gotm.ts`
- Test: `games/pin/tests/gotm.test.ts` (uses `games/pin/tests/fixtures/gotm-2026-09.html` and `gotm-2025-08.html`, already committed)

- [ ] **Step 1: Write the failing test**

Create `games/pin/tests/gotm.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gotmUrl, monthsDue, parseShortlist } from '../lib/gotm';

const page = (name: string) => readFileSync(`games/pin/tests/fixtures/${name}`, 'utf8');

describe('parseShortlist', () => {
  it('reads September 2026: eight nominees in page order', () => {
    const picks = parseShortlist(page('gotm-2026-09.html'), '2026-09');
    expect(picks.map((p) => p.player)).toEqual([
      'Harvey Barnes', 'Bryan Mbeumo', 'Ainsley Maitland-Niles', 'Bruno Guimaraes',
      'Lewis Dunk', 'Nicolas Jackson', 'Emiliano Buendia', 'Jay Dasilva',
    ]);
    expect(picks[4]).toEqual({ player: 'Lewis Dunk', clubs: ['coventry city', 'brighton and hove albion'], when: '2026-09' });
  });
  it('reads August 2025, which is marked up differently', () => {
    const picks = parseShortlist(page('gotm-2025-08.html'), '2025-08');
    expect(picks).toHaveLength(8);
    expect(picks[0]).toEqual({ player: 'Antoine Semenyo', clubs: ['liverpool', 'bournemouth'], when: '2025-08' });
    expect(picks[1]!.player).toBe('Richarlison');
    expect(picks[7]).toEqual({ player: 'Marc Guehi', clubs: ['aston villa', 'crystal palace'], when: '2025-08' });
  });
  it('reads nothing from a page with no shortlist', () => {
    expect(parseShortlist('<p>Coming soon</p>', '2026-10')).toEqual([]);
  });
});

describe('gotmUrl', () => {
  it('puts the month in its season', () => {
    expect(gotmUrl('2026-09')).toBe('https://www.premierleague.com/en/awards/goal-of-the-month/2026-27/september');
    expect(gotmUrl('2027-01')).toBe('https://www.premierleague.com/en/awards/goal-of-the-month/2026-27/january');
  });
});

describe('monthsDue', () => {
  it('tries last month, and the one before while its pack is missing', () => {
    expect(monthsDue('2026-10-09', () => false)).toEqual(['2026-09', '2026-08']);
    expect(monthsDue('2026-10-09', (m) => m === '2026-08')).toEqual(['2026-09']);
    expect(monthsDue('2026-10-09', () => true)).toEqual([]);
    expect(monthsDue('2027-01-03', () => false)).toEqual(['2026-12', '2026-11']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run games/pin/tests/gotm.test.ts`
Expected: FAIL, cannot resolve `../lib/gotm`.

- [ ] **Step 3: Write `gotm.ts`**

Create `games/pin/lib/gotm.ts`:

```ts
import { monthName, seasonOf, seasonTag } from './dates';
import type { Pick } from './match';

/**
 * The Premier League's Goal of the Month shortlist page, read as HTML. The
 * markup around each nominee varies month to month (bold in different
 * places), so only two things are relied on: a link to the player's page
 * and, after it, a link to the match whose path is "<home>-vs-<away>".
 */

export const gotmUrl = (ym: string): string =>
  `https://www.premierleague.com/en/awards/goal-of-the-month/${seasonTag(seasonOf(`${ym}-01`))}/${monthName(ym).toLowerCase()}`;

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" };
const text = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? m).replace(/\s+/g, ' ').trim();

/** The nominees in page order, as picks in the given month (YYYY-MM). Empty when the page lists none. */
export function parseShortlist(html: string, ym: string): Pick[] {
  const out: Pick[] = [];
  const player = /<a href="[^"]*\/players\/\d+\/[^"/]+\/overview">([\s\S]*?)<\/a>/g;
  for (let m = player.exec(html); m; m = player.exec(html)) {
    const match = /\/match\/\d+\/([a-z0-9-]+?)-vs-([a-z0-9-]+?)(?:[/?"])/.exec(html.slice(player.lastIndex));
    if (!match) continue;
    out.push({ player: text(m[1]!), clubs: [match[1]!.replace(/-/g, ' '), match[2]!.replace(/-/g, ' ')], when: ym });
  }
  return out;
}

/**
 * The months to try on a given day: last month, and the month before while
 * its pack is still missing. Older months are left alone.
 */
export function monthsDue(today: string, have: (ym: string) => boolean): string[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const back = (k: number) => {
    const d = new Date(Date.UTC(y, m - 1 - k, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  return [back(1), back(2)].filter((ym) => !have(ym));
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run games/pin/tests/gotm.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add games/pin/lib/gotm.ts games/pin/tests/gotm.test.ts
git commit -m "feat(pin): read the Goal of the Month shortlist" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 6: Reading the Wikipedia winners table

**Files:**
- Create: `games/pin/lib/wiki.ts`
- Test: `games/pin/tests/wiki.test.ts` (uses `games/pin/tests/fixtures/gotm-wikipedia.txt`, already committed)

- [ ] **Step 1: Write the failing test**

Create `games/pin/tests/wiki.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isoDate, parseWinners } from '../lib/wiki';

const winners = parseWinners(readFileSync('games/pin/tests/fixtures/gotm-wikipedia.txt', 'utf8'));

describe('parseWinners', () => {
  it('reads all 91 winners, nine a season but 2022/23', () => {
    expect(winners).toHaveLength(91);
    const bySeason: Record<number, number> = {};
    for (const w of winners) bySeason[w.season] = (bySeason[w.season] ?? 0) + 1;
    expect(bySeason).toEqual({ 2016: 9, 2017: 9, 2018: 9, 2019: 9, 2020: 9, 2021: 9, 2022: 8, 2023: 9, 2024: 9, 2025: 9, 2026: 2 });
  });
  it('reads a row: player, team first, opponents, date, score after the goal', () => {
    expect(winners[0]).toEqual({
      season: 2016, player: 'Cristhian Stuani', team: 'Middlesbrough', clubs: ['Middlesbrough', 'Sunderland'],
      when: '2016-08-21', date: '2016-08-21', score: [1, 0],
    });
  });
  it('reads a name wrapped in {{nowrap}}', () => {
    expect(winners.find((w) => w.date === '2018-12-22')).toMatchObject({ player: 'Andros Townsend', team: 'Crystal Palace', score: [2, 1] });
  });
  it('reads italic links and ampersands', () => {
    expect(winners.at(-1)).toMatchObject({ player: 'Lewis Dunk', team: 'Brighton & Hove Albion', clubs: ['Brighton & Hove Albion', 'Coventry City'], score: [5, 0] });
  });
  it('gives every winner a score', () => {
    expect(winners.every((w) => w.score)).toBe(true);
  });
});

describe('isoDate', () => {
  it('reads "21 August 2016"', () => {
    expect(isoDate('21 August 2016')).toBe('2016-08-21');
    expect(isoDate('1 May 2021')).toBe('2021-05-01');
    expect(isoDate('Smarch 1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run games/pin/tests/wiki.test.ts`
Expected: FAIL, cannot resolve `../lib/wiki`.

- [ ] **Step 3: Write `wiki.ts`**

Create `games/pin/lib/wiki.ts`:

```ts
import { MONTH_NAMES } from './dates';
import type { Pick } from './match';

/**
 * The winners table of the English Wikipedia article "Premier League Goal of
 * the Month", as wikitext. A season starts with a row holding
 * "[[2016–17 Premier League]]"; a winner's row has nine cells: month, year,
 * flag, player ({{sortname|First|Last}}, sometimes inside {{nowrap|…}}),
 * team, score just after the goal (the team's first, "'''2'''–1"),
 * opponents, date ("21 August 2016"), ref.
 */
export interface Winner extends Pick { season: number; team: string; date: string }

/** Links to their shown text, no italics or bold, no templates, no cell attributes. */
function clean(cell: string): string {
  return cell
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/^[^|[\]]*=[^|[\]]*\|/, '')
    .trim();
}

/** "21 August 2016" → "2016-08-21", or null. */
export function isoDate(s: string): string | null {
  const m = /^(\d{1,2}) (\w+) (\d{4})$/.exec(s.trim());
  if (!m) return null;
  const month = MONTH_NAMES.findIndex((n) => n.toLowerCase() === m[2]!.toLowerCase());
  return month < 0 ? null : `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

export function parseWinners(wikitext: string): Winner[] {
  const out: Winner[] = [];
  let season: number | null = null;
  for (const row of wikitext.split(/\n\|-/)) {
    const head = /\[\[(\d{4})[–-]\d{2} Premier League\]\]/.exec(row);
    if (head) { season = Number(head[1]); continue; }
    const cells = row.split(/\n\|/).slice(1);
    if (season === null || cells.length < 8 || !/sortname/.test(cells[3]!)) continue;
    const date = isoDate(clean(cells[7]!));
    if (!date) continue;
    const name = /\{\{sortname\|([^|}]*)\|([^|}]*)/.exec(cells[3]!)!;
    const team = clean(cells[4]!);
    const score = /(\d+)\s*[–−-]\s*(\d+)/.exec(clean(cells[5]!));
    out.push({
      season, player: `${name[1]!.trim()} ${name[2]!.trim()}`, team, clubs: [team, clean(cells[6]!)], when: date, date,
      ...(score ? { score: [Number(score[1]), Number(score[2])] as [number, number] } : {}),
    });
  }
  return out;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run games/pin/tests/wiki.test.ts`
Expected: PASS, 6 tests. If one fails, read the diff and fix the parser, not the test: the expected values were read off the real table.

- [ ] **Step 5: Commit**

```bash
git add games/pin/lib/wiki.ts games/pin/tests/wiki.test.ts
git commit -m "feat(pin): read the Goal of the Month winners from Wikipedia" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 7: Switch the game from a daily to packs

One coherent switch: the data, the server, the pages and the components all
change together. Do the steps in order; the suite is red in the middle and
green at Step 15.

**Files:**
- Create: `games/pin/data/packs/{world-cup-2022,invincibles,lionesses,champions-league-finals,world-cup-classics,euros,messi-and-more}.json`
- Modify: `games/pin/data/goals.json` (drop 28 recent goals), `games/pin/lib/types.ts`, `games/pin/lib/shelves.ts`, `games/pin/lib/progress.ts`, `games/pin/server.ts`, `games/pin/components/PitchPin.tsx`, `games/pin/components/FullTime.tsx`, `games/pin/pin.css`, `app/pin/page.tsx`, `app/pin/layout.tsx`, `next.config.ts`
- Create: `games/pin/components/Library.tsx`, `app/pin/[id]/page.tsx`
- Delete: `games/pin/data/days.json`, `games/pin/data/packs.json`, `games/pin/lib/boards.ts`, `games/pin/lib/week.ts`, `games/pin/tests/boards.test.ts`, `games/pin/tests/week.test.ts`, `app/pin/[date]/`, `app/pin/pack/`, `scripts/build-pin-week.ts`
- Tests: rewrite `games/pin/tests/content.test.ts`, `server.test.ts`, `progress.test.ts`

- [ ] **Step 1: Write the pack files**

Create `games/pin/data/packs/` and these seven files, exactly (two-space JSON,
trailing newline). The first three are the old `packs.json`; the last four
use the 26 classics the dropped daily drew from. All seven were checked fair
(par ≥ 7 m a goal, goals in and out of the area) while planning.

`games/pin/data/packs/world-cup-2022.json`:
```json
{
  "id": "world-cup-2022",
  "kind": "classic",
  "title": "World Cup 2022",
  "subtitle": "Qatar · 6 goals",
  "published": "2026-10-08",
  "goals": [
    "richarlison-serbia",
    "aldawsari-argentina",
    "enzo-mexico",
    "messi-mexico",
    "dimaria-final-2022",
    "mbappe-volley-final"
  ]
}
```

`games/pin/data/packs/invincibles.json`:
```json
{
  "id": "invincibles",
  "kind": "classic",
  "title": "The Invincibles",
  "subtitle": "Arsenal 2003/04 · 6 goals",
  "published": "2026-10-08",
  "goals": [
    "henry-manutd-2004",
    "henry-liverpool-2004",
    "pires-anfield-2003",
    "edu-chelsea-2003",
    "vieira-spurs-2004",
    "vieira-leicester-2004"
  ]
}
```

`games/pin/data/packs/lionesses.json`:
```json
{
  "id": "lionesses",
  "kind": "classic",
  "title": "Lionesses",
  "subtitle": "England women · 6 goals",
  "published": "2026-10-08",
  "goals": [
    "russo-backheel",
    "toone-final",
    "kelly-final",
    "stanway-spain",
    "james-china",
    "agyemang-italy"
  ]
}
```

`games/pin/data/packs/champions-league-finals.json`:
```json
{
  "id": "champions-league-finals",
  "kind": "classic",
  "title": "Champions League finals",
  "subtitle": "2005 to 2018 · 7 goals",
  "published": "2026-10-09",
  "goals": [
    "gerrard-istanbul",
    "smicer-istanbul",
    "drogba-munich",
    "robben-wembley",
    "ramos-lisbon",
    "bale-overhead-2018",
    "bale-strike-2018"
  ]
}
```

`games/pin/data/packs/world-cup-classics.json`:
```json
{
  "id": "world-cup-classics",
  "kind": "classic",
  "title": "World Cup classics",
  "subtitle": "1970 to 2018 · 7 goals",
  "published": "2026-10-09",
  "goals": [
    "pele-1970",
    "carlos-alberto-1970",
    "maradona-hand",
    "maradona-solo",
    "ronaldo-spain",
    "pavard-argentina",
    "trippier-croatia"
  ]
}
```

`games/pin/data/packs/euros.json`:
```json
{
  "id": "euros",
  "kind": "classic",
  "title": "The Euros",
  "subtitle": "2020 and 2024 · 6 goals",
  "published": "2026-10-09",
  "goals": [
    "schick-scotland",
    "shaw-final",
    "bellingham-slovakia",
    "saka-switzerland",
    "yamal-france",
    "watkins-netherlands"
  ]
}
```

`games/pin/data/packs/messi-and-more.json`:
```json
{
  "id": "messi-and-more",
  "kind": "classic",
  "title": "Messi and more",
  "subtitle": "Barcelona, Real Madrid, Leicester · 6 goals",
  "published": "2026-10-09",
  "goals": [
    "ronaldinho-bernabeu",
    "messi-header-2009",
    "messi-wembley-2011",
    "vardy-manutd",
    "vardy-liverpool",
    "messi-bernabeu-2017"
  ]
}
```

- [ ] **Step 2: Drop the 28 recent goals only the daily used, and the old files**

```bash
node -e "const fs=require('fs');const f='games/pin/data/goals.json';const g=JSON.parse(fs.readFileSync(f,'utf8'));for(const k of Object.keys(g))if(k.startsWith('u-'))delete g[k];fs.writeFileSync(f,JSON.stringify(g,null,2)+'\n');console.log(Object.keys(g).length+' goals left')"
git rm -q games/pin/data/days.json games/pin/data/packs.json games/pin/lib/boards.ts games/pin/lib/week.ts games/pin/tests/boards.test.ts games/pin/tests/week.test.ts scripts/build-pin-week.ts
git rm -rq -- ":(literal)app/pin/[date]" app/pin/pack
```

Expected: `44 goals left`. (`:(literal)` stops git reading `[date]` as a
glob.)

- [ ] **Step 3: Final types**

In `games/pin/lib/types.ts`, make the pack fields required and change the
views. Replace the `Pack` interface from Task 3 with:

```ts
/** A pack file, games/pin/data/packs/<id>.json. `season` ("2026-27") is on round, month and season packs only. `published` is a UTC date. */
export interface Pack {
  id: string;
  kind: PackKind;
  title: string;
  subtitle: string;
  season?: string;
  published: string;
  goals: string[];
}
```

Replace the `BoardView` interface and its doc comment with:

```ts
/** A pack as the page gets it: everything but the answers. */
export interface BoardView {
  id: string;
  title: string;
  goals: GoalCard[];
  par: Tally;
}

/** A pack on the library page. */
export interface PackCard {
  id: string;
  kind: PackKind;
  title: string;
  subtitle: string;
  size: number;
  par: Tally;
  isNew: boolean;
}
export interface Shelf { title: string; packs: PackCard[] }
```

Then in `games/pin/lib/shelves.ts` drop the now-needless guards: change the
first line of `isNew`'s body to `if (!FRESH.has(p.kind)) return false;`, the
`newestFirst` line to
`const newestFirst = (a: Pack, b: Pack) => b.published.localeCompare(a.published) || b.id.localeCompare(a.id);`,
the `fresh` line to `const fresh = packs.filter((p) => FRESH.has(p.kind));`,
and the classic sort to
`...of('classic').sort((a, b) => a.published.localeCompare(b.published) || a.id.localeCompare(b.id)),`.

- [ ] **Step 4: Progress without the streak**

Replace `games/pin/lib/progress.ts` with:

```ts
import type { Spot } from './pitch';
import type { Answer } from './types';

/**
 * What the player has done, kept in the browser. No accounts: a throw is
 * written when the answer comes back, and the first throw at a goal is the
 * one that counts. A refresh resumes from here. Keyed by pack id.
 */
export interface Throw { pin: Spot; answer: Answer }
/** `finished` is the local date the last pin landed, or null. */
export interface PinPlay { throws: (Throw | null)[]; finished: string | null }
export type Store = Record<string, PinPlay>;

const KEY = 'pin.progress.v1';

export function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

export function recordThrow(board: string, n: number, i: number, t: Throw, today: string): Store {
  const store = readStore();
  const old = store[board];
  const play: PinPlay = old && old.throws.length === n ? old : { throws: Array<Throw | null>(n).fill(null), finished: null };
  if (!play.throws[i]) play.throws[i] = t;
  if (play.finished === null && play.throws.every(Boolean)) play.finished = today;
  store[board] = play;
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode, or full */ }
  return store;
}

export type Status =
  | { state: 'unplayed' }
  | { state: 'part'; thrown: number }
  | { state: 'done'; distances: number[] };

/** Where this browser is with a pack of n goals. A save of another length (the pack changed) counts as unplayed. */
export function packStatus(play: PinPlay | undefined, n: number): Status {
  if (!play || play.throws.length !== n) return { state: 'unplayed' };
  const thrown = play.throws.filter((t): t is Throw => !!t);
  if (thrown.length === n) return { state: 'done', distances: thrown.map((t) => t.answer.distance) };
  return thrown.length ? { state: 'part', thrown: thrown.length } : { state: 'unplayed' };
}

/** The next pack in library order this browser has not finished, starting after the current one and wrapping. Null when all are done. */
export function nextPack(order: readonly { id: string; size: number }[], store: Store, current: string): string | null {
  const i = order.findIndex((p) => p.id === current);
  const rest = [...order.slice(i + 1), ...order.slice(0, Math.max(i, 0))];
  return rest.find((p) => packStatus(store[p.id], p.size).state !== 'done')?.id ?? null;
}
```

- [ ] **Step 5: The server reads pack files**

Replace `games/pin/server.ts` with:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import goalsJson from './data/goals.json';
import { utcToday } from './lib/dates';
import { distance, inHalf, mirrorNote, type Spot } from './lib/pitch';
import { par } from './lib/score';
import { isNew, shelve } from './lib/shelves';
import type { Answer, BoardView, Goals, Pack, PackCard, Shelf } from './lib/types';

/**
 * Pitch pin's ref. The coordinates stay here: the page gets the goals
 * without them, and a throw gets back the one answer it was thrown at.
 */
const goals = goalsJson as unknown as Goals;

/** Every pack file, read once. Relative to the project root, as in src/server/board.ts; next.config.ts traces them. */
const DIR = 'games/pin/data/packs';
const packs: Pack[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Pack);
const byId = new Map(packs.map((p) => [p.id, p]));

const parOf = (p: Pack) => par(p.goals.map((s) => goals[s]!.at));

export function boardView(id: string): BoardView | null {
  const p = byId.get(id);
  if (!p || p.goals.some((s) => !goals[s])) return null;
  return {
    id: p.id,
    title: p.title,
    par: parOf(p),
    goals: p.goals.map((slug) => {
      const g = goals[slug]!;
      return { slug, scorer: g.scorer, match: g.match, date: g.date, competition: g.competition, line: g.line, credit: g.source.from };
    }),
  };
}

/** The library: every pack on its shelf, with no answers. */
export function library(now = new Date()): Shelf[] {
  const today = utcToday(now);
  return shelve(packs).map((s) => ({
    title: s.title,
    packs: s.packs.map((p): PackCard => ({
      id: p.id, kind: p.kind, title: p.title, subtitle: p.subtitle, size: p.goals.length, par: parOf(p), isNew: isNew(p, today),
    })),
  }));
}

export interface ThrowRequest { board: string; goal: string; pin: Spot }

/** A throw as the route accepts it: short strings and a finite point inside the half. */
export function parseThrow(body: unknown): ThrowRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.board !== 'string' || typeof b.goal !== 'string' || b.board.length > 40 || b.goal.length > 60) return null;
  if (typeof b.x !== 'number' || typeof b.y !== 'number' || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
  const pin = { x: b.x, y: b.y };
  return inHalf(pin) ? { board: b.board, goal: b.goal, pin } : null;
}

/** The answer to one throw, or null when that goal is not in that pack. */
export function judge({ board, goal, pin }: ThrowRequest): Answer | null {
  const p = byId.get(board);
  const g = goals[goal];
  if (!p || !g || !p.goals.includes(goal)) return null;
  return { at: g.at, distance: distance(pin, g.at), mirrored: mirrorNote(pin, g.at), xg: g.xg, credit: g.source.from };
}
```

`app/api/pin/throw/route.ts` calls `judge(t)` and needs no change.

- [ ] **Step 6: Trace the pack files for a serverless deploy**

In `next.config.ts`, add a line to the `'/**'` list in `outputFileTracingIncludes`,
after `'./content/puzzles/*.json',`:

```ts
      './games/pin/data/packs/*.json',
```

- [ ] **Step 7: PitchPin without the daily**

Replace `games/pin/components/PitchPin.tsx` from the top down to the end of
the `PinLogo` function with the code below. Keep `Ticks`, `GoalCard`,
`xgText`, `watchUrl` and `Result` exactly as they are. Delete the `More`
function at the bottom of the file entirely.

```tsx
'use client';
import { useEffect, useState } from 'react';
import Pitch from './Pitch';
import FullTime from './FullTime';
import { localDate, longDate } from '../../../src/lib/daily';
import { nextPack, readStore, recordThrow, type Store, type Throw } from '../lib/progress';
import { points, ring, RING_NAME, tally, type Mode } from '../lib/score';
import type { Spot } from '../lib/pitch';
import type { Answer, BoardView, GoalCard as Card } from '../lib/types';

/**
 * A Pitch pin pack: its goals, one throw each. The page holds no answers;
 * each throw goes to /api/pin/throw and the answer comes back for that goal
 * alone. Progress is kept in the browser so a refresh resumes. `order` is
 * the library's packs in shelf order, for the Next pack link.
 */
export default function PitchPin({ board, mode, order }: {
  board: BoardView; mode: Mode; order: { id: string; size: number }[];
}) {
  const n = board.goals.length;
  const [throws, setThrows] = useState<(Throw | null)[]>(() => Array<Throw | null>(n).fill(null));
  const [store, setStore] = useState<Store>({});
  const [loaded, setLoaded] = useState(false);
  const [pin, setPin] = useState<Spot | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const s = readStore();
    const saved = s[board.id]?.throws;
    if (saved && saved.length === n) setThrows(saved);
    setStore(s);
    setLoaded(true);
  }, [board.id, n]);

  const next = throws.findIndex((t) => !t);
  const done = next === -1 && viewing === null;
  const current = viewing ?? Math.max(next, 0);
  const goal = board.goals[current]!;
  const query = mode === 'points' ? '?score=points' : '';

  async function throwPin() {
    if (!pin || busy || next === -1) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/pin/throw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ board: board.id, goal: board.goals[next]!.slug, x: pin.x, y: pin.y }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const answer = (await res.json()) as Answer;
      const s = recordThrow(board.id, n, next, { pin, answer }, localDate());
      setThrows(s[board.id]!.throws);
      setStore(s);
      setViewing(next);
      setPin(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const shown = viewing !== null ? throws[viewing] : null;
  const credits = [...new Set(board.goals.map((g) => g.credit))]
    .map((c) => (c === 'statsbomb' ? 'StatsBomb open data' : 'Understat'))
    .join(' and ');
  const pointsSoFar = tally(throws.filter((t): t is Throw => !!t).map((t) => t.answer.distance)).points;

  return (
    <div className="app pin">
      <header className="masthead">
        <a className="masthead__brand display" href={`/pin${query}`}>
          <PinLogo />
          Pitch pin
        </a>
        <div className="masthead__meta"><span>{board.title}</span></div>
      </header>

      <main className="pin__main">
        {!loaded ? null : done ? (
          <FullTime board={board} throws={throws as Throw[]} mode={mode} nextId={nextPack(order, store, board.id)} query={query} />
        ) : (
          <>
            <Ticks n={n} thrown={throws.filter(Boolean).length} current={current} />
            <GoalCard goal={goal} small={shown !== null} />
            {shown ? (
              <>
                <Pitch label={`Your pin, ${shown.answer.distance.toFixed(1)} metres from where it was struck`} reveal={{ pin: shown.pin, at: shown.answer.at }} />
                <Result
                  t={shown}
                  goal={goal}
                  mode={mode}
                  pointsSoFar={pointsSoFar}
                  last={next === -1}
                  onNext={() => setViewing(null)}
                />
              </>
            ) : (
              <>
                <Pitch label="The attacking half of a pitch, goal at the top. Place your pin." pin={pin} onPin={setPin} onEnter={throwPin} />
                <p className="pin__hint">Where was it struck from? Tap the pitch, drag to adjust.</p>
                {failed ? <p className="pin__error" role="alert">Could not reach the ref. Try again.</p> : null}
                <button type="button" className="pin__throw display" disabled={!pin || busy} onClick={throwPin}>Throw</button>
              </>
            )}
          </>
        )}
        <a className="pin__back" href={`/pin${query}`}>All packs</a>
        <p className="pin__credit">Shot data: {credits}. Metres on a standard pitch.</p>
      </main>
    </div>
  );
}

export function PinLogo() {
  return (
    <svg className="masthead__mark masthead__mark--pin" viewBox="0 0 22 30" aria-hidden>
      <circle cx="11" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="11" cy="10" r="3.2" fill="currentColor" />
      <line x1="11" y1="18.5" x2="11" y2="29" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 8: FullTime without the streak**

In `games/pin/components/FullTime.tsx`:

Replace the doc comment and signature

```tsx
/** The board finished: the total against par, all six pins, the list, the streak, the share. */
export default function FullTime({ board, throws, mode, streak }: {
  board: BoardView; throws: Throw[]; mode: Mode; streak: number | null;
}) {
```

with

```tsx
/** The pack finished: the total against par, every pin, the list, the share, the next pack. */
export default function FullTime({ board, throws, mode, nextId, query }: {
  board: BoardView; throws: Throw[]; mode: Mode; nextId: string | null; query: string;
}) {
```

Replace `<Pitch label="All six pins against where each goal was struck" all=`
with `<Pitch label={`All ${throws.length} pins against where each goal was struck`} all=`.

Delete the line
`{streak ? <p className="pin__streak">Streak: {streak} {streak === 1 ? 'day' : 'days'}</p> : null}`.

Replace `<ShareButton text={text} />` with:

```tsx
      <ShareButton text={text} />
      {nextId ? <a className="pin__nextpack display" href={`/pin/${nextId}${query}`}>Next pack</a> : null}
```

- [ ] **Step 9: The library component**

Create `games/pin/components/Library.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { PinLogo } from './PitchPin';
import { packStatus, readStore, type Store } from '../lib/progress';
import { againstPar, tally, type Mode } from '../lib/score';
import type { PackCard, Shelf } from '../lib/types';

/**
 * The library: packs on shelves. The shelves come from the server; what this
 * browser has played is filled in after mount, since localStorage is not on
 * the server.
 */
export default function Library({ shelves, mode }: { shelves: Shelf[]; mode: Mode }) {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => setStore(readStore()), []);
  const query = mode === 'points' ? '?score=points' : '';
  return (
    <div className="app pin">
      <header className="masthead">
        <a className="masthead__brand display" href={`/pin${query}`}>
          <PinLogo />
          Pitch pin
        </a>
      </header>
      <main className="pin__main">
        <p className="pin__intro">Famous goals in packs. Pin where each was struck from; a bullseye is within two metres.</p>
        {shelves.map((s) => (
          <section key={s.title} className="pin__shelf">
            <h2 className="pin__shelfhead display">{s.title}</h2>
            <ul className="pin__packs">
              {s.packs.map((p) => (
                <li key={p.id}>
                  <a className="pin__pack" href={`/pin/${p.id}${query}`}>
                    <span className="pin__packtitle display">{p.title}</span>
                    <span className="pin__packsub">{p.subtitle}</span>
                    <span className="pin__packfoot">
                      {p.isNew ? <span className="pin__new display">New</span> : null}
                      <span className="pin__status">{store ? statusText(p, store, mode) : ' '}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="pin__credit">
          Shot data: Understat and StatsBomb open data. Shortlists: the Premier League. Past winners: Wikipedia.
        </p>
      </main>
    </div>
  );
}

function statusText(p: PackCard, store: Store, mode: Mode): string {
  const s = packStatus(store[p.id], p.size);
  if (s.state === 'unplayed') return 'Not played';
  if (s.state === 'part') return `${s.thrown} of ${p.size}`;
  const t = tally(s.distances);
  return mode === 'points' ? `${t.points} / ${p.size * 100}` : `${t.metres.toFixed(1)} m, ${againstPar(t.metres, p.par.metres)}`;
}
```

- [ ] **Step 10: The pages**

Replace `app/pin/page.tsx` with:

```tsx
import Library from '../../games/pin/components/Library';
import { library } from '../../games/pin/server';

/** The library. Rendered per request, so New is always current. */
export const dynamic = 'force-dynamic';

export default async function PinLibrary({ searchParams }: { searchParams: Promise<{ score?: string }> }) {
  const { score } = await searchParams;
  return <Library shelves={library()} mode={score === 'points' ? 'points' : 'metres'} />;
}
```

Create `app/pin/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import PitchPin from '../../../games/pin/components/PitchPin';
import { boardView, library } from '../../../games/pin/server';

/** A pack. The id is checked before it is looked up; an unknown pack is a 404. */
export default async function PinPack({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ score?: string }>;
}) {
  const { id } = await params;
  const { score } = await searchParams;
  const board = /^[a-z0-9-]{1,40}$/.test(id) ? boardView(id) : null;
  if (!board) notFound();
  const order = library().flatMap((s) => s.packs.map((p) => ({ id: p.id, size: p.size })));
  return <PitchPin board={board} mode={score === 'points' ? 'points' : 'metres'} order={order} />;
}
```

In `app/pin/layout.tsx`, change the description to
`'Famous goals in packs. Pin where each was struck from.'`.

- [ ] **Step 11: Styles**

In `games/pin/pin.css`:

Change the selector `.pin__throw, .pin__next {` to `.pin__throw, .pin__next, .pin__nextpack {`.

After the line `.pin__next { flex-grow: 1; background: var(--sticker); color: var(--ink); border: 2px solid var(--ink); }` add:

```css
.pin__nextpack { display: flex; align-items: center; justify-content: center; background: var(--sticker); color: var(--ink); border: 2px solid var(--ink); text-decoration: none; }
```

Delete the line `.pin__streak { margin: 0; font-weight: 600; }`.

Replace the whole "More boards and the credit" block (the comment line and
the five `.pin__more…` rules; keep `.pin__credit`) with:

```css
/* ── The library ────────────────────────────────────────────────────── */
.pin__intro { margin: 0; font-size: 15px; color: var(--muted); }
.pin__shelf { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.pin__shelfhead { margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; }
.pin__packs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.pin__pack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  padding: 12px 14px;
  background: var(--sticker);
  border-radius: 6px;
  box-shadow: 0 1px 0 rgba(20, 18, 16, 0.12);
  color: var(--ink);
  text-decoration: none;
}
.pin__pack:hover, .pin__pack:focus-visible { box-shadow: 0 0 0 2px var(--ink); }
.pin__packtitle { font-size: 20px; font-weight: 800; line-height: 1; text-transform: uppercase; }
.pin__packsub { font-size: 13px; color: var(--muted); }
.pin__packfoot { margin-top: auto; padding-top: 6px; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.pin__new { background: var(--red); color: #fff; border-radius: 3px; padding: 1px 6px 2px; font-size: 13px; font-weight: 800; text-transform: uppercase; }
.pin__status { color: var(--muted); }
.pin__back { align-self: center; font-size: 14px; color: var(--ink); }

/* ── The credit ─────────────────────────────────────────────────────── */
```

Also change the file's header comment reference
`See docs/superpowers/specs/2026-10-08-pitch-pin-design.md.` to
`See docs/superpowers/specs/2026-10-08-pitch-pin-design.md and 2026-10-09-pitch-pin-library-design.md.`

- [ ] **Step 12: Rewrite the content test**

Replace `games/pin/tests/content.test.ts` with:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import goalsJson from '../data/goals.json';
import { isDate } from '../lib/dates';
import { leaks } from '../lib/line';
import { inHalf } from '../lib/pitch';
import { fair } from '../lib/round';
import { PACK_KINDS, type Goals, type Pack } from '../lib/types';

const goals = goalsJson as unknown as Goals;
const DIR = 'games/pin/data/packs';
const packs = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Pack] as const);
const SEASONAL = new Set(['round', 'month', 'season']);

describe('every goal', () => {
  for (const [slug, g] of Object.entries(goals)) {
    it(slug, () => {
      expect(g.scorer && g.match && g.competition && g.line).toBeTruthy();
      expect(isDate(g.date)).toBe(true);
      expect(inHalf(g.at)).toBe(true);
      expect(g.xg).toBeGreaterThanOrEqual(0);
      expect(g.xg).toBeLessThanOrEqual(1);
      expect(leaks(g.line)).toEqual([]);
      expect(g.source.from).toBe(g.kind === 'classic' ? 'statsbomb' : 'understat');
    });
  }
  it('is in at least one pack', () => {
    const used = new Set(packs.flatMap(([, p]) => p.goals));
    expect(Object.keys(goals).filter((s) => !used.has(s))).toEqual([]);
  });
});

describe('every pack', () => {
  it('there are at least the seven classic packs', () => {
    expect(packs.length).toBeGreaterThanOrEqual(7);
  });
  for (const [file, p] of packs) {
    it(file, () => {
      expect(p.id).toBe(file.replace(/\.json$/, ''));
      expect(p.id).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(PACK_KINDS).toContain(p.kind);
      expect(p.title && p.subtitle).toBeTruthy();
      expect(isDate(p.published)).toBe(true);
      if (SEASONAL.has(p.kind)) expect(p.season).toMatch(/^\d{4}-\d{2}$/);
      else expect(p.season).toBeUndefined();
      expect(p.goals.length).toBeGreaterThanOrEqual(6);
      expect(p.goals.length).toBeLessThanOrEqual(9);
      expect(new Set(p.goals).size).toBe(p.goals.length);
      for (const s of p.goals) expect(goals[s], s).toBeDefined();
      if (p.kind === 'round' || p.kind === 'classic') expect(fair(p.goals.map((s) => goals[s]!.at))).toBe(true);
    });
  }
});

describe('the copy', () => {
  it('is gender-neutral in every component', () => {
    for (const f of readdirSync('games/pin/components').filter((f) => f.endsWith('.tsx'))) {
      const text = readFileSync(`games/pin/components/${f}`, 'utf8');
      expect(text.match(/\b(he|his|him)\b/gi), f).toBeNull();
    }
  });
});
```

- [ ] **Step 13: Rewrite the server test**

Replace `games/pin/tests/server.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { boardView, judge, library, parseThrow } from '../server';
import { distance, SPOT } from '../lib/pitch';

const NOW = new Date('2026-10-09T12:00:00Z');

describe('board views', () => {
  it('ship a pack without its answers', () => {
    const b = boardView('lionesses')!;
    expect(b.goals).toHaveLength(6);
    expect(b.title).toBe('Lionesses');
    expect(JSON.stringify(b)).not.toMatch(/"at"|"xg"|"source"|"eventId"/);
    expect(b.par.metres).toBeGreaterThanOrEqual(42);
  });
  it('refuse nonsense ids', () => {
    for (const id of ['', 'nope', 'pack:lionesses', '../goals', '__proto__', 'constructor', '2026-10-08']) {
      expect(boardView(id), id).toBeNull();
    }
  });
});

describe('the library', () => {
  it('shelves every pack once, with no answers', () => {
    const shelves = library(NOW);
    const ids = shelves.flatMap((s) => s.packs.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('lionesses');
    expect(ids).toContain('champions-league-finals');
    expect(shelves.at(-1)!.title).toBe('Archive');
    expect(JSON.stringify(shelves)).not.toMatch(/"at"|"xg"|"goals"|"source"/);
  });
  it('never marks an archive or classic pack new', () => {
    for (const s of library(NOW)) for (const p of s.packs) if (p.kind !== 'round' && p.kind !== 'month') expect(p.isNew, p.id).toBe(false);
  });
});

describe('judging a throw', () => {
  it('returns the answer for a goal in the pack', () => {
    const slug = boardView('lionesses')!.goals[0]!.slug;
    const a = judge({ board: 'lionesses', goal: slug, pin: SPOT })!;
    expect(a.distance).toBeCloseTo(distance(SPOT, a.at));
    expect(a.credit).toBe('statsbomb');
    expect(a.xg).toBeGreaterThan(0);
  });
  it('will not judge a goal that is not in the pack, or a pack that does not exist', () => {
    expect(judge({ board: 'lionesses', goal: 'bale-overhead-2018', pin: SPOT })).toBeNull();
    expect(judge({ board: 'pack:lionesses', goal: 'russo-backheel', pin: SPOT })).toBeNull();
  });
});

describe('parsing a throw', () => {
  it('takes a clean throw', () => {
    expect(parseThrow({ board: 'x', goal: 'g', x: 1, y: 2 })).toEqual({ board: 'x', goal: 'g', pin: { x: 1, y: 2 } });
  });
  it('refuses anything else', () => {
    const bad = [null, 'x', [], { board: 1, goal: 'g', x: 1, y: 1 }, { board: 'b', goal: 'g', x: '1', y: 1 },
      { board: 'b', goal: 'g', x: Number.NaN, y: 1 }, { board: 'b', goal: 'g', x: 70, y: 1 }, { board: 'b', goal: 'g', x: 1, y: -1 },
      { board: 'b'.repeat(41), goal: 'g', x: 1, y: 1 }];
    for (const b of bad) expect(parseThrow(b), JSON.stringify(b)).toBeNull();
  });
});
```

- [ ] **Step 14: Rewrite the progress test**

In `games/pin/tests/progress.test.ts`:

Change the import line to
`import { nextPack, packStatus, readStore, recordThrow, type Throw } from '../lib/progress';`.

Delete the `const finish = …` line and the whole `describe('the streak', …)`
block. Append:

```ts
describe('pack status', () => {
  it('is unplayed with nothing saved, or with a save of another length', () => {
    expect(packStatus(undefined, 6)).toEqual({ state: 'unplayed' });
    recordThrow('p', 2, 0, t(1), '2026-10-09');
    expect(packStatus(readStore().p, 3)).toEqual({ state: 'unplayed' });
  });
  it('counts a part-thrown pack', () => {
    recordThrow('p', 3, 0, t(1), '2026-10-09');
    recordThrow('p', 3, 2, t(2), '2026-10-09');
    expect(packStatus(readStore().p, 3)).toEqual({ state: 'part', thrown: 2 });
  });
  it('gives the distances of a finished pack', () => {
    recordThrow('p', 2, 0, t(1), '2026-10-09');
    recordThrow('p', 2, 1, t(2), '2026-10-09');
    expect(packStatus(readStore().p, 2)).toEqual({ state: 'done', distances: [1, 2] });
  });
});

describe('the next pack', () => {
  const order = [{ id: 'a', size: 1 }, { id: 'b', size: 1 }, { id: 'c', size: 1 }];
  it('is the next unfinished pack after this one, wrapping round', () => {
    recordThrow('b', 1, 0, t(1), '2026-10-09');
    expect(nextPack(order, readStore(), 'a')).toBe('c');
    expect(nextPack(order, readStore(), 'c')).toBe('a');
  });
  it('is null when every other pack is finished', () => {
    for (const id of ['a', 'b', 'c']) recordThrow(id, 1, 0, t(1), '2026-10-09');
    expect(nextPack(order, readStore(), 'a')).toBeNull();
  });
});
```

- [ ] **Step 15: Run everything**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all tests pass. If typecheck names a file that
still imports `boards`, `week`, `days.json`, `packs.json`, `packList` or
`streakOf`, that file was missed above: fix it in the same spirit (packs,
not days) and re-run. Check with
`grep -rn "lib/boards\|lib/week\|days.json\|packs.json\|packList\|streakOf\|PIN_EPOCH" app games scripts components src`
which must print nothing.

- [ ] **Step 16: Commit**

```bash
git status --short
git add -A games/pin app/pin next.config.ts
git commit -m "feat(pin): packs instead of a daily: pack files, the library, no streak" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 8: Understat helpers and the round script, then a real run

**Files:**
- Create: `scripts/pin-files.ts`, `scripts/understat.ts`, `scripts/build-pin-round.ts`
- Modify: `package.json` (scripts)

No unit test here: the pure parts (`weekEnd`, `spanTitle`, `rankRecent`,
`pickRound`, `scoreAfter`) are tested already. This task's check is a real
run against Understat.

- [ ] **Step 1: File helpers**

Create `scripts/pin-files.ts`:

```ts
/** Reading and writing Pitch pin's data files, for the scripts. Paths are relative to the project root. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Goals, Pack } from '../games/pin/lib/types';

export const GOALS = 'games/pin/data/goals.json';
export const PACKS = 'games/pin/data/packs';
export const CHECK = 'games/pin/data/check.json';

export const readGoals = (): Goals => JSON.parse(readFileSync(GOALS, 'utf8')) as Goals;
export const writeGoals = (g: Goals): void => writeFileSync(GOALS, `${JSON.stringify(g, null, 2)}\n`);

export const packExists = (id: string): boolean => existsSync(`${PACKS}/${id}.json`);
export const readPacks = (): Pack[] =>
  readdirSync(PACKS).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${PACKS}/${f}`, 'utf8')) as Pack);

/** Pack files keep one key order, so a diff shows only what changed. */
export function writePack(p: Pack): void {
  const { id, kind, title, subtitle, season, published, goals } = p;
  const out = { id, kind, title, subtitle, ...(season ? { season } : {}), published, goals };
  writeFileSync(`${PACKS}/${id}.json`, `${JSON.stringify(out, null, 2)}\n`);
}

/** `--name value` from the command line. */
export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
```

- [ ] **Step 2: Understat**

Create `scripts/understat.ts`:

```ts
/**
 * Understat, the source of Premier League goals. It publishes no terms: it
 * is called one request at a time with a pause between, and only the goals
 * in a pack are kept. It is slow (one call took 20 s) and sometimes refuses:
 * time out, back off, retry, then fail loudly.
 *
 *   GET understat.com/getLeagueData/EPL/<season start year>  → { dates: Fixture[] }
 *   GET understat.com/getMatchData/<id>                       → { shots: { h: Shot[]; a: Shot[] } }
 */
import { seasonLabel } from '../games/pin/lib/dates';
import { recentLine } from '../games/pin/lib/line';
import { fixturesFor, goalFor, scoreAfter, type Pick } from '../games/pin/lib/match';
import { fromUnderstat, round1 } from '../games/pin/lib/pitch';
import type { Goal } from '../games/pin/lib/types';

const HEADERS = { 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' };

export interface Fixture {
  id: string; isResult: boolean; datetime: string;
  h: { title: string }; a: { title: string };
  goals: { h: string | null; a: string | null };
}
export interface Shot {
  id: string; minute: string; result: string; X: string; Y: string; xG: string; player: string; h_a: 'h' | 'a';
  situation: string; shotType: string; lastAction: string; h_team: string; a_team: string; date: string;
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(url: string): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return (await res.json()) as T;
    } catch { /* slow or refused */ }
    await pause(3000 * (i + 1));
  }
  throw new Error(`Understat did not answer: ${url}`);
}

/** Every Premier League fixture of a season, played or not. */
export async function leagueFixtures(season: number): Promise<Fixture[]> {
  const d = await get<{ dates?: Fixture[] }>(`https://understat.com/getLeagueData/EPL/${season}`);
  if (!Array.isArray(d.dates)) throw new Error(`Understat league data for ${season} has no fixtures list; has it changed?`);
  return d.dates;
}

/** Every shot in a match, both sides. Waits a second first, to be polite. */
export async function matchShots(id: string): Promise<Shot[]> {
  await pause(1000);
  const m = await get<{ shots?: { h: Shot[]; a: Shot[] } }>(`https://understat.com/getMatchData/${id}`);
  if (!m.shots) throw new Error(`Understat match ${id} has no shots; has it changed?`);
  return [...m.shots.h, ...m.shots.a];
}

/**
 * A shot as a goal record (its slug is `u-<shot id>`). The line gives the
 * score after the goal only when the shots add up to the result.
 */
export function toGoal(f: Fixture, shots: readonly Shot[], s: Shot, season: number): Goal {
  const { after, final } = scoreAfter(shots);
  const trusted = f.goals.h !== null && final[0] === Number(f.goals.h) && final[1] === Number(f.goals.a);
  const raw = fromUnderstat(Number(s.X), Number(s.Y));
  return {
    scorer: s.player,
    match: `${s.h_team} v ${s.a_team}`,
    date: s.date.slice(0, 10),
    competition: `Premier League ${seasonLabel(season)}`,
    line: recentLine({
      shotType: s.shotType, situation: s.situation, lastAction: s.lastAction, minute: Number(s.minute),
      score: trusted ? after.get(s.id) ?? null : null,
    }),
    kind: 'recent',
    source: { from: 'understat', matchId: Number(f.id), shotId: s.id },
    at: { x: round1(raw.x), y: round1(raw.y) },
    xg: Math.round(Number(s.xG) * 100) / 100,
  };
}

/** An official pick as [slug, goal]: its fixture, then its shot. Null, with the reason logged, when it cannot be told apart. */
export async function officialGoal(pick: Pick, fixtures: readonly Fixture[], season: number): Promise<[string, Goal] | null> {
  const fx = fixturesFor(pick, fixtures);
  if (fx.length !== 1) {
    console.log(`  ${pick.player}: ${fx.length} fixtures for ${pick.clubs.join(' v ')} (${pick.when})`);
    return null;
  }
  const f = fx[0]!;
  const shots = await matchShots(f.id);
  const s = goalFor(pick, f, shots);
  if (!s) {
    console.log(`  ${pick.player}: no single goal of theirs in ${f.h.title} v ${f.a.title}`);
    return null;
  }
  return [`u-${s.id}`, toGoal(f, shots, s, season)];
}
```

- [ ] **Step 3: The round script**

Create `scripts/build-pin-round.ts`:

```ts
/**
 * Pitch pin's round packs: six goals from each Tuesday-to-Monday week of
 * Premier League results, picked by our ranking (lowest xG first, one goal a
 * match, fair). Runs unattended: `npm run pin:update`, daily, from
 * .github/workflows/pin-packs.yml.
 *
 *   npx tsx scripts/build-pin-round.ts [--today YYYY-MM-DD]
 *
 * Makes a pack for every complete week of the season that has results and
 * no pack yet, so the first run fills the season so far and a missed week is
 * made late, not lost. A normal day costs one request. A week waits while a
 * match that kicked off in the last three days has no result on Understat;
 * after that the match is taken as postponed. A week with fewer than five
 * results gets no pack. June and July: nothing to do.
 */
import { addDays, seasonLabel, seasonOf, seasonTag, spanTitle, utcToday, weekEnd } from '../games/pin/lib/dates';
import { pickRound, rankRecent, type Candidate } from '../games/pin/lib/round';
import type { Goal } from '../games/pin/lib/types';
import { arg, packExists, readGoals, writeGoals, writePack } from './pin-files';
import { leagueFixtures, matchShots, toGoal, type Fixture } from './understat';

const today = arg('today') ?? utcToday();
const month = Number(today.slice(5, 7));
if (month === 6 || month === 7) {
  console.log('No Premier League football in June or July.');
  process.exit(0);
}

const season = seasonOf(today);
const fixtures = await leagueFixtures(season);

// Fixtures by the Monday that ends their week, for weeks that are over.
const weeks = new Map<string, Fixture[]>();
for (const f of fixtures) {
  const end = weekEnd(f.datetime.slice(0, 10));
  if (end >= today) continue;
  weeks.set(end, [...(weeks.get(end) ?? []), f]);
}

const goals = readGoals();
let made = 0;
for (const [end, fs] of [...weeks].sort(([a], [b]) => a.localeCompare(b))) {
  const id = `pl-${seasonTag(season)}-${end}`;
  if (packExists(id)) continue;
  const waiting = fs.filter((f) => !f.isResult && f.datetime.slice(0, 10) >= addDays(today, -3));
  if (waiting.length) {
    console.log(`${id}: waiting for ${waiting.map((f) => `${f.h.title} v ${f.a.title}`).join(', ')}`);
    continue;
  }
  const played = fs.filter((f) => f.isResult);
  if (played.length < 5) {
    if (played.length) console.log(`${id}: only ${played.length} results, no pack`);
    continue;
  }
  const found: Record<string, Goal> = {};
  const candidates: Candidate[] = [];
  for (const f of played) {
    const shots = await matchShots(f.id);
    for (const s of shots) {
      if (s.result !== 'Goal' || s.situation === 'Penalty') continue;
      const g = toGoal(f, shots, s, season);
      found[`u-${s.id}`] = g;
      candidates.push({ slug: `u-${s.id}`, matchId: Number(f.id), xg: g.xg, at: g.at });
    }
  }
  const picks = pickRound(rankRecent(candidates));
  const dates = played.map((f) => f.datetime.slice(0, 10)).sort();
  for (const p of picks) goals[p.slug] ??= found[p.slug]!;
  writePack({
    id,
    kind: 'round',
    title: spanTitle(dates[0]!, dates[dates.length - 1]!),
    subtitle: `Premier League ${seasonLabel(season)} · 6 goals`,
    season: seasonTag(season),
    published: addDays(end, 1),
    goals: picks.map((p) => p.slug),
  });
  made++;
  console.log(`${id}: ${picks.map((p) => `${found[p.slug]!.scorer} (xG ${found[p.slug]!.xg})`).join(', ')}`);
}

if (made) writeGoals(goals);
console.log(`${made} round packs written`);
```

- [ ] **Step 4: npm scripts**

In `package.json` `"scripts"`, add after `"check:chain": …,` (keep the
comma style of the file):

```json
    "pin:update": "tsx scripts/build-pin-round.ts && tsx scripts/build-pin-gotm.ts",
    "pin:round": "tsx scripts/build-pin-round.ts",
    "pin:archive": "tsx scripts/import-pin-archive.ts",
    "pin:classics": "tsx scripts/fetch-pin-classics.ts",
```

(`pin:update` names `build-pin-gotm.ts`, which Task 9 creates. Until then run
`npm run pin:round`.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Real run**

Run: `npm run pin:round`
(It makes about 50 Understat calls, a second apart; allow up to 10 minutes.
Use a timeout of 600000 ms on the Bash call.)

Expected, roughly: one line a week for the weeks ending
2026-08-24, 2026-08-31, 2026-09-14 and 2026-09-21 (the week ending
2026-09-07 may be an international break with no line), each naming six
scorers with their xG; then `4 round packs written` (3 to 5 is fine). New
files `games/pin/data/packs/pl-2026-27-*.json`; `goals.json` grows by six a
pack. **Paste the output in your reply.**

If it throws `No fair pack` or `Only N matches`, read which week, look at
that week's results, and report it rather than loosening `fair`.

- [ ] **Step 7: Check what it wrote**

Run:
```bash
cat games/pin/data/packs/pl-2026-27-2026-09-21.json
npm test
npm run pin:round
```
Expected: the pack file has `"kind": "round"`, a title like `"19–21 September"`
(dates of that week's matches), `"season": "2026-27"`,
`"published": "2026-09-22"`, six `u-…` goals. `npm test` passes (the content
test now checks each round pack is fair and every goal is in a pack). The
second `pin:round` writes nothing: `0 round packs written`.

- [ ] **Step 8: Commit**

```bash
git status --short
git add scripts/pin-files.ts scripts/understat.ts scripts/build-pin-round.ts package.json games/pin/data
git commit -m "feat(pin): round packs from each week of Premier League results" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 9: The Goal of the Month script, then a real run

**Files:**
- Create: `scripts/build-pin-gotm.ts`

- [ ] **Step 1: Write the script**

Create `scripts/build-pin-gotm.ts`:

```ts
/**
 * Pitch pin's Goal of the Month packs: the Premier League's shortlist for
 * last month (and the month before while its pack is missing), each nominee
 * matched to its Understat shot. Runs unattended: `npm run pin:update`.
 *
 *   npx tsx scripts/build-pin-gotm.ts [--today YYYY-MM-DD]
 *
 * A 404 means no shortlist yet: nothing to do. A page that loads but lists
 * no nominee we can read means the page has changed: exit 1, so the run goes
 * red. Fewer than six matched: no pack, tried again tomorrow. Also appends
 * the month's model check (how many nominees our round packs had picked) to
 * games/pin/data/check.json.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { monthName, seasonLabel, seasonOf, seasonTag, utcToday } from '../games/pin/lib/dates';
import { gotmUrl, monthsDue, parseShortlist } from '../games/pin/lib/gotm';
import type { Goal } from '../games/pin/lib/types';
import { arg, CHECK, packExists, readGoals, readPacks, writeGoals, writePack } from './pin-files';
import { leagueFixtures, officialGoal } from './understat';

interface Check { month: string; nominees: number; matched: number; inOurPicks: number }

const today = arg('today') ?? utcToday();
const goals = readGoals();
let made = 0;

for (const ym of monthsDue(today, (m) => packExists(`gotm-${m}`))) {
  const url = gotmUrl(ym);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) });
  if (res.status === 404) {
    console.log(`${ym}: no shortlist page yet`);
    continue;
  }
  if (!res.ok) throw new Error(`${url} gave ${res.status}`);
  const picks = parseShortlist(await res.text(), ym);
  if (!picks.length) throw new Error(`${url} loaded but no nominee could be read; has the page changed?`);

  const season = seasonOf(`${ym}-01`);
  const fixtures = await leagueFixtures(season);
  const found: [string, Goal][] = [];
  for (const p of picks) {
    const hit = await officialGoal(p, fixtures, season);
    if (hit) found.push(hit);
  }
  if (found.length < 6) {
    console.log(`${ym}: only ${found.length} of ${picks.length} nominees matched; no pack yet`);
    continue;
  }

  for (const [slug, g] of found) goals[slug] ??= g;
  writePack({
    id: `gotm-${ym}`,
    kind: 'month',
    title: `${monthName(ym)}'s Goal of the Month`,
    subtitle: `Premier League ${seasonLabel(season)} · ${found.length} goals`,
    season: seasonTag(season),
    published: today,
    goals: found.map(([slug]) => slug),
  });
  made++;

  const ours = new Set(readPacks().filter((p) => p.kind === 'round').flatMap((p) => p.goals));
  const check: Check[] = existsSync(CHECK) ? (JSON.parse(readFileSync(CHECK, 'utf8')) as Check[]) : [];
  const row = { month: ym, nominees: picks.length, matched: found.length, inOurPicks: found.filter(([s]) => ours.has(s)).length };
  writeFileSync(CHECK, `${JSON.stringify([...check.filter((c) => c.month !== ym), row], null, 2)}\n`);
  console.log(`gotm-${ym}: ${found.map(([, g]) => g.scorer).join(', ')}; ${row.inOurPicks} of them were in our round packs`);
}

if (made) writeGoals(goals);
console.log(`${made} Goal of the Month packs written`);
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Real run**

Run: `npx tsx scripts/build-pin-gotm.ts` (timeout 600000 ms).

Expected on 2026-10-09 or soon after: it tries 2026-09 and 2026-08. For
September: all 8 nominees matched (Harvey Barnes, Bryan Mbeumo, Ainsley
Maitland-Niles, Bruno Guimaraes, Lewis Dunk, Nicolas Jackson, Emiliano
Buendia, Jay Dasilva) and a count of how many were in our round packs. For
August: a pack if its page has a shortlist, else `no shortlist page yet`.
Ends `1 Goal of the Month packs written` or `2 …`. **Paste the output.**

If the real run is on a later date, other months may be due; that is fine.

- [ ] **Step 4: Check what it wrote**

```bash
cat games/pin/data/packs/gotm-2026-09.json games/pin/data/check.json
npm test
npx tsx scripts/build-pin-gotm.ts
```

Expected: the pack has `"kind": "month"`, title `"September's Goal of the Month"`,
8 goals; `check.json` has a row for `2026-09`; tests pass; the second run
writes nothing (`0 Goal of the Month packs written`, no network calls for
months whose pack exists).

- [ ] **Step 5: Run the combined update once**

Run: `npm run pin:update`
Expected: both scripts run, both write nothing, exit code 0.

- [ ] **Step 6: Commit**

```bash
git status --short
git add scripts/build-pin-gotm.ts games/pin/data
git commit -m "feat(pin): Goal of the Month packs from the official shortlist" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 10: The archive import, then a real run

**Files:**
- Create: `scripts/import-pin-archive.ts`

- [ ] **Step 1: Write the script**

Create `scripts/import-pin-archive.ts`:

```ts
/**
 * Pitch pin's archive, run once by hand: every Goal of the Month winner from
 * 2016/17 to last season, from the English Wikipedia (CC BY-SA 4.0),
 * matched to Understat. Writes one pack per season and one per club with six
 * or more winners (its nine most recent). Packs that exist are left alone,
 * so re-running is safe. This season's winners reach the library as month
 * packs instead.
 *
 *   npm run pin:archive
 */
import { normalise } from '../games/pin/lib/match';
import { seasonLabel, seasonOf, seasonTag, utcToday } from '../games/pin/lib/dates';
import { parseWinners, type Winner } from '../games/pin/lib/wiki';
import type { Goal, Pack } from '../games/pin/lib/types';
import { packExists, readGoals, writeGoals, writePack } from './pin-files';
import { leagueFixtures, type Fixture, officialGoal } from './understat';

const API = 'https://en.wikipedia.org/w/api.php?action=parse&page=Premier_League_Goal_of_the_Month&prop=wikitext&format=json&formatversion=2';

const res = await fetch(API, { headers: { 'User-Agent': 'pitch-pin-archive/1.0 (one-off import)' }, signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`Wikipedia gave ${res.status}`);
const wikitext = ((await res.json()) as { parse?: { wikitext?: string } }).parse?.wikitext;
if (!wikitext) throw new Error('Wikipedia returned no wikitext; has the API changed?');

const today = utcToday();
const winners = parseWinners(wikitext).filter((w) => w.season < seasonOf(today));
if (winners.length < 80) throw new Error(`Only ${winners.length} past winners read; has the article changed?`);

const goals = readGoals();
const leagues = new Map<number, Fixture[]>();
const found = new Map<string, Goal>();
const matched: { w: Winner; slug: string }[] = [];
for (const w of winners) {
  if (!leagues.has(w.season)) leagues.set(w.season, await leagueFixtures(w.season));
  const hit = await officialGoal(w, leagues.get(w.season)!, w.season);
  if (!hit) continue;
  found.set(hit[0], hit[1]);
  matched.push({ w, slug: hit[0] });
  console.log(`${w.date} ${w.player}`);
}
console.log(`${matched.length} of ${winners.length} winners matched`);

let made = 0;
// Only goals that land in a pack are kept (the content test forbids strays).
const write = (p: Pack) => {
  if (packExists(p.id)) return;
  for (const s of p.goals) goals[s] ??= found.get(s)!;
  writePack(p);
  made++;
  console.log(`${p.id}: ${p.goals.length} goals`);
};

for (const season of [...new Set(matched.map((m) => m.w.season))].sort()) {
  const ms = matched.filter((m) => m.w.season === season).sort((a, b) => a.w.date.localeCompare(b.w.date));
  if (ms.length < 6) continue;
  write({
    id: `gotm-winners-${seasonTag(season)}`,
    kind: 'season',
    title: `Goal of the Month winners ${seasonLabel(season)}`,
    subtitle: `Premier League · ${ms.length} goals`,
    season: seasonTag(season),
    published: today,
    goals: ms.map((m) => m.slug),
  });
}

for (const team of [...new Set(matched.map((m) => m.w.team))].sort()) {
  const all = matched.filter((m) => m.w.team === team);
  if (all.length < 6) continue;
  const ms = [...all].sort((a, b) => b.w.date.localeCompare(a.w.date)).slice(0, 9).reverse();
  write({
    id: `club-${normalise(team).replace(/ /g, '-')}`,
    kind: 'club',
    title: team,
    subtitle: `Goal of the Month winners · ${ms.length} goals`,
    published: today,
    goals: ms.map((m) => m.slug),
  });
}

writeGoals(goals);
console.log(`${made} archive packs written`);
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Real run**

Run: `npm run pin:archive` (about 100 Understat calls; timeout 600000 ms. If
it times out, run it again: packs and goals already written are kept, but
re-matching repeats the calls, so prefer running it in the background with
`run_in_background` and waiting for it).

Expected: `89 of 89 winners matched` (if a winner is unmatched the log line
says why; a few is acceptable, report them), then 10 season packs
(`gotm-winners-2016-17` … `gotm-winners-2025-26`) and 7 club packs
(`club-brighton-hove-albion`, `club-chelsea`, `club-fulham`,
`club-liverpool`, `club-manchester-united`, `club-newcastle-united`,
`club-tottenham-hotspur`), `17 archive packs written`. **Paste the summary
lines.**

- [ ] **Step 4: Check what it wrote**

```bash
cat games/pin/data/packs/club-manchester-united.json games/pin/data/packs/gotm-winners-2022-23.json
npm test
```

Expected: Manchester United has 9 goals (its 9 most recent of 10);
2022/23 has 8; tests pass (archive packs are not fairness-checked, but must
hold 6–9 goals).

- [ ] **Step 5: Commit**

```bash
git status --short
git add scripts/import-pin-archive.ts games/pin/data
git commit -m "feat(pin): archive packs of past Goal of the Month winners" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 11: The daily GitHub Action

**Files:**
- Create: `.github/workflows/pin-packs.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/pin-packs.yml`:

```yaml
# Pitch pin's packs, kept fresh with no one in the loop. Daily at 06:00 UTC:
# make any round or Goal of the Month pack that is due, test, and commit what
# was written to the default branch. Scheduled runs only fire from the
# default branch, so this is off until the branch is merged and a remote
# exists. See docs/superpowers/specs/2026-10-09-pitch-pin-library-design.md.
name: Pitch pin packs

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: pin-packs
  cancel-in-progress: false

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run pin:update
      - run: npm test
      - name: Commit new packs
        run: |
          if [ -z "$(git status --porcelain games/pin/data)" ]; then
            echo "No new packs."
            exit 0
          fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add games/pin/data
          git commit -m "chore(pin): new packs"
          git push
```

- [ ] **Step 2: Check it parses**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/pin-packs.yml','utf8');if(/\t/.test(y))throw new Error('tab in YAML');console.log('no tabs, '+y.split('\n').length+' lines')"`
then, if Python has PyYAML (`python -c "import yaml"` succeeds):
`python -c "import yaml;d=yaml.safe_load(open('.github/workflows/pin-packs.yml'));print(sorted(d['jobs']['update'].keys()))"`
Expected: `['runs-on', 'steps', 'timeout-minutes']`. If PyYAML is missing,
say so in your reply: the YAML is then only checked by its first real run.

The workflow itself cannot run until there is a GitHub remote; that is
expected (spec section 3). Its one command, `npm run pin:update`, was run for
real in Task 9.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pin-packs.yml
git commit -m "ci(pin): daily run that adds new packs" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 12: Home card and credits

(This replaces Task 13 of the old plan.)

**Files:**
- Modify: `components/Home.tsx` (the `also` section, after the Slugger card), `app/globals.css` (after `.also__card--slugger .also__go`), `app/credits/page.tsx`

- [ ] **Step 1: Add the home card**

In `components/Home.tsx`, after the Slugger
`<a className="also__card also__card--slugger" …>…</a>` element, add:

```tsx
          <a className="also__card also__card--pin" href="/pin">
            <span className="also__band display">Pitch pin</span>
            <span className="also__copy">
              <b>Where was it struck from?</b> Famous goals in packs: each week’s best, the Goal of the Month shortlist, and the classics. A bullseye is within two metres.
            </span>
            <span className="also__go">Take aim →</span>
          </a>
```

In `app/globals.css`, after `.also__card--slugger .also__go { color: #1F6F43; }`:

```css
.also__card--pin .also__band { background: var(--red); }
.also__card--pin .also__go { color: var(--red); }
```

- [ ] **Step 2: Credit the data**

In `app/credits/page.tsx`, change "Chain, Rondo and Slugger are an unofficial
fan project." to "Chain, Rondo, Slugger and Pitch pin are an unofficial fan
project." Then, after the Data section's existing paragraph (the one ending
`CC BY-SA 4.0</a>.` and `</p>`), add:

```tsx
          <p>
            Shot locations and expected goals in Pitch pin come from{' '}
            <a href="https://github.com/statsbomb/open-data">StatsBomb open data</a> for the classics and from{' '}
            <a href="https://understat.com/">Understat</a> for Premier League goals. The Goal of the Month
            shortlists are the <a href="https://www.premierleague.com/">Premier League</a>’s; past winners are
            from the <a href="https://en.wikipedia.org/wiki/Premier_League_Goal_of_the_Month">English Wikipedia</a>{' '}
            (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>). Only the goals in a pack are used.
          </p>
```

- [ ] **Step 3: Ask Jonno about the StatsBomb logo**

StatsBomb's agreement (1.4) requires their logo on publications. Ask Jonno:
"OK to download the StatsBomb logo from their media pack
(statsbomb.com/media-pack) into `public/credits/statsbomb.svg` for the Pitch
pin footer and /credits?" If yes, download it, then add
`<img src="/credits/statsbomb.svg" alt="StatsBomb" height={16} />` before the
text in `.pin__credit` (PitchPin and Library) and in the credits paragraph.
If not yet, leave the text credit and note it in HANDOFF under the launch
checklist (Task 14).

- [ ] **Step 4: Typecheck and test**

Run: `npm run typecheck && npm test`
Expected: clean; all pass.

- [ ] **Step 5: Commit**

```bash
git add components/Home.tsx app/globals.css app/credits/page.tsx
git commit -m "feat(pin): home card and data credits" -m "Co-Authored-By: <your attribution line>"
```

---

### Task 13: Browser check at phone width

No code unless something is broken; a fix goes back through the task it
belongs to, with a test where it can have one.

- [ ] **Step 1: Start the dev server**

Use the preview tool with the launch config `recall-xi` (it is in
`.claude/launch.json`; autoPort). Do not start it with Bash.

- [ ] **Step 2: The library**

Set the viewport to the mobile preset (375 × 812) and open `/pin`.
Check with `read_page` / `get_page_text`:
- shelves "This season" (round packs and the September GotM, newest first)
  then "Archive" (season packs newest first, club packs A to Z, the seven
  classic packs);
- packs published in the last 7 days show **New** (on 2026-10-09 that is
  only the September Goal of the Month pack, made that day; the round packs
  are dated the Tuesday after their week); nothing in the Archive does;
- every card says "Not played";
- no horizontal scroll: `document.documentElement.scrollWidth <= 375` via
  `javascript_tool`;
- no console errors (`read_console_messages`).

- [ ] **Step 3: Play a pack to full time**

Open the first card. Throw every goal (tap the pitch, Throw, Next goal).
At full time check: the total and par, every pin on the pitch, the list,
Share, and **Next pack** pointing at a different pack. Go back to `/pin`:
that card now shows the score against par ("41.2 m, 12 under" style).
Open another pack, throw one goal, go back: its card says "1 of N".

- [ ] **Step 4: Points mode and 404s**

Open `/pin?score=points`: a finished card shows `points / max`. Open
`/pin/nope` and `/pin/2026-10-08`: both 404.

- [ ] **Step 5: No answers in the page**

Fetch the HTML of `/pin` and of one pack page (`javascript_tool`:
`await fetch(location.href).then(r=>r.text())`) and confirm neither contains
`"at"` or `"xg"`.

- [ ] **Step 6: Proof**

Take one screenshot of the library and one of full time at phone width and
show them in your reply. Reset the viewport to desktop afterwards.

---

### Task 14: Docs and handoff

**Files:**
- Modify: `HANDOFF.md`, `docs/superpowers/specs/2026-10-08-pitch-pin-design.md`, `docs/superpowers/plans/2026-10-08-pitch-pin.md`

- [ ] **Step 1: Mark the old spec and plan**

At the top of `docs/superpowers/specs/2026-10-08-pitch-pin-design.md`, under
the title, add:

```markdown
> **Superseded in part (2026-10-09)** by
> `docs/superpowers/specs/2026-10-09-pitch-pin-library-design.md`: no daily,
> no streak; a library of packs. The game itself, scoring, par and licences
> below still hold.
```

At the top of `docs/superpowers/plans/2026-10-08-pitch-pin.md`, under the
title, add:

```markdown
> **Status (2026-10-09):** Tasks 1–12 built. Tasks 13–15 were folded into
> `docs/superpowers/plans/2026-10-09-pitch-pin-library.md` (Tasks 12–14
> there) after the pivot to a pack library.
```

- [ ] **Step 2: Rewrite HANDOFF's Pitch pin section**

In `HANDOFF.md`, replace the whole `## In flight: Pitch pin …` section (up to
but not including `## What this is`) with a section that covers, in the
file's existing style (short paragraphs and bullets):
- what Pitch pin is now: a library of packs at `/pin`, packs at
  `/pin/<id>`, kinds round / month / season / club / classic, New for 7 days,
  status per browser, Next pack; both scoring modes (`?score=points`);
- the data: `games/pin/data/goals.json` (server-only, the answers) and
  `games/pin/data/packs/*.json`; `check.json` (the monthly model check: how
  many GotM nominees our round packs had picked; quote September 2026's row);
- the scripts and when they run: `npm run pin:update` (round then GotM;
  daily via `.github/workflows/pin-packs.yml` once on the default branch
  with a remote), `npm run pin:archive` (one-off, done), `npm run pin:classics`
  (after editing `classics.source.json`);
- launch checklist: create the private GitHub remote (ask Jonno before every
  push), merge to the default branch (`master`), watch the first
  `workflow_dispatch` run; email StatsBomb and Understat and register with
  StatsBomb (licence gate unchanged); the StatsBomb logo (if not done in
  Task 12); choose one scoring mode;
- what the browser check could not cover (from Task 13), and the real-run
  numbers from Tasks 8–10 (packs written, nominees and winners matched);
- the gotchas kept from the old section (Understat endpoints and header,
  slow responses, flipped Y, own goals; StatsBomb minute from 0), plus: the
  premierleague.com page may block GitHub's runners (unknown until the first
  live run; a red run will say so).

Also update the `npm test` count under "Run it" to the number `npm test`
prints now.

- [ ] **Step 3: Check and commit**

Run: `npm run typecheck && npm test`
Expected: clean; all pass.

```bash
git add HANDOFF.md docs/superpowers/specs/2026-10-08-pitch-pin-design.md docs/superpowers/plans/2026-10-08-pitch-pin.md
git commit -m "docs(pin): handoff for the pack library" -m "Co-Authored-By: <your attribution line>"
```

- [ ] **Step 4: Stage gate**

Tell Jonno: what was built, the real-run numbers, anything skipped or
unverified (say it plainly), and that the next step is his: the GitHub
remote and the licence emails. Suggest `/clear`. Do not push.
