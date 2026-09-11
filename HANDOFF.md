# Recall XI — state of play

**Updated:** 2026-09-10. Read this first in a new session; it is the shortest
path back to full context.

## What this is

A football recall puzzle. **Chemistry is the gate; obscurity is the score.**
Anyone can solve a board with Mbappé — the game is whether you reach for
someone nobody else would. The social point is proving that to your friends.

There are two modes. **Chain is the main product** and lives at the root
route. **Recall XI — the original XI board — is parked**: still in the repo,
still runnable, but no longer developed and deliberately kept separate (own
route, own branding). We may come back to it.

- **Chain** (`/?c=NNN`) — a line of players. Both ends are given and share
  nothing; you fill the middle so every link holds. This is the mode with
  grading, portraits, the lock-in reveal and the scouting-sheet design.
- **Recall XI** (`/recall-xi`) — parked. The original 4-3-3, three players
  given, fill eight. Still on the dark treatment and still unplayed by anyone.

## Run it

```bash
npm run dev        # localhost:3000
npm test           # 301 tests, 23 files
npm run typecheck
```

Boards worth opening: `/?c=006` (easy), `?c=007` (medium), `?c=008` (hard).
`?c=` is validated against `/^\d{3}$/` — it reads a file path.

## Where things are

| Path | What |
|---|---|
| `docs/superpowers/specs/2026-09-03-recall-xi-design.md` | The design spec. Authoritative for the XI board, with amendments below. |
| `docs/superpowers/plans/coverage-findings.md` | Measured Wikidata findings + the go/no-go gate result. |
| `src/lib/chemistry/` | Link table and scoring. Pure, no deps. The heart. |
| `src/lib/chain/` | Chain rules, scoring, and everything that becomes true at lock-in (`result.ts`). |
| `src/lib/puzzle/` | Formation, board schema, placement, solution enumeration. |
| `src/lib/portraits.ts` | Which picture a player gets, and when he gets none. |
| `src/lib/club-colours.ts` | Hand-checked club colours + the diagonal split. |
| `src/lib/short-name.ts` | Nameplates. A stopgap for missing aliases — see below. |
| `src/game/` | Reducers + derived views. No React in a reducer. |
| `components/` | Next.js UI. `ChainRow.tsx` draws the chain for BOTH the live board and the sealed sheet; `Chain.tsx` and `LockIn.tsx` are the two frames around it. `swing.ts`, `Pin.tsx`, `RedString.tsx` are the physical bits. |
| `content/chains/` | Eight chains. 006–008 are the graded set. |
| `design/` | `.dc.html` artboards + `canvas.json` for the design canvas. |
| `data/pool.json` | 11,741 players. Committed snapshot. |
| `data/portraits.json` | 269 resolved portraits for everyone a shipped board can show. |

## Rules that must not be broken

1. **The pool is searched, never listed.** No suggestions, no recent searches,
   no default results. A mockup once shipped three suggested names under an
   open slot; all three were valid answers and the first was the deep cut.
   `search()` returns `[]` for an empty query, permanently.
   `npx tsx scripts/leak-check.ts <mockup.html>` scans a static mockup for pool
   names that are not already on the board.
2. **Fame is hidden until a player is placed.** Since experimentation is free,
   this is the only thing keeping obscurity scoring meaningful.
3. **The board reveals nothing until lock-in.** No link colours, no score, no
   field sizes. A board that lights up as you go has no bet on it — you shuffle
   names until it turns green and the lock-in is a formality. This extends to
   the card art: a player you placed wears a **neutral ring** until you seal,
   because the ring shows the clubs that made a link and two colours would mean
   "both links hold". Givens wear their signature club from the start, which
   leaks nothing.
4. **Locking in a wrong chain must be possible.** Every slot filled is the
   whole requirement; whether the links hold is what you find out.
5. **Never invent a Wikidata QID.** Every identifier here was resolved against
   the live endpoint. A position map written from memory had seven of ten wrong
   — "defender" pointed at a beetle — and silently dropped 42% of the pool.
6. **Never make a terminal-style design.** Standing instruction.

## Chain mode

A chain is `content/chains/NNN.json`: `slots` (ids and nulls), optional
`mode` (`clubs` counts only a shared club), optional `prescribedLinks`, and a
`referenceSolution` that is **stripped before the puzzle reaches the browser**
— on a chain a blank has exactly two neighbours, so one leaked id is the whole
puzzle.

**The pair layout is the good one.** `G ? ? G` with the joining club named on
the board:

```
Griezmann — ? — [SV Werder Bremen] — ? — Pogba
```

Two adjacent blanks with no further constraint do **not** work, and that is
measured rather than assumed: across 2,642 pairs of famous ends in club mode,
2,551 admit more than 600 valid pairs and not one lands in a playable range.
The club graph is too dense for adjacency to constrain anything. Naming the
club collapses it — 2,563 of the same pairs then have at least one club with a
sane answer count, median 211 clubs to choose from. See
`scripts/measure-layouts.ts`. A named club is a **harder** rule than the mode's,
not a hint: sharing some other club no longer satisfies it.

### Grading

```bash
npm run build:graded          # dry run, prints the three boards
npm run build:graded -- --write
```

Difficulty is measured, not labelled. **ENTRY** = over every legal pair, the
fame of the *less famous* of the two. It answers the only question that decides
difficulty: is there an obvious way in?

Taking each blank's most famous answer independently is the obvious version and
it is **wrong** — the two slots need two different players, and the boards that
measure easiest are exactly the ones where one player tops both blanks and can
fill only one. That version graded boards whose "easiest pair" was Eto'o and
Eto'o.

|  | Board | Field | Entry |
|---|---|---|---|
| 006 easy | Messi / Courtois via Everton | 16×16, 254 pairs | 90 |
| 007 medium | Iniesta / Lloris via Beşiktaş | 8×8, 62 pairs | 65 |
| 008 hard | Griezmann / Pogba via Werder Bremen | 8×8, 63 pairs | 45 |

`tests/content/chains.test.ts` re-measures ENTRY from the shipped JSON using the
game's own `chainFieldFor` and fails if a harder board is more findable than an
easier one.

**The named club is restricted to eleven leagues the audience knows.** Fame is
a sitelink count across *all* Wikipedias, and the J-League is the single largest
bloc in the top 120 clubs by squad size, at 23 of them — its players score well
on ja.wikipedia while being unknown here. Unrestricted, the generator graded a
board through FC Tokyo as MEDIUM. The evenness tiebreak made it worse, not
better: a league drawing on one Wikipedia has beautifully uniform fame, so it is
exactly what evenness goes looking for.

## Portraits

```bash
npm run fetch:portraits          # everyone a shipped board can show
npm run fetch:portraits -- --all # the whole pool; slow, 30 req/min
```

31% of the Commons photos in `data/images.json` were taken **after** the player
retired, so the card showed a pundit in a suit. Two sources, in order:

1. **TheSportsDB `strCutout`** — square, transparent, in-kit. Free key `123` at
   30 req/min. No watermark (checked by downloading them; the claim that they
   carry one is wrong). `strThumb` is deliberately **not** used — it is an
   ordinary press photo with the same era problem, and Mark Robins' is captioned
   "Coventry City's manager" in its own EXIF.
2. **A Commons photo dated inside the career**, using the P580/P582 qualifiers
   that survive in `data/raw` even though `pool.json` drops them.

Result over 269 players: **68% cutout, 23% in-era Commons, 9% nothing usable.**
That last 9% matters — a resolved "none" **empties the card** rather than
falling back to a retirement-era photo. An empty plate is the honest answer.

`fit` travels with the URL: a cutout is shown whole (`contain`), a press photo
is cropped and anchored high (`cover`). Backwards, it beheads every cutout or
letterboxes every photo.

**Licensing blocks public release.** Cutouts carry no `strCreativeCommons` flag,
so they are usable under TheSportsDB's terms with attribution rather than
freely; Commons files are per-file CC. Nothing ships without an attribution
surface. Premium ($9/mo) was considered and declined — not needed for images.

## The scouting sheet

The chain route's design: a cork pinboard with the sheet pinned to it at the
corners, Alfa Slab masthead with print misregistration, grade as a rubber stamp,
players as mounted prints ringed with their clubs. Cutouts stand on a painted
studio muslin, feet on the frame's bottom edge; press photos fill their own
frame. The board and the muslin are one-off Higgsfield renders in
`public/board/` (illustrated, not photographed — the page's language is flat,
and a photographed wall made everything drawn on it look like a sticker). See
`docs/superpowers/specs/2026-09-11-pinboard-design.md`, which also parks the
follow-on: props at the board's edges. The lock-in is a sealed sheet — links resolve
left to right, the score lands in gold foil, then the pinboard shows the answers
you missed with the diagonal naming the two clubs that made each fit.

Scoped to a `.sheet` class in `app/globals.css`, **not** `:root`, so the XI
board keeps the dark treatment. The theme re-points the same tokens the
components already used, so most of the conversion was wrapping the route.

```bash
npm run build:sheets   # regenerates design/*.dc.html + design/sheets/ from content + data
```

Canvas: https://claude.ai/code/artifact/23a64e56-dc0f-4bd1-8433-697f937e67d7

The seeded canvas payloads are gitignored — ~3 MB each and almost entirely the
editor's own minified code. The source (artboards, `design/sheets/`,
`canvas.json`) is committed.

### The board is the artboard now

`design/Chain007.dc.html` is the reference and the live route follows it: the
masthead is printed ON the paper rather than in a bar above it, the chain sits
in mounted prints with a stable per-slot lean, and a band across the bottom of
the sheet carries a statement on the left and a block on the right.

That band is the one place the live sheet and the sealed sheet deliberately
differ. The artboard prints how many ways the board could have gone — which is
a fact about the ANSWER, and quoting field sizes to somebody still searching is
the same leak as lighting the links green. So the live band keeps the geometry
and changes the payload: the brief on the left, `n/m` filled on the right, and
that right block turns from ink to gold foil when the last plate is filled.

**One component draws the chain on both screens** (`components/ChainRow.tsx`).
The reveal is meant to be the same sheet with the answers on it; two
implementations would have drifted within a week.

### The physics

Dragging is a spring, not a transition. `components/swing.ts` integrates a
damped spring per frame against a target set by pointer velocity, and writes
the transform straight to the node — sixty React renders a second for a value
nothing else reads is not worth it. The point of a spring here is the
**overshoot**: a transition eases to its target and stops dead, so the card
snaps upright the instant your hand does.

`stepSwing` and `tiltTarget` are exported as pure functions and tested in
`tests/ui/swing.test.ts`. That is not gold-plating: **requestAnimationFrame
does not run in a hidden tab**, so the behaviour is unobservable in an
automated browser and the numeric test is the only check there is.

Dropping onto a plate hands over to the plate: the card lands with an
overshoot, then a beat later a pin drives through it. Three notes worth
keeping:

- An empty plate has **no** pin. The pin arriving is the reward for the drop.
- `mount-land` must end on `rotate(var(--tilt))`, not `transform: none` —
  fill-mode holds the last frame, so ending square left the card bolt upright
  until the class came off, then it snapped back.
- `tiltFor` hashes the lean out of the slot index. `Math.random()` would
  re-roll every card on every keystroke in the search box.

**`.mount`, `.photo`, `.lifted` are unscoped in `globals.css`, not
`.sheet .mount` etc.** They were originally `.sheet`-scoped like everything
else on this route, which broke the one thing that matters most: dnd-kit's
`DragOverlay` portals the dragged clone straight to `document.body`, outside
the `.sheet` ancestor, so a `.sheet`-scoped rule silently stops applying the
moment a card is picked up. The photo's only sizing rule (`.photo > img
{ width: 100%; height: 100% }`) was one of them — losing it meant the
dragged image rendered at its native pixel size instead of the frame's,
which read as the card "going massive" on pickup. Fixed by unscoping the
four classes; safe because nothing outside chain mode uses them.

### The red string

`components/RedString.tsx`. Twine between the pins on the sealed sheet, drawn
one span at a time left to right. It sags, it is drawn rather than faded in,
and a link that did not hold **snaps**: the string goes on taut, holds a beat,
then parts in the middle and both ends drop.

Anchors are measured from the mounts at layout time and tied to the pin's head
via `pinHead()` in `Pin.tsx`, not to the card's top edge — the row is flexible
and the cards are rotated, so a hard-coded pitch is wrong at every width but
one. When the string is running, the connector rules are hidden
(`stringed`): two lines joining the same two cards is one too many.

### What the sealed sheet states

`chainResult` measures three things the reveal prints, rather than reading them
off a label:

- **`pairs`** — how many ways the board could have been filled. A product minus
  the overlap between the two fields, because the same player cannot fill both
  blanks. Two-blank boards only; three blanks is not a product of two fields.
- **`entry`** — the grade, re-measured. Found by sorting both fields rather
  than looping over every pair, so it does not block the main thread mid-reveal.
- **`pinboard`** — up to five answers that would have worked: anyone who fits
  *either* gap first, then the deepest from each side alternately.

`tests/content/chains.test.ts` checks the two shortcuts against the slow
obvious versions and against the figures in the table above (006 → 254 ways,
entry 90). A shortcut that is wrong is worse than no number, because the sheet
states it as fact.

**`caption`** is a new optional field on a chain: one hand-written line about
why the board is the shape it is, printed beside the pair count. The generator
carries an existing caption forward only if the rerun landed on the same
givens and the same club — a stale observation is worse than none.

**Careful with superlatives on this screen.** `best` applies a fame floor of 30
and the depth gauge ranks against the untouched field, so they legitimately
disagree: on 008 the reveal said "nobody went deeper" directly beside "4th most
obscure of 8". Both true of different sets, and unreadable together. The
breakdown now states what happened and leaves ranking to the gauge.

## Data pipeline

Criteria-driven, not club-crawled: the pool is defined by fame floor + era +
occupation. Club-anchoring only reaches players who touched an anchor club,
which biases every other club toward elite movers.

```bash
npm run fetch:pool      # 2-phase: ids, then careers in batches of 250
npm run build:pool      # -> data/pool.json
npm run review:names    # vandalism check
npm run fetch:badges    # crests -> public/badges (gitignored, ~95 MB)
```

Three traps that produce silently wrong data, all guarded by
`tests/pipeline/traps.test.ts`:

1. **The `mul` label migration.** Names moved to a shared multilingual label; an
   `en`-only label service returns a bare QID and drops Beckham, Mbappé, Ramos.
2. **`wdt:` truthy truncation.** `wdt:P54` returns best-rank only, cutting
   Mbappé from 7 clubs to 1. Always traverse `p:`/`ps:`.
3. **National teams are in `P54`.** Left in, every Moroccan international
   "shares a club" with every other. A positive filter on `Q476028` does *not*
   work — Wikidata classifies the Morocco senior team as a football club.
   Exclude `Q6979593`.

Also: **never exclude occupation `actor`** — it removes Beckham. Club crests
come from **English Wikipedia's non-free local files**, not Wikidata: `P154`
covers 4.9% of football clubs (2,020 of 41,413) and none of the big five, even
at deprecated rank.

## Known data problems

- **Zero of 11,741 players have an alias.** Short names can never match, so
  Ronaldinho is unfindable by that name and nameplates read "CUNHA" for Diego
  Ribas da Cunha. `src/lib/short-name.ts` is a hardcoded stopgap that should
  shrink to nothing once aliases land. **This is the highest-value pipeline fix.**
- **Ronaldinho and Pelé are absent from the pool.** Zidane, Iniesta and Xavi are
  present — an earlier note claiming otherwise was wrong.
- **Wikidata has a genuine error tail.** Rodrigo Riep, fame 22, a Chilean
  journeyman, is filed at Everton F.C. and FC Barcelona when he played for
  Everton de Viña del Mar and Barcelona S.C. Verified upstream against the live
  API, so not ours to fix. Both the generator's reference solution and the
  runtime reveal apply a **fame floor of 30** to the answer they *name* — the
  field is untouched and still accepts him. Undated spells are **not** the
  signal: only 2.9% of spells lack dates and five of six suspected phantoms were
  dated.
- **Careful with "that transfer is wrong".** Several spells that read as errors
  were real 2026 transfers — Woltemade to Juventus, Gordon to Barcelona. The
  data is current; a reviewer's memory may not be.
- **Links ignore time.** `linked()` is club membership only, so Gary Lineker
  links Messi via Barcelona though they never overlapped. Roughly half the valid
  answers on the shipped boards never shared a dressing room (13 of 16 on 008).
  The UI text is honest — "every link a shared club" — but this is an open
  design question. Requiring overlap is **not** free: it would collapse 008's
  field from 8×8 to 2×1, which the layout measurement says is unplayable.
- **Fame is not football-specific.** Boyko Borissov, the Bulgarian PM, scores 74.

## Amendments to the spec, in order

- **§4.2 — the submission budget is gone.** Experimentation is free; there is
  one scored submission.
- **§5.1 — hyper links score 3, not 2.** Corrected against FIFA's table.
- **§5.3 — out of position costs 5 chemistry, never legality.**
- **Placement is unconditional.** A missing link is not illegal, it scores less.
- **Required links no longer gate placement** (XI mode). `Board.required` is
  NOT dead — the shipped boards still carry it (003 is 14 green, 1 hyper, 1
  orange) and `isValidPlacement` still reads it. What changed is that placement
  always succeeds: the check is consulted only to tell the player what a pick is
  costing them. An earlier version of this file called the field dead, which is
  wrong and sends you looking for code to delete. Chain mode reintroduced
  prescribed links deliberately, and for a measured reason.
- **Nation is sporting nationality (P1532), not citizenship (P27).** P27
  collapses the home nations into "United Kingdom".
- **Flags are gone, nation is not.** `player.nation` is still on every player
  and still load-bearing: `linkColour` scores same-league-plus-same-nation as
  green and same-club-plus-same-nation as hyper, so chemistry mode reads it on
  every link. What went is the whole apparatus for *drawing* it — the
  `flag-icons` dependency, `data/nations.json`, `src/pipeline/nations.ts`
  (`isoForNation` was its only export), `scripts/fetch-nations.ts` and the
  `nations` prop that was threaded through nine components to reach two 18×13
  rectangles. Nothing else used the QID→ISO map, so it went with them.
- **Club crests are in.** Previously "deliberately absent — trademarks". Jonno's
  call: they are all over football games online.

## Next up, roughly in order

- **Play it properly.** Chain 006–008 are the first boards worth putting in
  front of someone. The four questions the prototype exists to answer are still
  open: does it feel like deduction or guessing? Faced with a wide-open slot,
  does a fan reach for a deep cut or the first name they think of? Does the
  bench-and-drag loop feel like play or admin? Does obscurity feel earned?
- **Aliases.** See above. Unblocks search, nameplates and any external lookup.
- **Daily cadence, streaks, persistence.** None exist. This is the main
  retention gap against Tiki Taka Toe / Football 501 and friends.
- **Real rarity scoring.** Record picks so "only 4% found Mark Robins" becomes
  possible. Fame-based obscurity is a cold-start proxy for Immaculate Grid's
  model, not the destination.
- **Attribution page.** Blocks public release. See Portraits.
- **SBC-style constraints** — "min 3 leagues", "max 2 from one club".
  Discussed, never designed.
- **XI boards still ship `referenceSolution` in the client bundle.** A standing
  leak; chain mode does not repeat it.

## Known rough edges

- The XI board is still on the dark theme and has never been played.
- `scripts/check-board.ts` measures "how many players are *legal* here", which
  is now everyone. It should measure how many achieve a green link.
- Cutouts are **current** kit, not the kit of the link: Messi is ringed
  Barcelona claret in an Inter Miami shirt.
- An in-era Commons photo is not necessarily in-kit — Wicky is a distant wide
  shot.
- Synthetic clicks on the empty-slot button are flaky against dnd-kit's pointer
  handling; a real `element.click()` fires reliably. Probably a harness
  artefact, not proven.
