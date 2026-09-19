# Chain — state of play

**Updated:** 2026-09-19. Read this first in a new session; it is the shortest
path back to full context. The design is in
`docs/superpowers/specs/2026-09-19-sticker-album-identity-design.md`.

## What this is

A daily football recall puzzle, drawn as a sticker album. Famous players are
on the page; the gaps between them are grey silhouettes; a link between two
stickers is a club both played for. You name the missing players, seal the
page once, and the chain holds or it doesn't. **One question, one answer.**
There is no score. There used to be one (how obscure your answers were, on
a 0–100 scale, later as Banker / Good shout / Deep cut tiers) and it made a
correct chain feel like a loss; it is gone from the game, and only its
engine remains, unused, in `src/lib/chain/result.ts`.

Two kinds of board, same rules:

- **The daily** — a ring of three or four givens with a clue on every empty
  plate ("a German", "an Argentine"), built so each plate has exactly one
  answer a fan can reach. Day 1 is 2026-09-19; each day takes the next board
  from a fixed shuffle of the clued boards, so everyone gets the same one.
  The streak counts consecutive dailies held.
- **The ladder** — 006 easy, 007 medium, 008 hard, and 009 the ring. No
  clues, and no single right answer: anyone who links will do. Harder means
  fewer people who do.

**Recall XI** (`/recall-xi`), the original 4-3-3 board, is parked: still in
the repo on its own dark theme, not developed.

## Run it

```bash
npm run dev          # localhost:3000
npm test             # 995 tests, 29 files
npm run typecheck
```

`/` is the album's front page. `/play/NNN` is a board; `/?c=NNN` redirects
to it. A board id is a file path and is validated against `/^\d{3}$/`.

## Where things are

| Path | What |
|---|---|
| `app/page.tsx`, `components/Home.tsx` | The front door: today's board drawn as a preview, the streak, how it works, the ladder, past dailies. |
| `app/play/[id]/page.tsx`, `components/PlayClient.tsx` | A board, with a memory: works out from the player's clock whether this is the daily, writes the play on seal. |
| `components/Chain.tsx` | The board itself. Fetches the album, runs the reducer, seals via `/api/seal`, drives the reveal. |
| `components/ChainBoard.tsx` | Draws the live and the sealed board — one component, so they cannot drift. `RINGS` places the slots of a closed board. |
| `components/Sticker.tsx` | `Sticker` (draggable) wraps `StickerFace` (pure): the photo on its two-half ground, the plate, the number. `EmptySticker` is the silhouette. |
| `components/BoardPreview.tsx` | A board as a picture, for the home page; carries the result on its links once played. |
| `components/Reveal.tsx` | The reveal clock, the verdict, the plate tags, the wall ("the ones we had in mind"), the share button. |
| `components/SearchSheet.tsx` | The search: a bottom sheet on a phone, a panel on a desk. |
| `app/api/names/route.ts` | The searchable album: names, aliases and picture keys for the whole pool, ~880 KB, cached a day. |
| `app/api/seal/route.ts` | Judges a fill server-side and returns the result plus the handful of full records the reveal draws. |
| `src/server/board.ts` | Reads the pool once and keeps it; `loadBoard` strips the reference solution; `listBoards` builds the home page's summaries. Warmed by `instrumentation.ts`. |
| `src/lib/chain/` | The rules. `score.ts` (links, fields, neighbours on a line or a ring), `result.ts` (everything true at the seal), `client.ts` (what crosses the wire), `share.ts` (the share line). |
| `src/lib/daily.ts`, `src/lib/progress.ts` | Day numbers from the epoch, the fixed shuffle, plays and the streak in `localStorage` (`chain.progress.v1`). |
| `src/lib/club-colours.ts` | Hand-checked club colours, and the club a given wears (`signatureClub`: most league appearances, with a few overrides). |
| `src/lib/short-name.ts` | Nameplates. A stopgap for missing aliases. |
| `src/lib/chain/demonyms.ts` | Nation QID → "a German", for the generator. |
| `scripts/build-completion.ts` | The daily generator. `npm run build:completion -- --count 60 --write`. |
| `content/chains/` | 006–009 the ladder; 010–071 the clued boards the daily draws from. |
| `data/pool.json` | 11,741 players. Committed snapshot. |
| `data/portraits.json` | Resolved portraits for everyone a shipped board can show. |
| `app/globals.css` | The whole album stylesheet. Light tokens at `:root`; the XI board's dark tokens scoped under `.xi`. |

## Rules that must not be broken

1. **The pool is searched, never listed.** No suggestions, no recent searches,
   no default results. `search()` returns `[]` for an empty query,
   permanently. `npx tsx scripts/leak-check.ts <file.html>` scans a static
   page for pool names that are not already on the board.
2. **The board reveals nothing until the seal.** No link verdicts, no fields,
   no answers. A board that lights up as you go has no bet on it. A placed
   sticker wears the **neutral grey ground** until the seal; the two halves
   develop to club colours (or red) as each link is judged. Givens wear
   their signature club from the start, which leaks nothing.
3. **The reference solution never reaches the browser.** On a chain a blank
   has exactly two neighbours, so one leaked id is the whole puzzle.
   `loadBoard` strips it; the seal route judges on the server.
4. **Sealing a wrong chain must be possible.** Every slot filled is the whole
   requirement; whether the links hold is what you find out.
5. **No dark mode as the default.** The page is cream, the stickers white,
   the one loud thing is the red band.
6. **Never invent a Wikidata QID.** Every identifier here was resolved
   against the live endpoint.
7. **Never make a terminal-style design.**

## The board

A chain is `content/chains/NNN.json`: `slots` (ids and nulls), `mode`
(`clubs`: a link is a shared club), optional `prescribedLinks` (the link
must be *that* club — harder than the rule, not a hint), optional `closed`
(the last slot links back to the first, drawn round a grid), optional
`clues` keyed by slot, `difficulty` on the ladder, and a `referenceSolution`.

**Clued boards.** A clue is part of the rule: `clueMet()` filters the field
and a plate is not held unless the pick answers it. Nationality only, and
only the nations in `DEMONYM` — a niche nationality collapses the shelf to
one name. `tests/content/chains.test.ts` holds every clued board to the
promise the daily makes: each plate's reference answer tops its clued field
by fact-fame at 50 or above, and the runner-up is under 35; a plate with no
clue is allowed only where at most five answers are in reach.

**The ladder.** Graded by ENTRY: over every legal pair, the fame of the less
famous of the two — is there an obvious way in? The test fails if a harder
board is more findable than an easier one. 006 Messi–Courtois via Everton
(entry 90, 254 pairs), 007 Iniesta–Lloris via Beşiktaş (65), 008
Griezmann–Pogba via Schalke (60: Rakitić and Höwedes, or Embolo). 008 was
Werder Bremen (entry 45) and nobody got it; the pair count is not the
difficulty, the famous pair is.

**The reveal**, on the board, in place: links judged one after another at
350 ms, each pick's ground developing from that link's corner, a shake
where a link broke; the verdict inside four seconds; then the tags under
the plates and the wall with one sticker per plate — the most findable
member of its field, "You found it" or "Yours held too". Reduced motion
lands on the finished board at once. See `useReveal` in `Reveal.tsx`.

**The generator** (`scripts/build-completion.ts`): famous givens (sitelink
fame ≥ 70, at least two known leagues, not a manager), pairs that admit a
plate, rings of three and four that close, no given or answer used more
than three times across the set, and every board re-checked with the test's
own rule before it is kept. Seeded, so a rerun writes the same boards.

## Client and server

The page ships the puzzle and the givens (~20 KB). The album index comes
from `/api/names` once the board is up — tuples, pictures as short keys —
and the seal goes to `/api/seal`, which validates the fill (length, givens
unmoved, known ids, no duplicates), runs `chainResult`, and returns the
result, the links, and full records for the fill and the one name per plate
the board had in mind. Nothing else about the pool reaches the browser.

`src/server/board.ts` reads the 5 MB pool once and keeps the promise. A
server component that awaits the read directly ships it: React's dev stream
records awaited values as debug info and one board's HTML came to 7 MB.
`instrumentation.ts` warms the read and must keep its `if
(process.env.NEXT_RUNTIME === 'nodejs')` form, or the edge build pulls in
`node:fs`.

## Portraits

```bash
npm run fetch:portraits          # everyone a shipped board can show
npm run fetch:portraits -- --all # the whole pool; slow, 30 req/min
```

31% of the Commons photos in `data/images.json` were taken **after** the
player retired. Two sources, in order: TheSportsDB `strCutout` (square,
transparent, in-kit; free key `123` at 30 req/min; no watermark — checked),
then a Commons photo dated inside the career. A resolved "none" empties the
card rather than falling back to a pundit in a suit.

`fit` travels with the URL: a cutout is shown whole (`contain`) on the
ground, a press photo is cropped (`cover`) and gets the ground as a 7 px
frame, so the reveal changes both kinds of card.

**Licensing blocks public release.** Cutouts are usable under TheSportsDB's
terms with attribution; Commons files are per-file CC. Nothing ships without
an attribution surface. Premium ($9/mo) was declined — not needed.

## Data pipeline

Criteria-driven, not club-crawled: the pool is defined by fame floor + era +
occupation.

```bash
npm run fetch:pool      # 2-phase: ids, then careers in batches of 250
npm run build:pool      # -> data/pool.json
npm run review:names    # vandalism check
npm run fetch:badges    # crests -> public/badges (gitignored, ~95 MB)
```

Three traps that produce silently wrong data, all guarded by
`tests/pipeline/traps.test.ts`: the `mul` label migration (an `en`-only
label service drops Beckham, Mbappé, Ramos); `wdt:` truthy truncation
(always traverse `p:`/`ps:`); national teams in `P54` (exclude `Q6979593`).
Never exclude occupation `actor` — it removes Beckham. Crests come from
English Wikipedia's non-free local files, not Wikidata's `P154`.

Vandalised labels are corrected in `src/pipeline/overrides.ts` **and** in
the committed `data/pool.json` (the pool is not rebuilt for a label).
Aubameyang was "Pierre Cardin picha grande" for a week.

## Known data problems

- **Zero of 11,741 players have an alias.** Short names cannot match, so
  Ronaldinho is unfindable by that name. `short-name.ts` is the stopgap.
  **This is the highest-value pipeline fix.**
- **Wikidata has an error tail.** Rodrigo Riep is filed at Everton F.C. and
  FC Barcelona when he played for Everton de Viña del Mar and Barcelona S.C.
  The reveal names nothing under fame 30; the field still accepts him.
- **Links ignore time.** Lineker links Messi via Barcelona. Requiring overlap
  would collapse 008's field to nothing playable.
- **Fame is global sitelinks.** A given can qualify that a British audience
  will not place (Huntelaar, Arbeloa). The generator's `KNOWN_LEAGUES` rule
  catches the worst of it; the 60 boards have not been culled by hand.
- **Club colours are a hand list** of ~100 clubs. A club not on it shows as
  ink, never a guess; `signatureClub` picks the club with the most league
  appearances, with overrides where that is not the club anyone pictures.

## Amendments to the XI spec, in order

Kept for the parked board. The submission budget is gone; hyper links score
3; out of position costs 5 chemistry, never legality; placement is
unconditional; required links no longer gate placement but `Board.required`
is not dead; nation is sporting nationality (P1532); flags are gone, nation
is not; club crests are in.

## Next up

- **Play the dailies.** Sixty boards, a fixed order. Cull the givens a
  British audience would not place and reseed. Does a plate with one
  answer feel like recall or like a lookup? Is a ring of four too long?
- **Attribution page.** Blocks public release. See Portraits.
- **Aliases.** Unblocks search and nameplates.
- **Time-limited link rule** (played together, not merely both played for)
  as an option, measured first.
- **Recorded picks** so "only 4% found Höwedes" becomes possible.

## Known rough edges

- The pane browser's `Return` key does not reach the search input's Enter
  handler; a synthetic keydown does and a real keyboard does. Harness, not
  the app.
- Cutouts are **current** kit, not the kit of the link: Messi on Barcelona
  claret in an Inter Miami shirt.
- The XI board has never been played.
