# Step chain — state of play

**Updated 2026-10-14.** Branch `feat/step-chain` (cut from `main` at 3c2660e),
worktree `.claude/worktrees/kind-tharp-12c680`. Site-wide notes: root
`HANDOFF.md`. Spec (the decision record): `games/step/SPEC.md`. Working name
"Step" (`NAME` in `lib/rules.ts`, route `/step`) until Jonno names it.

**Status:** built and playable at `/step`, waiting for Jonno to play it. **Do
not merge to `main` until he has.** Jonno took every recommendation in the
spec (2026-10-14): 4 steps, Basic/Decent/Solid/Sharp/Elite site-wide, one shot,
run = average rounded down, automatic daily.

## The game

PLAYER — ? — CLUB, then CLUB — ? — NEXT PLAYER: givens P1 C1 P2 C2 P3. A gap is
anyone who played for the club and shared any club with the player (time
ignored, as on Chain). Pick from the search, Lock it in, graded at once on the
shared five-grade scale, Next slides the strip one club along. A miss is ✕
and the run moves on. End: "Ball knowledge" + the run's grade, the four cards,
Share, the deepest answer per step.

| Path | What |
|---|---|
| `lib/rules.ts` | `STEPS`, `stepsOf`, `fieldOf`, `factOf` (fame × the less known of: link to the given, stint at the club), `judge`, `runGrade`, `shareLine`. Pure. |
| `lib/day.ts` | `RULES`, `buildWorld` (good steps), `composeDay` (seeded DFS), `extend`, `problems`. `EPOCH` 2026-09-19. |
| `lib/progress.ts` | `step.progress.v1`: per date, one verdict per step. |
| `lib/types.ts` | Wire types. |
| `server.ts` | `loadDay` (givens only), `judgePick` (refuses repeats, givens, bad steps). |
| `components/Step.tsx` | The page: strip (`Track`), gap, verdict, `Summary`. |
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

## Verified 2026-10-14

`npm test` 1,725 passed; typecheck clean; prod build (`NEXT_DIST_DIR=.next-prod`)
clean. Browser, dev server, 375×812: a whole run (Paredes Solid, Mbappé Basic,
Kanté ✕, Jovetić Solid → run Basic), strip slides, reload shows the finished
run, no horizontal scroll, no console errors; collection shows the cards with
"Found on Step #26"; archive lists 26 days; hub card, `/chain` grade chips and
textures. 1100 px: archive day #25 renders centred. Not covered: a real phone,
the Share sheet, the cron on GitHub (runs once merged).

## Known / next

- **Givens' portraits:** many givens show a late-career photo (Bergkamp,
  Schweinsteiger in suits): `fetch:portraits` resolves only Chain board players.
  Add a `--step` target like `--itk` and run it before launch.
- **Fame is sitelinks.** A given a British fan cannot place can still come up;
  Louis van Gaal was excluded by hand (`NOT_A_GIVEN`). Spoofed's enwiki views
  would be better but live in `games/itk/data`; move them to `data/` first.
- **Links ignore time:** Mbappé fits Sneijder via Real Madrid. Same as Chain.
- Two adjacent steps share a club, so one player can be the deepest answer on
  both (Viviano on #26). Shown twice; fine unless Jonno minds.
- Measured feasibility: 1,643 good steps over 102 givens and 35 clubs; 90 days
  generate with no rule broken (test).

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
