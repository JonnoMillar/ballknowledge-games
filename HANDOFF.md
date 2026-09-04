# Recall XI — state of play

**Updated:** 2026-09-04. Read this first in a new session; it is the shortest
path back to full context.

## What this is

A football squad puzzle. You are given three players on a 4-3-3 and must fill
the other eight. **Chemistry is the gate — reach 100. Obscurity is the score —
the less well-known your picks, the better you did.** Filling every slot with
Mbappé is a valid solve and a terrible one.

## Run it

```bash
npm run dev        # localhost:3000, board 003
npm test           # 144 tests
npm run typecheck
```

## Where things are

| Path | What |
|---|---|
| `docs/superpowers/specs/2026-09-03-recall-xi-design.md` | The design spec. Authoritative, with amendments listed below. |
| `docs/superpowers/plans/coverage-findings.md` | Measured Wikidata findings + the go/no-go gate result. |
| `docs/superpowers/plans/2026-09-04-recall-xi-prototype.md` | The prototype plan, now executed. |
| `src/lib/chemistry/` | Link table and scoring. Pure, no deps. The heart. |
| `src/lib/puzzle/` | Formation, board schema, placement, solution enumeration. |
| `src/game/` | Reducer + derived views. No React in the reducer. |
| `components/` | Next.js UI. |
| `scripts/` | Pipeline and board authoring CLIs. |
| `data/pool.json` | 11,741 players. Committed snapshot. |

## Rules that must not be broken

1. **The pool is searched, never listed.** No suggestions, no recent searches,
   no default results, no "players you might mean". A mockup once shipped with
   three suggested names under an open slot; all three were valid answers and
   the first was the board's deep cut. `scripts/leak-check.ts` guards this —
   run it against any new component.
2. **Fame is hidden until a player is placed.** Not in search, not on a bench
   card. Since experimentation is free, this is the *only* thing keeping
   obscurity scoring meaningful.
3. **Never invent a Wikidata QID.** Every identifier in this repo was resolved
   against the live endpoint. An earlier position map written from memory had
   seven of ten QIDs wrong — "defender" pointed at a beetle — and silently
   discarded 42% of the pool.

## Amendments to the spec, in order

- **§4.2 — the submission budget is gone.** Experimentation is free; there is
  one scored submission. A drag-from-bench workspace makes a per-placement cost
  unenforceable, and it is unnecessary because fame is hidden.
- **§5.1 — hyper links score 3, not 2.** Corrected against FIFA's documented
  table. Normalisation runs against green (2), so an all-green squad reaches
  100 and hyper's third point is headroom that absorbs a weak link elsewhere.
- **§5.3 — out of position costs 5 chemistry, never legality.**
- **Placement is unconditional.** Anyone can go anywhere. A missing link is not
  illegal, it just scores less.
- **Boards prescribe no links.** `Board.required` is dead — where the links fall
  is the player's decision, and 100 chemistry is the only target. Links render
  in the colour actually achieved, or neutral while either end is empty.
- **Nation is sporting nationality (P1532), not citizenship (P27).** P27
  collapses England, Scotland, Wales and N. Ireland into "United Kingdom", which
  made English and Scottish players register a nation match.

## Data pipeline

Criteria-driven, not club-crawled: the pool is defined by fame floor + era +
occupation, so it queries those directly. Club-anchoring only reaches players
who touched an anchor club, which biases every other club toward elite movers.

```bash
npm run fetch:pool      # 2-phase: ids, then careers in batches of 250
npm run build:pool      # -> data/pool.json
npm run review:names    # vandalism check
```

Three traps that produce silently wrong data, all guarded by
`tests/pipeline/traps.test.ts`:

1. **The `mul` label migration.** Names moved to a shared multilingual label;
   an `en`-only label service returns a bare QID and drops Beckham, Mbappé,
   Ramos and Aragonés.
2. **`wdt:` truthy truncation.** `wdt:P54` returns best-rank only, cutting
   Mbappé from 7 clubs to 1. Always traverse `p:`/`ps:`.
3. **National teams are in `P54`.** Left in, every Moroccan international
   "shares a club" with every other. A positive filter on `Q476028` does *not*
   work — Wikidata classifies the Morocco senior team as a football club.
   Exclude `Q6979593`.

## Board authoring

```bash
npx tsx scripts/find-board.ts <seed> <minClubs> <minFamous> <fameAt> <maxClubs> <boardId> <minNations>
npx tsx scripts/check-board.ts content/puzzles/003.json
npx tsx scripts/verify-seeds.ts
```

**Anchors are chosen first, deliberately disjoint in club and nation, one per
third of the pitch.** Random search cannot produce a good board: a green link is
satisfied by a shared club *or* nation + league, which drags every XI toward
either a one-club side or a one-nation chain. An early board came out 8 of 11
English.

Difficulty dial is **the neighbour's career length**, not the link colour: a
green link means "shares any club", so a 12-club neighbour barely constrains
anything. Cap careers at 3–4 clubs for tight boards.

## Open questions — the reason the prototype exists

1. Does it feel like deduction, or like guessing?
2. Faced with a wide-open slot, does a fan reach for a deep cut, or take the
   first name they think of? **This is the whole game.**
3. Does the bench-and-drag loop feel like play, or like admin?
4. Does obscurity feel earned or arbitrary?

## Next up, roughly in order

- **Play it.** Nothing else is worth doing until the four questions above have
  answers.
- **SBC-style constraints** — squad requirements layered on top ("min 3
  leagues", "max 2 from one club"). Discussed, not designed.
- **Attribution page for player photos.** Commons images are CC BY / CC BY-SA
  and require credit. This blocks any public release.
- **Results screen and share.** Nothing exists yet.
- `scripts/check-board.ts` still measures "how many players are *legal* here",
  which is now everyone. It should measure how many achieve a green link.

## Known rough edges

- Drag-and-drop and Lock In are wired and typecheck but were never verified
  by anyone playing.
- Bench cards are 92px; photos may be too small to read.
- Club badges deliberately absent — crests are trademarks. Jonno's view is that
  this is over-cautious given how widely they are used; it is his call and it is
  out of scope either way.
