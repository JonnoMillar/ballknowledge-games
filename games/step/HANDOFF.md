# Step chain — state of play

**Updated 2026-10-14.** Branch `feat/step-chain` (cut from `main` at 3c2660e),
worktree `.claude/worktrees/kind-tharp-12c680`. Site-wide notes: root
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

## The game

PLAYER — ? — CLUB, then CLUB — ? — NEXT PLAYER: givens P1 C1 P2 C2 P3. A gap is
anyone who played for the club and shared any club with the player (time
ignored, as on Chain). Pick from the search, Lock it in, graded at once on the
shared five-grade scale, Next slides the strip one club along. A miss is ✕
and the run moves on. End: "Ball knowledge" + the run's grade, the four cards,
Share, the deepest answer per step.

| Path | What |
|---|---|
| `lib/rules.ts` | `STEPS`, `stepsOf`, `fieldOf`, `factOf` (fame × the less known of: link to the given, stint at the club), `endsOf` (obvious, deepest), `judge`, `runGrade`, `shareLine`. Pure. |
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

- **Grade calibration is global fame** (sitelinks): a player only Britain knows still grades deep. If Jonno meant the
  calibration too, the fix is enwiki pageviews in the fact ruler (needs a full
  pool fetch: `games/itk/data/enwiki-views.json` covers 7,761 titles and misses
  Gerrard, Terry, Puyol).
- **Givens' portraits:** Courtois shows a broken image on #26. many givens show a late-career photo (Bergkamp,
  Schweinsteiger in suits): `fetch:portraits` resolves only Chain board players.
  Add a `--step` target like `--itk` and run it before launch.
- **Fame is sitelinks.** A given a British fan cannot place can still come up;
  Louis van Gaal was excluded by hand (`NOT_A_GIVEN`). Spoofed's enwiki views
  would be better but live in `games/itk/data`; move them to `data/` first.
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
