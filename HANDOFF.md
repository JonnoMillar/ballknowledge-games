# Chain — state of play

**Updated:** 2026-09-20. Read this first in a new session; it is the shortest
path back to full context. The design is in
`docs/superpowers/specs/2026-09-19-sticker-album-identity-design.md`.

## Games

One site; `/` is the hub (`components/Hub.tsx`), a card per game read from
`src/games.ts`: add a game there and it appears. Each game is a route. A game's own state of play is in its
`HANDOFF.md`; this file covers the site and Chain. Branch and layout rules
are in `CLAUDE.md`.

| Game | Route | Code | State |
|---|---|---|---|
| Chain | `/chain`, `/play/NNN` | `src/lib/chain`, `components/` | Live. This file. |
| Deep Cuts | `/deep`, `/collection` | `src/lib/chain`, `components/` | Live. This file. |
| Rondo | `/rondo` | `games/rondo` | This file, `games/rondo/DESIGN.md`. |
| Slugger | `/slugger` | `src/lib/slugger`, `components/slugger` | This file. |
| Recall XI | `/recall-xi` | root | Parked. |
| Pitch pin | `/pin` | `games/pin` | Merged to `main` 2026-10-12. `games/pin/HANDOFF.md`. |
| Spoofed | `/spoofed` | `games/itk` (internal id `itk`) | Live (daily from 2026-10-14). `games/itk/HANDOFF.md`. |

## What this is

A daily football recall puzzle, drawn as a sticker album. Famous players are
on the page; the gaps between them are grey silhouettes; a link between two
stickers is a club both played for. You name the missing players, seal the
page once, and the chain holds or it doesn't. **One question, one answer.**
The daily has no score. There used to be one (how obscure your answers were,
on a 0–100 scale, later as Banker / Good shout / Deep cut tiers) and it made
a correct chain feel like a loss. Obscurity lives on only in **Deep Cuts**
(below), a separate mode where digging is the point and the reward is a card,
not a number.

Two kinds of board, same rules:

- **The daily** — a ring of three or four givens with a clue on every empty
  plate ("a German", "an Argentine"), built so each plate has exactly one
  answer a fan can reach. Day 1 is 2026-09-19; each day takes the next board
  from a fixed shuffle of the clued boards, so everyone gets the same one.
  The streak counts consecutive dailies held.
- **The ladder** — 006 easy, 007 medium, 008 hard, and 009 the ring (hard,
  four clued plates with several answers each). No single right answer:
  anyone who fits will do. Harder means fewer people who do.

A clue is a **restriction, not a hint**: a plate that asks for a German is
not held by a Frenchman who links both sides. The hint is separate and
optional — "Show clubs" under a GIVEN fetches the badges of the clubs that
given played for (`/api/hint`; the reference solution is never read), and
the plates either side of it are marked yellow in the share line and the
album (`PlateMark`: held / hinted / missed). The streak does not care; the
share line does. An earlier version showed the answer's clubs, which gave
the answer away.

**Recall XI** (`/recall-xi`), the original 4-3-3 board, is parked: still in
the repo on its own dark theme, not developed.

## Run it

```bash
npm run dev          # localhost:3000
npm test             # 1,363 tests, 35 files
npm run typecheck
```

`/` is the hub. `/chain` is the album's front page. `/play/NNN` is a board;
`/?c=NNN` still redirects to it (old links). A board id is a file path and is validated against `/^\d{3}$/`.

## Where things are

| Path | What |
|---|---|
| `app/chain/page.tsx`, `components/Home.tsx` | The front door: today's board drawn as a preview, the streak, how it works, the ladder, past dailies. |
| `app/play/[id]/page.tsx`, `components/PlayClient.tsx` | A board, with a memory: works out from the player's clock whether this is the daily, writes the play on seal. |
| `components/Chain.tsx` | The board itself. Fetches the album, runs the reducer, seals via `/api/seal`, drives the reveal. |
| `components/ChainBoard.tsx` | Draws the live and the sealed board — one component, so they cannot drift. `RINGS` places the slots of a closed board. |
| `components/Sticker.tsx` | `Sticker` (draggable) wraps `StickerFace` (pure): the photo on its two-half ground, the plate, the number. `EmptySticker` is the silhouette. |
| `components/BoardPreview.tsx` | A board as a picture, for the home page; carries the result on its links once played. |
| `components/Reveal.tsx` | The reveal clock, the verdict, the plate tags, the wall ("the ones we had in mind"), the share button. |
| `components/SearchSheet.tsx` | The search: a bottom sheet on a phone, a panel on a desk. |
| `app/api/names/route.ts` | The searchable album: names, aliases and picture keys for the whole pool, ~880 KB, cached a day. |
| `app/api/seal/route.ts` | Judges a fill server-side and returns the result plus the handful of full records the reveal draws. |
| `app/api/hint/route.ts` | The clubs one given played for, as badges. |
| `src/server/board.ts` | Reads the pool once and keeps it; `loadBoard` strips the reference solution; `listBoards` builds the home page's summaries. Warmed by `instrumentation.ts`. |
| `src/lib/chain/` | The rules. `score.ts` (links, fields, neighbours on a line or a ring), `result.ts` (everything true at the seal), `client.ts` (what crosses the wire), `share.ts` (plate marks and the share line). |
| `src/lib/daily.ts`, `src/lib/progress.ts` | Day numbers from the epoch, the fixed shuffle, plays and the streak in `localStorage` (`chain.progress.v1`). |
| `src/lib/club-colours.ts` | Hand-checked club colours, and the club a given wears (`signatureClub`: most league appearances, with a few overrides). |
| `src/lib/short-name.ts` | Nameplates. A stopgap for missing aliases. |
| `src/lib/chain/demonyms.ts` | Nation QID → "a German", for the generator. |
| `scripts/build-completion.ts` | The daily generator. `npm run build:completion -- --count 60 --write`. |
| `content/chains/` | 006–009 the ladder (they carry a `difficulty`); 010–071 the boards the daily draws from (they do not). |
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

**Clues.** A clue is part of the rule: `clueMet()` filters the field and a
plate is not held unless the pick answers it. Nationality only, and only
the nations in `DEMONYM` — a niche nationality collapses the shelf to one
name. `tests/content/chains.test.ts` holds every daily board (no
`difficulty`) to the promise the daily makes: each plate's reference answer tops its clued field
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
800 ms — slow enough to watch — each pick's ground developing from that
link's corner behind an ink seam, a shake where a link broke; then the
verdict; then the tags under
the plates and the wall with one sticker per plate — the most findable
member of its field, "You found it" or "Yours held too". Reduced motion
lands on the finished board at once. See `useReveal` in `Reveal.tsx`.

**The generator** (`scripts/build-completion.ts`): famous givens (sitelink
fame ≥ 70, at least two known leagues, not a manager), pairs that admit a
plate, rings of three and four that close, no given or answer used more
than three times across the set, and every board re-checked with the test's
own rule before it is kept. Seeded, so a rerun writes the same boards.

## Deep Cuts (`/deep`, `/collection`)

Added 2026-09-27. Thirty boards, ids 101–130, the shape of chain 006
(G ? =named club= ? G) with `deep: true`: never a daily, never on the ladder.
Built by `npx tsx scripts/build-deep-cuts.ts --write`: famous ends (fame 70+),
a big club in a followed league, 25+ answers a side with 12+ checkable ones,
and ENTRY 60+ so there is always a famous way in.

Every pick that holds is graded at the seal (`src/lib/chain/grade.ts`), on
the fact-fame ruler within the plate's own field: the share of the other
answers better known than the pick. Common < 10% (bronze), Uncommon < 25%
(silver), Rare < 45% (gold), Niche < 70% (sapphire), Gem (diamond). **Grail**
(onyx and gold) is the plate's deepest checkable answer (`best` in
`result.ts`, fame 30+) or anything deeper, on a field of 8+. The page takes
its weakest plate's grade. The player is never shown "Nth of M"; that was
the thing that made the old score feel like a loss.

Cards go to `localStorage` (`chain.collection.v1`, `src/lib/collection.ts`),
one per player at their best grade. **Only the first seal of a board
collects**: a replay comes after the wall has shown the Grail. The grades
key (`components/GradesKey.tsx`) is in every masthead via `MastNav`.

The sapphire, diamond and onyx textures in `public/grades/` were generated
with Higgsfield (credited on `/credits`); bronze, silver and gold are CSS.
The design went through three rounds of mockups. Rejected along the way:
outer glows, sparkles, a shine that crosses the player's photo, a shine
that never rests, and drawn facet patterns (they looked cheap next to the
photographic textures).

A Deep Cuts pick's photo is whatever `data/images.json` has for that player,
not an in-era portrait: `fetch:portraits` resolves only the players a shipped
board names (givens and reference answers), and has not been rerun for
101–130. Many cards will show a later photo, or the silhouette.

## Rondo (`/rondo`)

The second game, added 2026-09-20: a passing duel for the pub, one phone as
the referee. Someone is on the ball; pass to anyone who shared a club with
them; every club a pass goes through is burnt for the rest of that ball;
lose it (no open link, a repeat, a pass nobody could take on, the clock,
or "I've got nothing") and you take a bib; three bibs and you are out.
Everything of its own lives in `games/rondo/`; only the Next.js route files
sit under `app/`. Two to four players, pass the phone. Design and rules:
`games/rondo/DESIGN.md`.

| Path | What |
|---|---|
| `games/rondo/lib/rules.ts` | `judgePass`: the rule, pure. The dead-end check is the bust. |
| `games/rondo/lib/match.ts` | The match reducer: bibs, turn order, the loser kicks off. |
| `games/rondo/server.ts` | Club index over the pool, the deal (288 starters at fame ≥ 60), the judged pass. |
| `app/rondo/page.tsx`, `app/api/rondo/{deal,pass}/route.ts` | The routes: thin, they import from `games/rondo/`. |
| `games/rondo/components/` | Setup, Scoreboard, BallView, PassBox, LossCard, and `Rondo.tsx` holding the match (`localStorage` key `rondo.match.v1`). |
| `games/rondo/rondo.css` | Its stylesheet. The bib orange is its one loud colour. |

The same rules as Chain apply: the pool is searched, never listed; the
carrier's open clubs are never shown while the ball is live (only on the
loss card). Portraits exist only for players on shipped Chain boards, so
most Rondo stickers are the silhouette on the club ground.

## Slugger (`/slugger`)

The third game, added 2026-09-20: football played as baseball, for the pub,
one phone as the umpire. The pitcher throws a club; the batter names
someone who played for it — one swing, a hit or an out. **A hit is worth
what the pitch was worth**: fastball single, curveball double, slider
triple, knuckleball home run. Runners move up; anyone on second or third
comes home on any hit. Three batters a half, three innings, the home side
skips its last half if ahead, walk-offs, extras. A name already hit is a
foul (swing again). Knuckleballs are three a side per game. Design, the
pitcher's decision, and what the first draft got wrong:
`docs/superpowers/specs/2026-09-20-slugger-design.md`.

The first draft graded hits by obscurity, gave batters three strikes and
halves three outs; it was invisible to the batter, the big club was never
worth throwing, and it ran twenty minutes. The current shape is the answer
to those three complaints; the tiers and the knuckleball budget are the
numbers to move first after a real game.

| Path | What |
|---|---|
| `src/lib/slugger/grade.ts` | Kind → bases; `stintFame`, the ruler the deck is tiered with. |
| `src/lib/slugger/deck.ts` | Four piles, by hand (~200 clubs a British pub rates); held to the pool by `tests/slugger/deck.test.ts`. |
| `src/lib/slugger/match.ts` | The match reducer: lineups, three-up halves, bases, runs, innings, the knuckleball budget, the end. Pure, tested. |
| `src/server/slugger.ts` | Club index over the pool, the deal, the judged swing (hit or miss; no grading). |
| `app/api/slugger/{pitch,swing}/route.ts` | The two routes. |
| `components/slugger/` | Setup, LineScore, Diamond, Hand, AtBat, CallCard (auto-advances), FullTime, and `Slugger.tsx` holding the match (`localStorage` key `slugger.match.v2`). |
| `app/slugger/slugger.css` | Its stylesheet. Outfield green, infield dirt, stitch red. |

**Dev gotcha, 2026-09-20:** two `next dev` servers in this folder share
`.next/` and clobber each other's route manifests — the symptom is
intermittent HTML 404s from `/api/slugger/*`. One dev server at a time.

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

**Cutouts are development-only.** They carry no `strCreativeCommons` flag,
and TheSportsDB's terms (checked 2026-09-25) say such artwork "must not be
used ... publicly, including ... websites ... screenshots". `portraitUrls`
shows them only under `next dev`; a production build shows each cutout's
`alt`, an in-era Commons photo (304 of 318 have one, the rest show the
silhouette). `npm run fetch:portraits -- --alts [--recheck]` fills `alt`; `--recheck` redoes every Commons pick.
Never take a README or social screenshot from `next dev`.

**Credits.** Every page's footer links `/credits`: data sources, crests, and
each public Commons photo with author and licence, from `data/credits.json`
(`npm run fetch:credits`; rerun after any portrait change). Crests from
English Wikipedia are non-free files and trademarks; they are shown as-is
for identification, which is a risk the project has accepted, not cleared.

`fit` travels with the URL: a cutout is shown whole (`contain`) on the
ground, a press photo is cropped (`cover`) and gets the ground as a 7 px
frame, so the reveal changes both kinds of card.

Premium ($9/mo) was declined. It would not help: a paid key does not clear
third-party artwork either.

## Data pipeline

Criteria-driven, not club-crawled: the pool is defined by fame floor + era +
occupation.

```bash
npm run fetch:pool      # 2-phase: ids, then careers in batches of 250
npm run build:pool      # -> data/pool.json
npm run review:names    # vandalism check, by heuristic
npm run review:labels   # vandalism check, against live Wikipedia titles (~12 min)
npm run fetch:badges    # crests -> public/badges (gitignored, ~95 MB)
npm run fetch:careers   # en-wiki infobox careers -> data/careers.json (~15 min)
npm run merge:careers   # dry run: what the merge adds, which dailies break
npm run merge:careers -- --write   # union into pool.json + clubs.json
```

**Careers come from two sources.** Wikidata's P54 stops mid-career for a
third of the pool (Gabbiadini "at Napoli since 2015", no Southampton;
Tarkowski with no Everton). Since 2026-09-20 the English Wikipedia
infobox (`clubs1 = [[Southampton F.C.]]`, `years1`, `caps1`) is merged in
as a union: 7,057 players gained 14,795 clubs, 4,631 stale open-ended
spells were closed. Nothing Wikidata had is removed. Rebuilding the pool
means running both again — `build:pool` then `merge:careers --write` — or
the stints come back missing. Five daily boards the corrected pool broke
(a missing club made a second answer reachable) are in
`content/chains/retired/`, which nothing reads.

Three traps that produce silently wrong data, all guarded by
`tests/pipeline/traps.test.ts`: the `mul` label migration (an `en`-only
label service drops Beckham, Mbappé, Ramos); `wdt:` truthy truncation
(always traverse `p:`/`ps:`); national teams in `P54` (exclude `Q6979593`).
Never exclude occupation `actor` — it removes Beckham. Crests come from
English Wikipedia's non-free local files, not Wikidata's `P154`.

Vandalised labels are corrected in `src/pipeline/overrides.ts` **and** in
the committed `data/pool.json` (the pool is not rebuilt for a label).
Aubameyang was "Pierre Cardin picha grande" for a week. `review:names` only
sees names that look wrong; `npm run review:labels` compares every name with
the live enwiki title and `mul` label and finds the plausible ones. Its first
run (2026-09-25) found sixteen, among them Marc Bartra labelled "Ronaldo"
and "Αrda Güler" with a Greek alpha. Run both after any pool rebuild.

## Known data problems

- **Famous players are missing from the pool (found 2026-09-25).** Not an
  alias problem: Ronaldinho is not in `pool.json` at all. Two causes, both
  measured against `data/raw`:
  1. The singer/musician exclusion in `clubRosterQuery` (there for Julio
     Iglesias) drops footballers who also sing: Ronaldinho (musician),
     Cantona, Dante, Balbo (singer), and more. 30 players found in phase 1
     never reach the phase-2 batches; most for this reason. Alex Iwobi is
     among the 30 with no music occupation, so something else drops him.
  2. 102 players are dropped by `applyPoolFilters` for having no position
     class: 59 use position items `POSITION_CLASS` does not map (Q904289
     alone covers 25), 43 have no P413 at all. Mkhitaryan, Pedri
     (position Q1109563), Oblak, Bentancur, Zinchenko, Adama Traoré, Nicolas Jackson.
  Fixing either adds strong answers to existing fields, so rerun
  `merge:careers` as a dry run and expect to retire or regenerate dailies,
  as the careers merge did. Check each new position QID against the live
  endpoint before mapping it. **This is the highest-value pipeline fix.**
- **Zero of 11,741 players have an alias.** A player known by a name that is
  not part of his label cannot be found by it. `short-name.ts` is the
  stopgap for nameplates.
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
- **Aliases.** Unblocks search and nameplates.
- **Time-limited link rule** (played together, not merely both played for)
  as an option, measured first.
- **Recorded picks** so "only 4% found Höwedes" becomes possible.

## Known rough edges

- `.sticker__photo::after` uses `:has()` for the ink edge; fine in every
  current browser, absent in Firefox before 121.
- The pane browser's `Return` key does not reach the search input's Enter
  handler; a synthetic keydown does and a real keyboard does. Harness, not
  the app.
- Cutouts are **current** kit, not the kit of the link: Messi on Barcelona
  claret in an Inter Miami shirt.
- The XI board has never been played.
