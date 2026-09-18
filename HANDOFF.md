# Recall XI — state of play

**Updated:** 2026-09-11. Read this first in a new session; it is the shortest
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
npm test           # 311 tests, 24 files
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
| `components/` | Next.js UI. `ChainRow.tsx` draws the chain for BOTH the live board and the sealed sheet; `Chain.tsx` and `LockIn.tsx` are the two frames around it. `swing.ts`, `Pin.tsx`, `Stamp.tsx` are the physical bits. |
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

### The ring (board 009)

`closed: true` on a chain adds one more link, from the last slot back to the
first, and the board is drawn round the edges of a square: givens in the
corners, blanks between them, two links each. `/?c=009` is Isak, Drogba,
Raya and Benzema, fields 84 · 59 · 18 · 60 in that order round (the other two
orderings are wider). No named clubs.

It is Chain with the ends tied, **not** a single-answer board, and that was
measured before it was built: over 9,981 pairs of famous givens sharing
nothing, none had a lone bridge and 94% had more than twenty. Every layout
that gets to one answer either gives a blank three or four givens (hub,
cross, the 3×3 with a centre card) or names both clubs on every edge —
see `scripts/measure-layouts.ts` and the shape-study artboard.

Everything that read "left is i-1, right is i+1" now goes through
`neighboursOf()` in `src/lib/chain/score.ts`, so a ring cannot be a line in
one file and a loop in another. `ChainRow` switches to a 5×5 grid for a
closed eight (`RING` gives each slot its cell); the connectors on the sides
stand up. Two things the ring changed on the sealed sheet:

- **The columns cannot hang under the edge cards** — the top one would run
  into the middle and the sides into the bottom corners — so they line up
  in a row below the square, labelled by plate.
- **Each column is headed by the pick's name.** "Plate 4" alone sent the
  eye back up to the square to count.

`pairs` and `entry` stay null on a ring — four independent fields are not a
product of two — so the foil band does not print, and the grade test skips
it because it is not a two-blank board.

### Completion boards (010, 011)

A board with `scoring: "completion"` asks one question — did the chain hold
— and ranks nothing. No columns, no rarity foil, no wall of deeper answers.
The sealed sheet says CHAIN HELD or CHAIN BROKE (or NOT SOLVED, when every
link held but a plate was answered by someone it did not ask for), counts
plates held, and pins up "the ones we had in mind": one print per plate,
the most findable member of its field, tagged "You found it" or "Yours held
too" if the player's own pick held.

What makes such a board possible is a **clue on each empty plate** —
`ChainPuzzle.clues`, keyed by slot: the nationality or the position of
whoever belongs there, or (already) a club badge on one of its links. The
clue is part of the rule, not a hint: `clueMet()` in `score.ts` filters the
field, and `chainResult` will not count a slot as held, or the board as
perfect, unless the pick answers it. The label is hand-written ("an
Argentine", "a goalkeeper") because the pool has nation QIDs and nothing to
print them as. The caption under the plate carries it — "Yours" on a plain
blank, the clue on a clued one, and after the seal the verdict on it: green
if met, red "not a German" if not.

Which clue, after playing them: **nationality first, nearly always.** A
nation clue still tests the thing the game is about — which clubs these
two played for — it just tells you which shelf to look on. A position
clue ("a goalkeeper") felt limiting and slightly annoying; a club badge
on a link tells you the answer's club and skips the recall. Both stay
in the engine, neither should be the default. A plate with **no clue at
all** is the nicest kind, and is allowed wherever the field is naturally
narrow — at most `OPEN` (5) answers in reach — which the content test
enforces; 010's Henry–Totti plate is one (five fit, Szczęsny first).

Measured before it was built (scratchpad `realistic.ts`, `layouts2.ts`),
using the fact-fame ruler as a cut-off rather than a rank — 50 and up is a
fact a fan holds, under 35 nobody reaches for: two givens alone leave 84%
of famous pairs with six or more answers in reach; one clue on the plate
leaves 38,811 of the same 229,950 pair-and-clue boards with exactly one
answer in reach and nothing else above the floor. Nationality supplies
most of them (2,693 of 3,779 medium blanks), then position (465), a club
badge (267), a league (354 — not built; "never played in X" reads as the
setter hiding something). The eleven big footballing nations only: a niche
nationality collapses the list to one name and there is no puzzle left.

The tests in `tests/content/chains.test.ts` hold every completion board
to that promise: each blank carries a clue or a badge, its reference
answer is the top of its clued field by fact-fame, sits at 50 or above,
and the runner-up is under 35. A board that fails that is a scored board
with the score hidden.

010 is the ring: Owen · Henry · Totti · Lampard, plates an Argentine
(Mascherano), nothing (Szczęsny), a German (Rüdiger), a Dutchman
(Robben). 011 is the triangle: Messi · Sneijder · Reus, plates a
Portuguese (Figo), a Croatian (Perišić), a Dane (Christensen). A ring of SIX is drawn as a 3×2 loop — top corner in the middle
of the top row, the others at the ends of the bottom — because every link
then runs along a row or down a column and the connectors already do
both; `RINGS` in `ChainRow.tsx` keys the cell layout by length. A true
triangle needs diagonal connectors, which do not exist yet.

Things to know before shipping more of these: fame is global sitelinks,
so a given can qualify that a British audience will not place; a phantom
Wikidata stint is now a PUZZLE bug rather than a scoring quirk, because it
can create a second answer in reach; and the recency rule counts this
season's loans as fully known, which is right today and ages.

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

### The title card

The masthead and the brief are no longer printed on the sheet. On a ring
the sheet is a square, and with the paperwork above and below it the
masthead went under the top of the window and the SEAL button under the
bottom — the chain could not be sealed at all on a 1250px screen. So the
sheet holds the chain and nothing else, and the name, number, grade, the
assignment and the button are a second card pinned up on its left. The
shortlist strip is shorter, and its prints are the same size as the sheet's:
a smaller card on the shortlist turned into something else when it landed.

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

### The lock-in sequence

Spec: `docs/superpowers/specs/2026-09-11-lock-in-reveal-design.md`. Mockup
with all three states replayable: `design/reveal-variants.html` (serve it —
`design-static` in `.claude/launch.json` — the crests are relative paths).

`LockIn.tsx` owns one timeline, one set of timers. Per link, left to right
(`LINK_BEAT` 640ms): the club that made the link is **stamped** on the
connector (`Stamp.tsx`), the paper takes a 1px jolt, and the dotted rule
takes the die's colour — green dotted for a link that held, red dashed
with a NO LINK die for one that did not. Then, only if every link held,
**the current**: a bead of light runs each link in turn (`FLOW_MS` 230ms a
link, `flow-x` / `flow-y` in `globals.css`), passing under the die and
lighting each card as it arrives, round the whole ring; then the chain
**locks** — rules go solid and glow, dies and cards take one pulse — and
CHAIN HELD comes down on a board that has just proved itself. A chain
that broke skips straight to the verdict. Then the foil count-up and the
columns on a scored board, or plates-held and the answers on a completion
one.

The red string that used to run pin to pin is gone (`RedString.tsx`,
deleted 2026-09-18). Four strands of twine drawn in SVG never stopped
reading as a computer drawing of twine, and its slack/taut/snapped
choreography was a second, noisier account of what the dies already said.
The current is the opposite bet: the rules that were always there simply
change colour, and the one flourish is saved for the moment the whole
chain holds. The bead rides the rule's own line (47px down on a lying
link, the centre on a standing one) and each link's bead runs in the
direction the chain reads — `reverse` on a ring's bottom row and left
side, worked out from the `RINGS` cell layout in `ChainRow.tsx`.

Things that were found out the hard way:

- **The jolt is 1.2px, no rotation, and the columns do not jolt.** Four
  hits in as many seconds was already a lot; the first pass had eight.
- **The jolt is a Web Animation, not a class.** The paper carries its
  rise-in as an inline `animation`, and a class animation loses to inline.
- **A connector the stamp has not reached looks exactly as it did before
  lock-in** (`stamped === false` in `ChainRow`). The sheet is sealed but the
  player has not been told yet; a crest already sitting there is the leak.
- The stamp's ink texture is an SVG `feTurbulence` displacement — `useInk()`
  in `Stamp.tsx`, one filter id per caller.
- **The club's name on the die sits below the centre, where the ring is
  narrower than the die is wide.** Given a diameter's width and an
  ellipsis, REAL MADRID arrived as REAL MADR. It gets a chord (66% of the
  die) and two lines.
- **The bead has to be bright.** The first one was a pale 30px pill and
  read as a smudge; it is 52px with a white core and a 14px glow now.

### The column

`DepthColumn.tsx` replaced the depth gauge, which was a 4px track with a 3px
marker on which 6th of 16 and 14th of 16 were indistinguishable. The
reference is the Pointless tower: the number starts at the field size and
counts **down** at a constant tick to the pick's rank, the fill draining with
it, and stops dead. Lower is deeper; rank 1 floods the tower gold. The tick
is `clamp(1500 / ticks, 46, 170)` ms — constant so the stop cannot be timed,
clamped so 16 is readable and 254 is a blur that ends. `columnSchedule()` is
pure and is how `LockIn` knows when the next column may start.

The **floor** under each column is the deepest answer for that slot as a
face, a name and a score. It replaced `Breakdown` — two grey boxes of prose
restating what was already on the cards. It is the player's own face when
their rank is 1 or their pick is `best` (`columnSpecFor`); see the
superlatives note below for why those two can disagree.

The live board, once the sealed sheet is put away, shows the columns
`instant` — landed, not counting down a second time. The obscurity chip on
the nameplate is gone from both: "worth 64" under the column is that number.

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
and the column ranks against the untouched field, so they legitimately
disagree: on 008 an earlier reveal said "nobody went deeper" directly beside
"4th most obscure of 8". Both true of different sets, and unreadable together.
The column now says NOBODY DEEPER only at rank 1, and at rank 1 the floor is
the player's own pick whatever `best` says — the field the column just
counted is the one the claim is about.

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
