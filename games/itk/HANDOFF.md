# ITK — state of play

Branch `feat/fake-transfer`. Site-wide notes: root `HANDOFF.md`. The code is still in
`app/itk`, `components/itk`, `src/lib/itk`, `src/server/itk.ts`, `tests/itk`; move it into
`games/itk/` (the `games/pin` pattern) before it merges to `main`.

Started 2026-10-08 from `docs/game-design-playbook.md` §4. **Not yet specced.**
Jonno changed the process: build a prototype page over hand-picked example
sets, playtest, critique, repeat; only then spec → plan → generator. We are
mid-loop (v5 examples are live, awaiting his v5 playtest). No spec or plan
exists yet; do not write the generator until he signs off on the rules.

**The game.** Five careers a day. Each is a player's sticker and their clubs as
a trail of crest stickers (year, crest, short name, "Loan" tag) joined by an ink
route with arrows, snake-laid (rows reverse) so 9 stops fit a phone. One stop
is fake. Two picks per career: found first time 🟩, second 🟨, missed 🟥
(Chain's glyphs), drawn on screen as solid ✓/✓/✕ marks. The end screen is built,
awaiting Jonno's sign-off: see "End screen" below. Share line
`ITK #n · Agent 9/10` + grid, no names.
Name "ITK" is Claude's pick; Jonno said revisit later.

| Path | What |
|---|---|
| `app/itk/page.tsx`, `app/itk/itk.css` | The page and its stylesheet (album tokens; the one new mark is the red marker loop). |
| `components/itk/Itk.tsx` | Rounds, picks, status, end screen; prototype set switcher. |
| `components/itk/Trail.tsx` | Snake layout from geometry, route SVG, crest cards, the peel reveal. |
| `components/itk/Feedback.tsx` | **Prototype tooling**: per-round strip (knew him; first look 1–10 locked at reveal; how easy 1–10; fun 1–10; note). localStorage `itk.feedback.v1`, "Copy feedback" button → JSON Jonno pastes back. |
| `src/server/itk.ts`, `app/api/itk/pick/route.ts` | Loads `content/itk/examples.json`; the fake's index and the real club stay server-side until the round ends. Dev re-reads the file per request. |
| `src/lib/itk/score.ts`, `tests/itk/score.test.ts` | Round mark, `POINTS`/`pointsOf`, `RUNGS` + floors, `tierOf`, `rangeOf` ("5–7"), share line (10 tests). |
| `components/itk/Reveal.tsx` | The end screen: tally, the five careers with +2/+1/+0, the route, the album page of six slots, your result sticker. `Summary` in `Itk.tsx` wraps it with share/again and the prototype result picker. |
| `public/itk/ranks/*.webp` | Rank art, one per result (Higgsfield GPT Image 2.5, transparent, 480px). Faded in every slot, full colour on your sticker. Credited on `/credits`. |
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
  4.25 credits total. The Casual scarf is green/yellow (≈ Norwich); Jonno
  kept it as is (2026-10-10), don't regenerate.
- **Not yet answered:** pattern honours (Late show, Bottled it, Second call…).

### End screen — built (2026-10-10), awaiting Jonno's sign-off

Known: on a 375×812 phone the card's lower half starts below the fold, because
the prototype bars (set switcher, result picker) push it down; recheck once
they're removed before ship.

What's on screen, in order of the animation (route 350ms → card 2050ms, actions
2550ms, album 3050ms): `ITK #n` and a counter over the five careers; the ink
route runs through their ✓/✕ marks, each mark's `+2/+1/+0` pops as the route
passes and the counter steps to the running total; the route drops into **your
card alone, large and centred** (220px, 184px on a phone: full-colour art, name,
`8/10`; podium in its metal case), landing with a press; Share / Play again
under it; only then the album page of all six fades in below (yours stuck in
its slot; the rest faded + greyed art, name, point range `0–1`…`10`). Jonno
(2026-10-10): "you got this, then you see the others". Phone: the podium is the
first row of three. Pack/peel mockups and the reveal switcher are deleted. Still prototype: the "End screen" jump and the result picker.
White ✓ on `--gold` checked at 22px: readable, yellow left as is.

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

### Why only ~125 players pass (measured 2026-10-12, `scripts/itk/pool-funnel.mjs`)

Funnel at the v5 rules: 688 players with 500k+ views, 497 with 4–9 stops and
crests, 356 after the era rule, **125 after the known-club rule**. The
known-club rule is the one that bites (225 players lost): "≥300k views AND ≥30%
of the club's pool players also played in the PL, or ≥2M views" calls Sevilla,
Lyon, Porto, Valencia, Monaco, Werder, Fiorentina, PSV, River Plate unknown,
because they are Spanish/French/Portuguese clubs with a low PL-link share. Views
alone cannot replace it (Vissel Kobe 651k, Al-Nassr 580k ≈ Blackpool 681k,
Werder 694k). Sweep (players that pass): 125 baseline; share 0.15 + "huge" at
1M views instead of 2M → **249**; + first stop ≥2000 → 260; + player floor 350k →
306; + up to 10 stops → 319; allowing 2 unknown clubs → ~440 (probably too loose).
Jonno's calls still needed: the club rule, the 500k floor (Adam 335k was
rejected as unknown, Pellistri 578k and Coady 588k were fine), the 2004 start.
**Reuse:** same player with a different fake is fine after a gap; no repeat if
the gap is shorter than players/5 days (250 players → 50 days; 320 → 64). A
player who recalls the real career spots a new fake faster, so keep the gap long
and never reuse the same fake club for the same player.

### Verified

2026-10-10, end screen: `npm test` 1,373 passed (36 files); typecheck clean.
Playwright frames at 1100px and 375px for Fabrizio, Agent, Scout, Pundit, Mascot
at 700/1400/2150/2400/5000ms: no console errors, `scrollWidth` = viewport. A
real pick checked the ✕ on the top-bar pip and status chip. Fixed on the way:
the metal case overflowed its slot by 14px (`.slab` is a column flexbox; the
paper needed `min-height: 0`). Scratch script pattern: `npx` playwright from
`npm-cache/_npx/9833c18b2d85bc59`, `executablePath` = `ms-playwright/chromium-1228`
(its bundled revision isn't installed); first `/itk` compile takes ~20s, warm
it with curl before running.

2026-10-09 (commit 8f2ef2e):

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

0. End screen: Jonno to look at it (End screen button, pick each result) and
   sign off or redirect; answer AGENTS.md. Then back to rules:
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

