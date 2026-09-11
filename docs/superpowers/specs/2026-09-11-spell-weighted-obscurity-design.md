# Spell-weighted obscurity

**Date:** 2026-09-11
**Status:** approved

## Problem

Obscurity ranks a pick by the player's fame within the slot's field. The club
that carried the link is never consulted. Harry Kane (fame 96) placed beside
Harry Maguire through Leicester City scores near the bottom of any field, even
though Kane's 13 league appearances at Leicester are a fact most fans do not
hold. The game is meant to reward knowing that fact.

## Measured

Probe against the live Wikidata endpoint, 2026-09-11, 300 random pool players
plus Kane: 1,958 club spells, **80% carry `P1350` (matches played)**, 87% carry
start and end dates, 26 of 301 players have no count on any spell. Kane's
spells come back as Leyton Orient 18, Millwall 22, Leicester 13, Norwich 3,
Tottenham 317, Bayern 94.

## Decision

Rank the **fact**, not the player. A link is as well known as "X played for C",
and that is approximately `fame(X) × weight(X's spell at C)`. Every member of a
slot's field is measured the same way against the same neighbours, so the
score is still a rank within the field, still 0–100, still "kth most obscure
of N". Only the unit changes: from name-recognition to route-knowledge.

Both ends of a link count. A route is as obvious as its easiest shared club,
and a club is as obvious as its less obvious end. Kane-at-Leicester is obscure
whether Kane is the given or the pick, so the board scores the same whichever
way round it is set.

### Rejected

- **Blend** a separate route-obscurity into the existing score. The blend
  weight is arbitrary and a famous player with a tiny spell only ever gets
  half-credit.
- **Discount only the pick's own spell.** Placing Maguire beside a given Kane
  would earn nothing for going through Leicester, because the obscure fact sat
  on the given's side.

## Design

### 1. Data — `scripts/fetch-apps.ts`

Same pattern as `fetch-sport-nation.ts`: batches of 400 ids from
`data/raw/_ids.json`, one query per batch pulling `P1350` plus `P580`/`P582`
for every spell whose club is not a national team (the `Q6979593` exclusion
from `careersQuery`). Written to `data/raw/_apps.json`:

```
playerId → clubId → [apps | null, years | null]
```

Multiple spells at one club (loan then permanent, re-signing) are summed for
both apps and years. Years is `end - start` in calendar years, minimum 1 when
both dates exist; null when either is missing.

`build-pool.ts` merges the file into each `Player` as a new optional field:

```ts
/** Per club: [league appearances, years at the club]. Null where Wikidata is silent. */
spells?: Readonly<Record<string, readonly [number | null, number | null]>>;
```

Optional so fixtures and tests that build a `Player` by hand are unaffected.
Adds roughly 1 MB to `data/pool.json` (server-side read only). A side file,
not a career refetch.

### 2. Spell weight — `src/lib/fame/spell.ts`

`spellWeight(apps: number | null, years: number | null): number`, in
`[0.05, 1]`:

- apps known → `clamp(apps / 50, 0.05, 1)`. Fifty league appearances is about
  two seasons as a regular; past that the stint is common knowledge.
  Kane: Leicester 13 → 0.26, Norwich 3 → 0.06, Tottenham → 1.
- apps null, years known → estimate `years × 25` apps, same clamp.
- both null → **1**. Missing data never grants a discount, so uncovered
  spells cannot be gamed and any error is in the harsh direction.

The three constants (`SATURATION_APPS = 50`, `APPS_PER_YEAR = 25`,
`FLOOR = 0.05`) sit together at the top of the file with this reasoning.
They are the tuning surface.

### 3. Fact-fame — same file

```ts
interface Side { player: Player; club?: string }   // neighbour, and the prescribed club if any
factFame(p: Player, sides: readonly Side[], mode: ChainMode): number
```

Per side:

- prescribed club `C` → `min(w(p, C), w(n, C))`.
- otherwise, clubs shared by `p` and `n` → `max over C of min(w(p, C), w(n, C))`.
- no shared club (a chemistry-mode nation-plus-league link) → 1.

`w(x, C)` is `spellWeight` over `x.spells?.[C]`, and 1 when `spells` is
absent or lacks `C`.

`factFame = fame(p) × min over sides`. A pick with two links is as obscure as
its harder side. No sides → `fame(p)`.

### 4. Wiring

- `slotObscurityScore(chosen, field, valueOf = fame)` — gains an optional
  value function. The XI board keeps the default. `chainSlotDepths` passes
  fact-fame computed against the same neighbours `chainFieldFor` used, for
  both `score` and `rank`. `chainObscurity`, `boardObscurityScore` untouched.
- `result.ts`: `best` and the pinboard's deepest-first order use fact-fame
  against the **given** neighbours (the same rule `carriedAt` follows: a wrong
  pick does not get to decide what the right answer is measured against).
  `MIN_BEST_FAME` stays on raw fame — it keeps Wikidata errors off the wall,
  which is a name-level problem. `PinnedAnswer.score` and `SlotOutcome.best.score`
  use the same fact-fame ranking so the wall and the pick agree.
- `entry` stays on raw fame. Regrading difficulty on fact-fame would move the
  shipped labels; that is a separate decision (see follow-ups).
- No UI change. Rank and field size already display; the club on the diagonal
  already names the route.

### 5. Tests

- `tests/fame/spell.test.ts`: `spellWeight` each branch and both clamps;
  `factFame` — min over sides, max over shared clubs, prescribed club
  overrides sharing, nation-league link is 1, missing `spells` is 1.
- `tests/chain/`: a Kane / Maguire / Leicester fixture — a 13-app route
  outranks a 300-app route at equal fame, and the score is identical with
  either end as the given.
- Existing `obscurity`, `score` and `result` tests adjusted only where the
  signature changed.
- Real-boundary check: rebuild the pool, run `check-chain` over the shipped
  boards, and read the rank shifts by hand before committing the data.

## Follow-ups (not in scope)

- Show the carrying club's appearance count on the reveal card.
- Decide whether `entry` grading should move to fact-fame, and regrade.
- Appearance counts for current players go stale (Kane's Bayern 94 is a season
  behind). A refetch cadence, if the pool ever gets one, covers it.
