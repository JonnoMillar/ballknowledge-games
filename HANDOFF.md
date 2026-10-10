# Chain — state of play

**Updated:** 2026-10-10 (ITK end screen design, branch `feat/fake-transfer`). Read this
first in a new session; it is the shortest path back to full context. **If you
are here for ITK, jump to the ITK section.** The design is in
`docs/superpowers/specs/2026-09-19-sticker-album-identity-design.md`.

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

## ITK (`/itk`) — spot the fake transfer, IN DESIGN (branch `feat/fake-transfer`)

Started 2026-10-08 from `docs/game-design-playbook.md` §4. **Not yet specced.**
Jonno changed the process: build a prototype page over hand-picked example
sets, playtest, critique, repeat; only then spec → plan → generator. We are
mid-loop (v5 examples are live, awaiting his v5 playtest). No spec or plan
exists yet; do not write the generator until he signs off on the rules.

**The game.** Five careers a day. Each is a player's sticker and their clubs as
a trail of crest stickers (year, crest, short name, "Loan" tag) joined by an ink
route with arrows, snake-laid (rows reverse) so 9 stops fit a phone. One stop
is fake. Two picks per career: found first time 🟩, second 🟨, missed 🟥
(Chain's glyphs). The end screen is in active design: see "End screen" below.
Share line `ITK #n` + grid + tier, no names.
Name "ITK" is Claude's pick; Jonno said revisit later.

| Path | What |
|---|---|
| `app/itk/page.tsx`, `app/itk/itk.css` | The page and its stylesheet (album tokens; the one new mark is the red marker loop). |
| `components/itk/Itk.tsx` | Rounds, picks, status, end screen; prototype set switcher. |
| `components/itk/Trail.tsx` | Snake layout from geometry, route SVG, crest cards, the peel reveal. |
| `components/itk/Feedback.tsx` | **Prototype tooling**: per-round strip (knew him; first look 1–10 locked at reveal; how easy 1–10; fun 1–10; note). localStorage `itk.feedback.v1`, "Copy feedback" button → JSON Jonno pastes back. |
| `src/server/itk.ts`, `app/api/itk/pick/route.ts` | Loads `content/itk/examples.json`; the fake's index and the real club stay server-side until the round ends. Dev re-reads the file per request. |
| `src/lib/itk/score.ts`, `tests/itk/score.test.ts` | Round mark, `RUNGS`, `tierOf`, share line (8 tests). |
| `components/itk/Reveal.tsx` | **Prototype**: result sticker + the album/pack/peel reveal mockups; switcher lives in `Summary` in `Itk.tsx`. |
| `public/itk/ranks/*.webp` | Rank art, one per result (Higgsfield GPT Image 2.5, transparent, 480px). Not wired in yet. |
| `scripts/itk/pick-examples.mjs` | **The v5 picker** (scratch quality; the generator rewrite starts from its rules). |
| `scripts/itk/fetch-views.mjs`, `data/itk/enwiki-views*.json` | 24 months of enwiki pageviews (Oct 2023–Sep 2025) for pool players + clubs, redirects resolved. |

**Reveal.** A *swapped* fake peels off from the corner (lift, shade, pulled away
up-left) to show the real club stuck underneath; green frame, green legs, the
fake's crest small and struck through. An *inserted* fake peels off to an empty
hatched space; legs go faint and dashed. A wrong pick: grey loop + green tick.
Hover: red marker loop draws round the card. No stamps, no shakes — Jonno: "if I
see a tacky animation for right or wrong I'll be angry."

### End screen — decisions (2026-10-09/10) and why

- **Ranks (flat 2/1/0 points, 0–10):** podium **Fabrizio 10 · Agent 9 · Scout 8**
  (gold/silver/bronze, Deep Cuts metal cases), then plain bands **Pundit 5–7 ·
  Casual 2–4 · Mascot 0–1**. Jonno picked every name. He chose flat scoring over
  ramp-weighted (which gave 39 outcomes) and rejected 15 named rungs: low scores
  are all poor, so they get grouped bands. "Fabrizio" by name is his call (I
  flagged likeness/trademark risk; he accepted). Rejected: Season ticket (too
  rewarding), Flawless as top (I argued generic; 10/10 says it), Pundit-below-
  Season-ticket ordering ("misleading and subjective").
- **Titles 1–2 words, no jokes or quote lines** (they get annoying on repeat).
- **Stamp is gone** ("cheap and crappy"). **Pack and peel are out**: they unwrap a
  mystery, but you already know how you did. Direction = **album + tally**.
- **Marks (Jonno is colour-blind):** keep green/yellow/red for recognition, add a
  symbol: **solid green + white ✓, solid yellow + white ✓, solid red + white ✕**.
  He rejected numbers ("2" misreads as "got it on the second go") and double
  ticks. If the white ✓ is faint on yellow at 22px, deepen the yellow slightly;
  don't change the mark. Applies to top-bar pips, status chip, end screen.
- **Art per rank** ("white feels empty, not a reward"): six images in
  `public/itk/ranks/`, made with a game screenshot as the style reference.
  Lesson: **always pass a reference image** for colour/feel (Jonno called the
  unreferenced Recraft test "terrible planning"); Recraft V4.1 takes none. Cost
  4.25 credits total. Open: the Casual scarf is green/yellow ≈ Norwich; Jonno to
  say whether to regenerate (0.5 cr). Credit Higgsfield on `/credits` when wired.
- **Not yet answered:** pattern honours (Late show, Bottled it, Second call…).

### End screen — next build (awaiting Jonno's go)

1. Album page of six slots, each with its art faded and its point range under
   the name (`5–7`, `8`…), so a result reads as a rank.
2. Tally: the route runs through the five careers adding +2/+1/+0; a counter
   climbs to the score.
3. Your sticker lands in its slot with weight: full-colour art, name, `9/10`;
   podium in its metal case.
4. New ✓/✓/✕ marks everywhere; share line `ITK #n · Agent 9/10` + grid.
5. Delete pack/peel code and the reveal switcher; keep "End screen" jump + result
   picker until the end screen is signed off. Verify with Playwright frames
   (scratch script pattern: freeze `getAnimations()` at set times, 1100px +
   375px, check `scrollWidth`).

### Rules learned from playtests — and why (do not re-litigate)

Four playtest rounds (v1–v4; v5 not yet played). His verdicts drove each rule:

- **Fame is English Wikipedia views, not sitelinks.** Player floor 500k views/24mo.
  Sitelinks let in Doyle (26k), Mucha (14k), McCarthy, Adam: "who even is he?"
- **Every stop must be a club a British fan knows; at most one exception.**
  Known = ≥300k views AND ≥30% of its pool players also played in the PL, OR
  ≥2M views. Views alone fail: Pachuca, Vissel Kobe ≈ Blackpool.
- **No old careers.** First stop ≥2004, median stop year ≥2008, still playing
  ≥2015. Keane, Lineker, Hoddle, Speed: "history, not memory".
- **No giant fakes, no fake bigger than the career's median club.** Mata→Arsenal,
  Ramos→Milan, Pedro→PSG were instantly false: that move would have been news.
- **Never put the fake between two marquee moves** (Ronaldo, Courtois, Kroos
  rated "extremely easy").
- **Never touch a spell fans remember:** signature club, any ≥8M-view club, any
  spell of 50+ games (a draft swapped Isak's Newcastle, Bale's Spurs).
- **Mix swap and insert, unannounced.** v4 swapped only: easier, deducible, and
  short careers became guessing ("when there's so few clubs, add one sometimes").
  Short careers (≤5) get an insert 60% of the time, never always (a fixed rule
  is a tell — inserts kept landing in round 1).
- **A different kind of fake each round** (loan, mid, late, one spell of a club he
  had twice, insert). v4 repeated the early-loan swap: "predictable if you spam it".
- **Photo guard:** never swap the spell the photo was taken in (Walcott's photo
  was at Everton, the swapped-out club). Year from filename or Commons metadata.
- **Fakes must fit the era:** ≥4 pool players started at the fake club within ±2
  years (a draft gave Kroos an RB Leipzig loan in 2010).
- **Show loan returns and loan parents.** Courtois read Chelsea → Atlético (loan)
  → Real, hiding his Chelsea return; Harry Wilson showed loans with no Liverpool.
- **Display names from the enwiki title** (Marc Guiu, not "Marc Guiu Paz").
- **Fun ≠ difficulty.** Ease 9–10 scored fun 2–3; ease 3–5 scored fun 6–7. The best
  moments are a *real* stop that shocks ("Brentford got me", Szczęsny at
  Brentford) next to a believable fake. Journeymen/loan armies are a *flavour*,
  not a difficulty slot (Jonno pushed back hard on slotting "journeyman" between
  medium and hard). Day = a difficulty ramp + a mix of flavours.
- **Exclude anyone he has already played** (list in `pick-examples.mjs`, `PLAYED`).

### Verified (2026-10-09, commit 8f2ef2e)

`npm test` 1,370 passed (36 files); `npm run typecheck` clean. v5 checked in a
browser (Playwright, 1100px and 375px): swap peel (Maguire), insert peel
(Mount), missed round, no horizontal scroll. `pick-examples.mjs` reproduces the
committed `content/itk/examples.json` exactly. Pane-browser screenshots are
unreliable here (they crop/zoom); use Playwright for visual checks, and freeze
animations with `document.getAnimations()` + `currentTime` to inspect frames.

### Hazards

`.next` corruption: `/itk` 404s with ENOENT on `.next/server/app/itk/page.js`
when another dev server shares the folder; stop the other, restart. An untracked
`AGENTS.md` (copy of CLAUDE.md) appeared from elsewhere: Jonno to say keep or
delete; not committed. The desktop app stops idle dev servers and each restart gets a new port (3000 is
taken); `npm run dev` prints it. The `prod` launch config fails: no build.

### Next

0. End screen: get Jonno's go on the build above (and the scarf), build, verify,
   commit. Then back to rules:
1. Get Jonno's v5 playtest JSON (Copy feedback). Read each round for *why*
   (unknown player / unreadable career / good bluff / tell), not just the numbers.
2. Iterate rules + examples until he says the rounds feel right. Open threads:
   difficulty estimate vs his ratings; flavour mix per day; the eligible pool is
   small (~166 players at the v2 bars; re-measure under v5 rules).
3. Then spec (`docs/superpowers/specs/`) → STOP for approval → plan → STOP →
   build the generator inline, TDD. **The daily must refresh itself** (scheduled
   job, no manual step — Jonno's standing rule) and be seeded by date.
4. Before shipping: remove prototype tooling (set switcher, feedback strip);
   portraits for ITK players (`fetch:portraits` only covers Chain boards);
   decide the name.

Follow-up spotted: pool label "Andrcu Onana" is vandalised (André Onana); fix
in `src/pipeline/overrides.ts` and `data/pool.json` per the Data pipeline section.

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
