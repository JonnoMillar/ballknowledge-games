# Pitch pin — state of play

Branch `feat/pitch-pin`. Site-wide notes: root `HANDOFF.md`.

A famous goal is named; the player pins where it was struck from. Each goal
scores 0 to 100; a pack scores the mean (rounded down) and lands on one fixed
scale: Wide, Close, Sharp, Deadly, Pinpoint. **Built and playable at `/pin`.**
Specs: `docs/superpowers/specs/2026-10-10-pitch-pin-hub-design.md` (the hub,
the scale, the laptop layout; wins where it disagrees),
`…/2026-10-09-pitch-pin-library-design.md` (packs, data) and
`…/2026-10-08-pitch-pin-design.md` (the throw, the reveal, licences). Plans: `docs/superpowers/plans/2026-10-09-pitch-pin-library.md`
(done) and `…/2026-10-08-pitch-pin.md` (tasks 1–12 done, 13–15 folded into the
library plan).

**What it is now.** No daily, no streak. `/pin` is a hub: a top card (first
visit: headline, looping CSS demo, "Start here" pack and Play; a pack in
progress: Carry on with your pins so far; otherwise Up next), Your record
(packs, average, best, all derived from the existing localStorage store), How
it works with the tier scale, then shelves: This season, Classics, By season,
By club, Earlier. Each kind has its colour; a played card shows your pins as
its art and its score and tier. `/pin/<id>` is one pack (6 to 9 goals, one
throw each); on a laptop (≥900 px) it is two columns that fit the window, so
Throw is never below the fold. Full time: the list slides in, the score
lands on the scale with its tier (a slam from Sharp up), "N off <next tier>",
bullseyes, and with two or more packs finished "Your average is A; this is
your best". Points only: metres and par are gone from screen and code.
Bullseye is 2 m. Kinds: `round` (our weekly pick), `month` (the official Goal
of the Month shortlist), `season` and `club` (past winners), `classic`
(hand-made, StatsBomb). A round or month pack is **New** for 7 days.

**Data.** `games/pin/data/goals.json` (server-only: it holds the answers),
`games/pin/data/packs/*.json` (one file per pack), `games/pin/data/check.json`
(the monthly model check: how many Goal of the Month nominees our round packs
had already picked; September 2026: 6 of 8, August 2026: 2 of 7 matched).
`tests/content.test.ts` holds every goal and pack to the rules (round and
classic packs must be fair: the lazy pin, every goal on the penalty spot,
scores under 60, and there are goals in and out of the area). Month, season
and club packs are official lists and are not held to it.

**Scripts.**
- `npm run pin:update` runs round then Goal of the Month. Daily at 06:00 UTC
  from `.github/workflows/pin-packs.yml`, **once it is on the default branch
  (`main`) with a remote**. Until then run it by hand.
- `npm run pin:round`: one pack per complete Tuesday-to-Monday week of results.
- `scripts/build-pin-gotm.ts`: last month's shortlist (and the month before).
  Exits 1 if the page loads but no nominee can be read.
- `npm run pin:archive`: one-off, **done** (2016/17–2025/26 winners from
  Wikipedia, 10 season packs and 7 club packs). Safe to rerun.
- `npm run pin:classics`: after editing `classics.source.json`.

**Real runs, 2026-10-09.** Round: 5 packs (weeks ending 24 Aug to 21 Sep).
Goal of the Month: September 8 of 8 nominees matched, August 7 of 8 (Cherki's
brace cannot be told apart). Archive: 88 of 89 winners matched, 17 packs
(Rooney's 2017 halfway-line goal is skipped: the pitch is the attacking half).
`npm test`: 1,653 passed, 47 files; typecheck clean. Checked at 375 px: the
library lists the shelves in order, the two Goal of the Month packs are New,
a pack plays to full time (total against par, pins, list, Share, Next pack),
status and points mode show on the library, `/pin/nope`, `/pin/2026-10-08`
and `/pin/pack/lionesses` all 404, and neither page's HTML holds `"at"` or
`"xg"`. Not covered: a real phone, the Share sheet, a throw that fails, and
anything on a live server (no remote yet).

**Checked 2026-10-10 (hub rework).** `npm test` 1,659 passed, 47 files;
typecheck clean. Browser, real dev server: hub first visit, Up next, Carry on
and record at 375 px and 1024 px; Throw and the whole pitch on screen at
1366×657 (Throw bottom 573), 1440×760 (675) and 375×812 (695), before and
after a throw; Full time at 375 and 1024 (79 Deadly, 11 off Pinpoint; a 92
Pinpoint with "Your average is 86; this is your best"); no `"at"` or `"xg"`
in either page's HTML; no console errors. Not covered: reduced motion (CSS
only, not emulated), a real phone, the Share sheet.

**Launch checklist (Jonno's, in order).**
1. Email StatsBomb and Understat and register with StatsBomb. Both licences
   are grey (StatsBomb bars redistribution and commercial use; Understat
   publishes no terms). Pitch pin stays on the branch until this is done.
2. Create the private GitHub remote (ask before every push), merge to `main`,
   then run `workflow_dispatch` once and watch it. premierleague.com might
   block GitHub's runners; a red run will say so.
3. ~~Choose one scoring mode~~: done 2026-10-10, points on the five-tier scale.
4. The StatsBomb logo is in (`public/credits/statsbomb.png`, from the Hudl
   StatsBomb media pack, asset marked External Use Approved). It is the Hudl
   StatsBomb logo, a PNG: the pack no longer offers an SVG. Confirm that is the
   mark their agreement means.

**Decisions and why** (do not re-litigate):
- Data: StatsBomb open data for classics, Understat for recent goals.
  Hand-placed coordinates and the Champions League (no free source) are out.
- Scale (2026-10-10, replaces par): tiers at 0/40/60/75/90, set on 31 packs ×
  200 simulated runs: lazy pin median 37 (max 59.86, floored to 59), decent
  fan (~5 m) 65, expert (~2.5 m) 84 with Pinpoint on 26% of packs. The pack
  score rounds **down** so the lazy pin never reaches Sharp.
- No "vs everyone" yet: it needs a server store. When hosting is chosen, log
  results behind `/api/pin/throw` (no client change) and show the spread once
  a pack has enough plays.
- A goal struck outside the attacking half (y > 52.5 m) is never used: it cannot
  be pinned. `officialGoal` and the round script both skip it.
- Ink pitch on white; rings shaded per colour, stronger toward the middle.
- Execution inline, no per-task subagents (Jonno's standing rule). UI work is
  built by Opus straight from the spec; plan-then-Sonnet only for big
  mechanical builds.

**Gotchas.**
- Understat: `GET understat.com/getLeagueData/<EPL|La_liga|...>/<season start year>`
  and `getMatchData/<id>`, header `X-Requested-With: XMLHttpRequest`. Slow,
  one call took 20 s; the scripts time out and retry. Its Y axis is flipped
  against StatsBomb. An `OwnGoal` shot is filed under the scorer's own side and
  counts for the other.
- StatsBomb `minute` counts from 0 (minute 94 is the 95th).
- The official shortlist page is marked up differently month to month:
  September 2026 and August 2025 link the players; August 2026 has bold names
  and no player links. `parseShortlist` reads both; a new variant means the
  script fails loudly and a fixture plus a case is needed in `lib/gotm.ts`.
- Scripts write `goals.json` before the pack file, so a crash cannot leave a
  pack whose goals are missing.
- Stale `.next/types` after deleting a route makes `npm run typecheck` fail on
  files that no longer exist; delete `.next/types`.
- Worktree: `.claude/worktrees/sad-nightingale-82892f`, branch `feat/pitch-pin`
  off `feat/prototype`. Run `npm ci` first in a fresh worktree. Dev server:
  preview config `recall-xi` (autoPort).
- Mockups (pre-review): https://claude.ai/artifact/Fr5aSwkm6ANdRXT9xw8JS3;
  hub rework (approved): https://claude.ai/artifact/GFjr6JVcsh7r3BXoFXyUPq
- Class names in `pin.css` are flat (`pin__next` is the Next goal button,
  `pin__sofar` the per-throw running total). The hub hit both clashes; check
  before naming a new class.
- Screenshots at an emulated 1440 px width come back garbled in the preview
  pane; measure with JS or use the pane's own width.

