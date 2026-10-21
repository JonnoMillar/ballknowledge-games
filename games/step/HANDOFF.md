# Step chain — state of play

**Updated 2026-10-20** (grading ruler, below). Merged to `main` 2026-10-14;
the ruler work was branch `claude/steps-grading-555384`. Site-wide notes: root
`HANDOFF.md`. Spec (the decision record): `games/step/SPEC.md`. Working name
"Step" (`NAME` in `lib/rules.ts`, route `/step`) until Jonno names it.

**Status:** built and playable at `/step`. Jonno played it on 2026-10-14 and
gave a first round of feedback (below, applied the same day). He then
reverted the British grade words (keep Basic … Elite) and asked for the merge
to `main`, same day. He took every recommendation in the spec: 4 steps, five grades site-wide, one
shot, run = average rounded down, automatic daily.

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

### Feedback round 2 (2026-10-21), out with Jonno

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
- **Givens are still picked on sitelinks** (`RULES.givenFame`); English views
  are now in `data/` and would place them better (Louis van Gaal is excluded
  by hand, `NOT_A_GIVEN`).
- **Read round 1's answers** and tune `FAME_POWER` or the stint rules from them.
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
