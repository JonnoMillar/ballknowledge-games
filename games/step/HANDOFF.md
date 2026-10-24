# Step chain — state of play

**Updated 2026-10-21** (graded for a 16-26 audience, below; shipped to main). Merged to `main` 2026-10-14;
the ruler work was branch `claude/steps-grading-555384`. Site-wide notes: root
`HANDOFF.md`. Spec (the decision record): `games/step/SPEC.md`. Working name
"Step" (`NAME` in `lib/rules.ts`, route `/step`) until Jonno names it.

**Status:** built and playable at `/step`. Jonno played it on 2026-10-14 and
gave a first round of feedback (below, applied the same day). He then
reverted the British grade words (keep Basic … Elite) and asked for the merge
to `main`, same day. He took every recommendation in the spec: 4 steps, five grades site-wide, one
shot, run = average rounded down, automatic daily.

## Card motion (2026-10-25, branch `worktree-card-motion`, not merged)

Jonno liked a Claude Opus 5.5 card animation (Instagram, ashokreddyai,
slide 5): the camera pushes in on the card, it sways, light runs round the
foil edge, a spotlight on a dark stage. Read frame by frame; we took the
camera and the light, not the ticket back, the tear-off, the rainbow foil or
the dark stage. Jonno's calls: cream stage with a light pool, the sheen in
each grade's own material, all three places below.

- **Reveal** (`components/Slam.tsx`, `lib/show.ts`): the case slam stays
  (it says how deep). 250 ms into the break the show starts: push in, one
  sway with the light orbiting the case, settle. One template, numbers by
  grade in `SHOW` (Basic 0.5 s no push; Elite 1.2 s, 1.35×, light pool and
  a shadow under the card). `showAt(u)` is pure (the motion-design skill's
  seek(t) rule): every frame computed from one clock, so skip and reduced
  motion land on rest. Tests in `tests/show.test.ts`.
- **End of run** (`Summary` in `Step.tsx`): the four cards deal in 100 ms
  apart; the deepest catches the light once. No push.
- **Collection** (shared `components/Collection.tsx`): an opened card turns
  towards the pointer (mouse hover, finger drag), light on the near edge,
  eases back flat on release. The grid stays still.
- **Shared** (`components/Slab.tsx`, `app/globals.css`): every case has a
  `.slab__sheen`, unlit at rest, under the well so it never crosses the
  photo. Registered properties `--rx --ry --lx --ly --lit` turn and light it
  inside a `.tilt`; `slab-pass` is the one-pass keyframe. Chain's reveal and
  Spoofed render the case unchanged.

**Preview (dev only): `/step/preview`** (`components/MotionPreview.tsx`,
404 in production). Jonno reviews design here, not by playing: Getting a
card (each grade and a miss, Replay, a scrubber through the show), End of
run, Opened card (tilt). Real players from the server, the real components.
The collection's tilt moved to the shared `components/CardTilt.tsx` for it;
`Summary` is exported from `Step.tsx`.

**Next (Jonno, 2026-10-25, after previewing):**
1. *The case breaking in half "looks terrible": cut it.* The stack of cases
   stays (more cases = deeper, it carries the grade). Instead of the crack and
   the falling halves, the top case's empty well develops into the player
   (silhouette to photo, a short bright flash on the case), then the show
   pushes in. No second object appears.
2. *The duplicate photo:* while the verdict shows, the pick is both in the
   strip's gap and in the card below. Recommended: one sticker that travels.
   On Lock it lifts out of the gap and drops into the top case (the gap keeps
   an outline with the grade chip); on Next the card shrinks back into the
   gap as the sticker, so the strip reads as a chain again. Fits the
   no-teleports rule. Confirm with Jonno before building if unsure.
Build both in `Slam.tsx` / `Step.tsx` / `step.css`, update `/step/preview`
to show them (it must keep every grade and the miss), check frames.

**How to check frames:** the Browser pane is usually hidden, which throttles
its animation; screenshots also lag a frame. Use headless Chromium instead
(Python `playwright` 1.60 is installed): open `/step/preview` at 390×844
and 1280×800, click each grade, screenshot during and after, pose the show
with the scrubber, tile the shots into a contact sheet with PIL and read it.

**Verified:** typecheck, `npm test` (2,189), prod build. Frames read as
contact sheets from headless Chromium at 390×844 ×2 (`/step` with the pick
API faked to each grade, stills posed at fixed u, then live): timings exact
(Elite show 1,201 ms, Basic 499 ms), push, sway, sheen per material, pool
and shadow, summary deal-in, collection tilt and release. Not covered: a
real phone (touch drag, frame rate), the built-in Browser pane (hidden, so
its timing is throttled).

### Feedback round 1 (2026-10-14), applied

- **Reveal:** `components/Slam.tsx`. Empty cases slam down one on another,
  Basic up to the grade earned (more cases the deeper the pick), then the top
  one cracks down a jagged line and its halves fall away from the card, with a
  burst of the grade's colour. A miss is one grey case that cracks to ✕. Tap
  skips; reduced motion lands on the end; a verdict already there on load shows
  with no ceremony. The strip and pips keep the result back until it ends.
- **Linking club:** "Linked by [crest] Chelsea" under the card (the pick's
  most prominent club shared with the given).
- **Obvious answer** after every step, right or wrong (hidden if it was the
  pick). Safe because of the next point.
- **Steps apart** (`clash` in `lib/day.ts`): givens either side of a club share
  no club, and each step's obvious and deepest answers answer no other step
  that day. Fully disjoint answer pools are not possible (82 of 23,709
  candidate pairs), so other overlaps can remain.
- **Prompt:** "Played for Roma and one of Verón's clubs" (no "with": time is
  ignored).
- **British:** givens need a Premier League spell,
  a British nationality, or fame 90+; every day has a Premier League club.
  Givens fell to 73, so `givenGap` 21 to 14 days, and a step may come back
  after 120 days (`stepGap`; never-repeat dead-ended at day 156). Tested to two
  years. The schedule was regenerated from day 1 (pre-launch) and the
  progress key bumped to `step.progress.v2`.

## Grading ruler (2026-10-20)

Jonno: "some of the rankings are just way off". Diagnosed on every step of
days 1 to 54 (216 steps, 8,340 picks that hold), read as a fan with
`scripts/step/grade-report.ts` (a step's field ranked by the ruler, with
fame, English views and the stint) and measured with
`scripts/step/compare-rulers.ts` (candidates side by side).

**What was wrong (old ruler: sitelinks × the less known of link and stint).**
1. *Stints swamped fame.* Sitelink fame spans about 3× across a field, a
   stint's weight 20× (0.05 to 1), so any famous player's short spell graded
   deep: Salah at Roma for Robben was **Sharp** (his 13 Chelsea games), Robbie
   Keane at Spurs for Sterling Sharp (half a season at Liverpool), Eto'o at
   Chelsea for Neymar Sharp.
2. *The given's own short spell buried every link through it*, whoever the
   pick was: Henry's 16 games at Juventus made Baggio **Decent** and Chiesa,
   Vlahović **Solid** at Fiorentina, while Ramón Díaz (linked through Monaco,
   where Henry was long) was **Basic**.
3. *Sitelinks are global*: Asamoah Gyan 62, Roy Keane 63.

**The fix** (`factOf` in `lib/rules.ts`): fame is English Wikipedia views
over 24 months (`data/player-views.json`), raised to `FAME_POWER` 0.8;
each half of the fact is a player-at-a-club fact (that player's fame × their
stint), so the given's half is measured by the given's fame (Henry's season at
Juventus is known because Henry is), and the link is its best shared club,
each club as its less known end. Players with no English page fall back on a
sitelinks fit (`FIT_A`, `FIT_B`). Raw views (power 1) over-corrected: Ian
Wright's ten-game loan at Forest went Basic on pundit views; tempering the
stint instead made Eto'o's 1997 loan at Espanyol Basic. Blending sitelinks
back in (log space) scored the same on the pins and adds a knob, so no.

| On the same 216 steps | Old | New |
|---|---|---|
| Fan-judged pins in range (`tests/grades.test.ts`) | 3 of 10 | 10 of 10 |
| 1M+ views, 100+ games at the club, graded Sharp/Elite | 22 | 10 |
| Under 100k views, under 30 games there, graded Basic/Decent | 9 | 1 |
| Spread Basic / Decent / Solid / Sharp / Elite | 11 / 14 / 20 / 47 / 8 % | 13 / 13 / 20 / 48 / 7 % |
| Picks that move two grades or more | | 637 (7.6%) |

The 10 left are nearly all links through a short spell, deep by design
(Eto'o for Benzema at Barcelona: his few Real Madrid games; Torres for
Beckham at Liverpool: Milan). Two pins (Ian Wright, Guardiola at Roma) only
promise Decent or deeper: whether they are Decent or Solid is Jonno's call.

**Data.** Views moved from `games/itk/data` to `data/enwiki-views*.json`
(shared; Spoofed reads them at generation). `scripts/fetch-views.mjs` now
covers the whole pool and writes `data/player-views.json` (QID to views,
what the server reads): 11,574 of 11,741 players. Same window as before (Oct
2023 to Sep 2025) so old and new numbers compare; move it all at once.
Wikimedia rate-limits it (429s): a cold run took about 3 hours, resumable.

**Schedule.** The ruler decides each step's shown answers, so 12 unplayed days
leaked one into another step. Days from 2026-10-22 were regenerated (27 days,
to 11-17); 10-20 and 10-21 (possibly in play) were kept and pass.

**Still for judgement (feedback round 1, below):** links through the given's
short spell (Weah at Monaco for Vieira, via his two Milan games: Solid);
managers' and pundits' views (Enzo Maresca, Chelsea manager, is **Basic** as a
Sevilla player; Ian Wright); American readers (Matt Turner, USMNT keeper,
Basic at Forest from 17 games); recency (a stint ended within two years counts
as fully known, `spellWeight`, shared with Chain).

## Graded for the audience (2026-10-21), the final ruler

Jonno after three rounds: the players are about **16 to 26**. They rarely
know anyone whose career ended before 2010, and clubs outside the Premier
League and the biggest abroad (Sevilla, Valencia) are hard for them. He asked
for it done as a final product: no more feedback rounds.

What changed (`lib/rules.ts`, `lib/day.ts`):
- **Era fade** (`ERA_FULL` 10, `ERA_HALF` 5, `ERA_FLOOR` 0.2): a player-at-
  club fact fades once the stint ended more than 10 years ago, halving every
  5 years, dated by the stint's end and by the player's last season anywhere
  (geometric mean). Torres at Liverpool stays known (he played on), Redknapp
  at Spurs does not.
- **Club reach** (`lensOf`, `REACH_FULL` 60M, `REACH_POWER` 1.5): a non-PL
  club weighs by the English views of everyone there in the last 10 years.
  Real, Barça, PSG, Juve, Bayern, Atlético 1; Roma 0.98, Inter 0.79, Ajax
  0.71, West Ham 0.68 (its pool league reads Championship), Monaco 0.6,
  Benfica, Marseille, Sevilla about 0.5, Porto, Fiorentina 0.4, PSV, Valencia
  under 0.3, Genoa 0.17.
- **Current stint** (`CURRENT_STINT` 0.6): a spell still going counts as at
  least 0.6 of a stint, however few games (Durán at Benfica).
- **Elite by bar**: `BAR_CUTS` gained a 4th cut, under the best known 60% of
  all answers is Elite (Zenden, Aquilani, Harewood wanted Elite).
- **Linking club** (`linkOf`): "Linked by" is now the club the fact uses, the
  best known shared club, not the most prominent (Depay for Rodri).
- **Steps the audience can do** (`RULES.minKnown` 3): a good step needs
  three answers at or above the Decent bar. Drops Ronaldo · Forest and
  Sevilla · Piqué. 4 dead-ended the schedule within weeks.
- **Givens by faded English views** (`RULES.givenViews` 1.5M, views ×
  `eraOf(lastSeen)`), not sitelinks 70, which favoured older players; club
  pool 60 to 100 for supply. 1,166 good steps, 102 givens, 33 clubs; two
  years generate. The schedule now reads Palmer, Rice, Watkins, Garnacho,
  Højlund, Yamal.
- **Views data fixed** (`scripts/fetch-views.mjs`): titles from Wikidata
  (`data/enwiki-titles.json`), and for players far under their sitelinks
  estimate the views of every redirect into their page are added
  (`data/enwiki-views.into.json`); a player's views are the larger of that
  and the old careers title. Renamed pages had lost their views: Rodri 34k
  (3.3M), Pepe 0 (2.5M), Raúl 5k (1.1M), Eduardo 0 (259k).
- **Undated spells** (2026-10-21, after): the player's last season is
  `lastPlayed` (src/lib/fame/era.ts, shared with Rondo), which skips spells
  with no end year, or no games and no length; an undated stint ends there
  too. Before, any such spell read as current, so 1,072 retired players
  (Sol Campbell, Romário) never faded. Verdicts held at 47 of 59, 12 off;
  ruler.json rebuilt; the 29 unplayed days still pass, 3 deepest answers moved.
- **One ruler file**: `data/ruler.json` = `{ year, reach, bar }` (was
  `bar.json`), written by `npm run step:days`, read by the server, checked
  current by a test. The year rolls with the cron, so the fade moves on.

Tuned on all three rounds' verdicts (`tools/feedback-round/answers/`, read
back from the page; `scripts/step/verdicts.ts` scores the shipped game and
lists misses; `tests/grades.test.ts` holds the line). The earlier pins were
my fan guesses and are gone. Result: **47 of 59 on target** (was 30), 12
grades off in all (was 30), none more than one. Still one off: De Bruyne at
City for Shevchenko (a famous Chelsea cameo), Trippier and Petit a grade too
deep, Zenden, Aquilani, Harewood, van Hooijdonk, Senesi a grade too shallow.

Shipped to `main` 2026-10-21 (e89d2f8): 2,183 tests, typecheck and the prod
build clean; `/step` played in the browser (Sterling for Núñez · City:
Basic, linked by Liverpool). Days from 2026-10-21 re-drawn (today's shown
answer leaked into another step under the new grades).

### Round 1 answers, and changes 1 and 3 (2026-10-20)

Jonno answered 24 of 30: 19 too low, 3 too high, 2 right. The grades were
set for someone who knows everything; his players know the Premier League,
the big clubs abroad, and recent players. Causes found: grades only rank a
pick within its step, so a tenth of every step was Basic however obscure the
step; old long spells never fade; a spell ended within two years counted as
fully known whatever its length; non-PL clubs weigh as PL ones; 3.9% of
pool memberships have no career spell (Luis Alberto at Barcelona, only B).

He chose two changes (the others, below, wait for him):
- **Absolute bar** (`Bar`, `BAR_CUTS` in `lib/rules.ts`): Basic, Decent and
  Solid also need the best known 3%, 10% and 25% of every answer on every good
  step (`buildWorld` computes it; `npm run step:days` writes
  `data/bar.json`, the server reads it, a test checks it is current; the
  cron commits it). The grade is the deeper of the two readings. At a full
  stint, Basic needs about 1.6M English views, Decent 870k, Solid 290k.
- **No credit for recency** (`stintWeight`, Steps only; Chain keeps
  `spellWeight`): a stint weighs its length alone.

Against his 24 verdicts: on target 2 to 10, the direction he asked 2 to 17,
grades off 27 to 15. Still off: era (Maresca, Yorke, Sylvinho), famous short
spells no rule sees (De Bruyne at Chelsea, De Gea at Atlético), and one
overshoot from dropping recency: Durán's six current games at Benfica went
Sharp (he wanted Decent to Solid); a big current transfer reads deep until
the games pile up. Baggio at Fiorentina is now Decent (just under the bar).
Days from 2026-10-21 were re-drawn (10-21's shown answer leaked into step 2).

**Waiting on Jonno:** era fade, league weight, B-team and unbacked
memberships (shared pool, so Chain too), and grading by real pick rates once
there is traffic.

### Feedback round 2 (2026-10-21), answered

Same artifact, `round.json` now `tools/feedback-round/rounds/steps-2.json`
(`npx tsx scripts/step/feedback-round.ts steps-2`), answers at
`rounds/steps-2/answers` (round 1's stay at `rounds/steps-1/answers`). 30
picks from days 09-19 to 10-20 under the new ruler (bar + no recency), none
asked in round 1. It probes the open questions: 6 careers ended before 2010
(era fade), 5 non-PL clubs (league weight), 3 short current spells (the Durán
overshoot), 2 links through the given's short spell, then a spread over the
grades (Basic 4, Decent 5, Solid 6, Sharp 13, Elite 2). Picks with no games
behind the club or the link (Darlow at Man Utd, Rodri's 0 at Barcelona) are
left out: that is the unbacked-membership question, not grading. Each item's
`meta.tags` says which probe it was. Read the answers back by tag to decide
era fade and league weight.

At Jonno's ask the round hides each pick: an item shows the step as in the
game (`gap`, `prompt`) and the pick, its lines and grade appear only once
the gap is tapped (`reveal: true` on the round), so he judges before
hindsight. Item ids unchanged.

**Answers (25 of 30):** 13 too low, 9 right, 3 too high. Every pre-2010
pick he rated came back too low or "never heard of him" (Redknapp,
Leonardo, van Hooijdonk, Prosinečki, Ince, Harewood, Zenden). His words:
the audience is roughly **16 to 26** and rarely names anyone whose career
ended before 2010. So era fade is no longer open: old players must grade
deeper. Too high: Torres at Liverpool for Terry (Decent, should be Basic),
Andrey Santos (Elite), and Depay at Man Utd for Rodri: Rodri is now at
Barcelona, where Depay also played, so the link should be Barcelona and
one grade lower. That means a 0-game membership can be a real current
transfer, not junk: do not drop unbacked memberships wholesale. Diomande
at Forest for Ronaldo (Elite): "how many solutions are there, I didn't
have one" (a step close to unfair).

### Feedback round 3 (2026-10-21), out with Jonno, his last

Ten picks, two per grade, recent only (`recent` in the script: the pick's
spell at the club since 2016, the pick seen since 2020, the given since
2016). Jonno said it is the last round he will do: no more rounds; use
these three and, later, real pick rates. Answers at
`rounds/steps-3/answers`.

### Feedback round 1

https://claude.ai/artifact/6yji2HfZKaBK5DiaHbr8hj (private to Jonno). 30
picks from days already played (no spoilers), built by
`npx tsx scripts/step/feedback-round.ts steps-1` into
`tools/feedback-round/rounds/steps-1.json`: the judgement calls above, the
biggest moves, links through a short given spell, high-views players, and two
or more per grade. Each shows the grade; Jonno taps Too low / Right / Too
high, with an optional note. Answers: ArtifactData `list` on
`rounds/steps-1/answers` (doc id = item id; `_round` is the closing note);
each item's `meta` in the round file names the step and its old grade.

**The page is reusable** (`tools/feedback-round/page.html`): a round is a
JSON file (`id`, `title`, `intro`, `options`, optional `scale`, items
with `kicker`, `title`, `lines`, `value`, `rank`, `image`), published
as `round.json` beside the page, answers at `rounds/<id>/answers`. Rondo's
starting players or player photos: write a round file with its own options
("Too easy / Right / Too hard", "Good / Wrong era / Wrong person") and
republish the same artifact. Photos must be uploaded as artifact assets: the
page cannot load images from other sites.

## The game

PLAYER — ? — CLUB, then CLUB — ? — NEXT PLAYER: givens P1 C1 P2 C2 P3. A gap is
anyone who played for the club and shared any club with the player (time
ignored, as on Chain). Pick from the search, Lock it in, graded at once on the
shared five-grade scale, Next slides the strip one club along. A miss is ✕
and the run moves on. End: "Ball knowledge" + the run's grade, the four cards,
Share, the deepest answer per step.

| Path | What |
|---|---|
| `lib/rules.ts` | `STEPS`, `stepsOf`, `fieldOf`, `knownOf` (English views ** 0.8), `factOf` (the less known of: link to the given, stint at the club, each a player's fame × stint), `endsOf` (obvious, deepest), `judge`, `runGrade`, `shareLine`. Pure; views passed in. |
| `lib/day.ts` | `RULES`, `buildWorld` (good steps, their fields and shown answers), `clash`, `composeDay` (seeded DFS), `extend`, `problems`. `EPOCH` 2026-09-19. |
| `lib/progress.ts` | `step.progress.v1`: per date, one verdict per step. |
| `lib/types.ts` | Wire types. |
| `server.ts` | `loadDay` (givens only), `judgePick` (refuses repeats, givens, bad steps). |
| `components/Step.tsx` | The page: strip (`Track`), gap, verdict and `After` (linking club, obvious answer), `Summary`. |
| `components/Slam.tsx` | The pack-opening reveal. |
| `components/Archive.tsx` | Day 1 to today, this browser's results. |
| `step.css` | Its stylesheet. |
| `data/days.json` | The schedule, one day a line. Server-only. |
| `scripts/step/build-days.ts` | `npm run step:days [-- --print]`: top up to 28 days ahead when under 14. |
| `scripts/step/grade-report.ts`, `compare-rulers.ts`, `feedback-round.ts` | Read a day's fields as graded; measure rulers (`--probes`, `--odd`, `--moves`); build a feedback round. |
| `data/player-views.json` | Shared: English views by player, from `scripts/fetch-views.mjs`. Rerun it after the pool grows (new players fall back on sitelinks until then). |
| `.github/workflows/step-days.yml` | Daily 05:30 UTC: `step:days`, `npm test`, commit, `pull --rebase`, push. Runs once on `main`. |
| `app/step/`, `app/api/step/{day,pick}` | Thin shells. |

**Shared changes on this branch** (land with the merge): `src/lib/chain/grade.ts`
is now five grades with `toGrade` reading the old six (collection and Chain
progress both map on read; checked in the browser with planted `gem`/`grail`
cards). Textures renamed `public/grades/sharp.jpg`, `elite.jpg`; diamond
(`gem.jpg`) deleted. Spoofed's metal cases use the new class names.
`SearchSheet` takes an optional `title`. `Card.source` lets a card link
somewhere other than a Deep Cuts board. `SPOKEN_NAME` gained Fiorentina,
Lazio, Napoli, Genoa, Benfica, Marseille. Hub card "Step" after Deep Cuts.

**Deviation from the spec:** the day sends all its givens up front (the page
shows one step at a time). Givens are not answers, so nothing leaks; it keeps
reload-resume simple. Each verdict carries that step's deepest answer, which
the page holds back until the end.

## Verified 2026-10-14 (feedback round 1)

`npm test` 1,728 passed; typecheck clean. Browser, dev server, 375×812, day #26
(Pogba · Ajax · Courtois · Man City · Ferdinand): Blind (Decent, one case,
linked by Man Utd, obvious Ibrahimović), Bogarde (Sharp, four cases), Gerrard
(miss, grey case, obvious Agüero), Wright-Phillips (Sharp, linked by QPR);
run Decent; reload resumes with no replay; four different deepest answers;
no console errors, no horizontal scroll. Test run and its three cards removed
from the browser afterwards. Prod build not re-run yet (run it before merge).

## Verified 2026-10-14 (first build)

`npm test` 1,725 passed; typecheck clean; prod build (`NEXT_DIST_DIR=.next-prod`)
clean. Browser, dev server, 375×812: a whole run (Paredes Solid, Mbappé Basic,
Kanté ✕, Jovetić Solid → run Basic), strip slides, reload shows the finished
run, no horizontal scroll, no console errors; collection shows the cards with
"Found on Step #26"; archive lists 26 days; hub card, `/chain` grade chips and
textures. 1100 px: archive day #25 renders centred. Not covered: a real phone,
the Share sheet, the cron on GitHub (runs once merged).

## Known / next

- **Givens' portraits:** Courtois shows a broken image on #26. many givens show a late-career photo (Bergkamp,
  Schweinsteiger in suits): `fetch:portraits` resolves only Chain board players.
  Add a `--step` target like `--itk` and run it before launch.
- **Givens are still picked on sitelinks** (`RULES.givenFame`); `minKnown`
  now drops steps the audience cannot do, which drops most oldhead givens,
  but a given who survives on one gettable step can still be an oldhead.
- **Next tuning is real pick rates**, once there is traffic: no more feedback
  rounds (Jonno, 2026-10-21).
- **West Ham's league** reads Championship in the pool (most of its members
  carry that league), so it is not counted as a Premier League club.
- **Links ignore time:** Mbappé fits Sneijder via Real Madrid. Same as Chain.
- Measured feasibility: 1,254 good steps over 73 givens and 35 clubs; two
  years generate with no rule broken (test).

## Gotchas (this session)

- Bash heredocs with many quotes/apostrophes failed to parse in this harness
  ("unexpected EOF"); write files with the Write tool instead.
- Dev server: preview config `recall-xi` (autoPort; 3000 was taken, got 3002).
  Prod build beside it: `NEXT_DIST_DIR=.next-prod npx next build`, then
  `git checkout tsconfig.json`.
- Pane screenshots at emulated sizes come back scaled/cropped; read text with
  JS (`innerText`, `scrollWidth`) to verify.

## Resume prompt

> Step chain game, branch `feat/step-chain`, worktree
> `.claude/worktrees/kind-tharp-12c680`. Read CLAUDE.md, then
> `games/step/HANDOFF.md` and `games/step/SPEC.md`. Jonno is playing `/step`
> (run `npm run dev`, preview config `recall-xi`). Apply his feedback; next
> concrete task if none: add a `--step` target to `scripts/fetch-portraits.ts`
> (like `--itk`) so every given in `games/step/data/days.json` has an in-era
> portrait, then `npm run fetch:credits`. Done when every given resolves, `npm
> test` and typecheck pass. Do not merge to `main` until Jonno says he has
> played it; then merge, run checks + prod build, push (auto-allowed).
