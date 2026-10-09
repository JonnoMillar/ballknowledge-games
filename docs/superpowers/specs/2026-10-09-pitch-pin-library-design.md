# Pitch pin as a pack library — design

**Date:** 2026-10-09
**Status:** Approved in session (Jonno), section by section, on branch `feat/pitch-pin`
**Supersedes in part:** `docs/superpowers/specs/2026-10-08-pitch-pin-design.md`.
The game itself (the pitch, one throw a goal, the two scoring modes, par, the
ref keeping coordinates off the page, the licences) is unchanged and stays
described there. What is replaced: the daily, the streak, recent goal
selection across five leagues, and the weekly routine run by hand.
**Execution:** the implementation plan is executed by a fresh Sonnet session
with `superpowers:executing-plans`, not by subagents (see the end).

## Why the pivot

Jonno played the demo on 2026-10-09. A six-goal daily needs 28 recent goals a
week, and filling that from Understat's rankings put nobodies on the board.
Football already decides which goals matter: the Premier League's Goal of the
Month shortlist, its winners, the big finals. So Pitch pin becomes a
**library of packs** that grows on football's own schedule. No daily, no
streak.

## Decisions carried in (do not re-litigate)

- No daily, no streak. New packs are marked **New** for 7 days and
  **Not played** per browser.
- **Goal of the Month pack, official:** the nominees from
  `premierleague.com/en/awards/goal-of-the-month/<season>/<month>` (plain HTML,
  8 nominees, player and match, no minute). Pages exist from 2025/26 only.
- **Round pack, from our own ranking**, because no official weekly list is
  machine-readable. Its quality is scored monthly against the GotM shortlist
  (the old ranking picked 4 of September's 8 unprompted).
- **Archive packs, official picks only:** GotM winners since 2016/17 from
  Wikipedia, as season packs and club packs; internationals and Champions
  League finals from StatsBomb (Understat has no European data).
- **Pack size varies.** The par floor scales at 7 m a goal.
- **No manual upkeep, ever.** Every recurring script runs unattended.
- **Automation ready but switched on at launch.**
- **Storage:** one JSON file per pack in the repo; `goals.json` stays
  server-only; the Action commits new pack files and the host redeploys.
  A hosted database and live fetching were both rejected.

## 1. The library page

### `/pin`

A server-rendered page of packs on shelves. It replaces the client-side
redirect to today's date.

Shelves, in order:

1. **This season**: `round` and `month` packs whose `season` is the latest
   season present, newest `published` first.
2. **Archive**: `season` packs (newest season first), then `club` packs
   (A to Z), then `classic` packs (oldest `published` first, then by id),
   then `round` and `month` packs from earlier seasons, newest
   first.

Each card shows:

- the title ("18–20 October", "September's Goal of the Month",
  "Goal of the Month winners 2019/20", "Arsenal", "World Cup 2022");
- the subtitle, from the pack file ("Premier League 2026/27 · 6 goals");
- **New**, only on `round` and `month` packs, for 7 days from `published`
  (computed on the server; every browser sees the same thing). Archive packs
  never show New, or the whole archive would be New at launch;
- the browser's status for the pack, filled in after mount because
  localStorage is not on the server:
  - **Not played**
  - **k of n**, a pack part-thrown (a refresh resumes it, as now)
  - **Finished**, with the score against par: "41.2 m, 12 under", or the
    points total in points mode.

No filters, search or sorting. Add them when the archive is too long to
scroll; about 30 packs at launch is not.

### `/pin/<id>`

One route for every pack, replacing `/pin/[date]` and `/pin/pack/[id]`. The
id must match `^[a-z0-9-]{1,40}$`, which also keeps it from being a path.
An unknown id is a 404. `?score=points` works as before.

Id patterns:

| Kind | Id | Example |
|---|---|---|
| `round` | `pl-<season>-<last match date>` | `pl-2026-27-2026-10-20` |
| `month` | `gotm-<yyyy>-<mm>` | `gotm-2026-09` |
| `season` | `gotm-winners-<season>` | `gotm-winners-2019-20` |
| `club` | `club-<slug>` | `club-arsenal` |
| `classic` | free | `world-cup-2022` |

The board id posted to `/api/pin/throw` is the plain pack id. The `pack:`
prefix goes. Nobody holds saved progress yet, so the localStorage key
`pin.progress.v1` stays and its entries are keyed by pack id.

### Full time

The streak goes. A **Next pack** link points at the next pack this browser
has not finished, in library order (This season first). The share text's
title is the pack title. The "More" block (earlier days, the packs) becomes a
single link back to `/pin`.

### Unchanged

The pitch, the magnifier, first throw counts, both scoring modes, par, and
coordinates never reaching the page.

## 2. Data

### Files, in `games/pin/data/`

- `goals.json`: every goal, keyed by slug, with its spot and xG. Read only by
  the server and the scripts. Unchanged shape (`Goal` in `lib/types.ts`).
- `packs/<id>.json`, one per pack:

  ```json
  {
    "id": "gotm-2026-09",
    "kind": "month",
    "title": "September's Goal of the Month",
    "subtitle": "Premier League 2026/27 · 8 goals",
    "season": "2026-27",
    "published": "2026-10-03",
    "goals": ["u-694512", "u-695943"]
  }
  ```

  `kind` is `round | month | season | club | classic`. `season` is required
  for `round`, `month` and `season`, and absent otherwise. `published` is a
  UTC date.
- `check.json`: the monthly model check, an array of
  `{ "month": "2026-09", "nominees": 8, "matched": 8, "inOurPicks": 4 }`.
  `inOurPicks` counts matched nominees that appear in any `round` pack whose
  matches fall in that month.

`packs.json` and `days.json` are deleted.

### Pack size and fairness

- Every pack holds 6 to 10 goals. (A season can have 10 monthly winners;
  official packs stay complete rather than drop a month.)
- `round` packs, which we pick, must be **fair**: par of at least 7 m × the
  number of goals (`PAR_PER_GOAL = 7`), at least one goal inside the area and
  one outside it.
- Official packs (`month`, `season`, `club`) are not checked for fairness.
  The official picks are the point. `classic` packs are hand-made and are
  checked for fairness, as the three existing ones already are.

### Matching an official goal to Understat

The GotM page and Wikipedia give a player and a match, not a minute or a
fixture id, and club names are written differently from Understat's. To
avoid a hand-kept table of club names (which would need upkeep every time a
club is promoted):

1. Take every EPL fixture Understat has in that calendar month of that season.
2. Normalise names: NFD, strip accents, lower case, drop punctuation.
3. Keep the non-penalty goals (`result === 'Goal'`, `situation !== 'Penalty'`)
   whose scorer matches the nominee: equal full names, or the nominee's last
   word equals the scorer's last word.
4. Exactly one such goal: matched. Several: keep those in fixtures where a
   word of the nominee's match text (normalised, three letters or more)
   appears in either team's normalised name. Still not exactly one: unmatched.

An unmatched goal is logged and skipped. A pack with fewer than 6 matched
goals is not written; the script logs it and exits 0, because a short month
is football's doing, not a broken source. The month is retried on the next
run (see section 3), so a nominee that was not matched yesterday is not a
hole for ever. The retry stops when the month is two months old.

### Scripts

All run unattended and are idempotent: a run with nothing new writes nothing.
Shared Understat code (the fetch with timeout, back-off and retry; league
data; match data; the score rebuild; own goals counting for the other side)
moves from `scripts/build-pin-week.ts` into `scripts/understat.ts`.

1. **`scripts/build-pin-round.ts`**: the round pack.
   - A round pack covers one **Tuesday to Monday** week of Premier League
     results, so Monday night games finish the weekend round in the same
     pack. A week with a midweek round draws from about 20 matches.
   - On a run, fetch the season's EPL league data (one request) and take every
     complete Tuesday–Monday window of the season that has results and no
     pack file. Match data is fetched only for those windows, so a normal
     day costs one request. The first run at launch therefore fills the
     season so far, and a week missed while the Action was down is made late
     rather than lost.
   - For each such week: fetch its EPL results, build candidates as now, rank with
     `rankRecent`, and take 6 with `pickRound`. A week with no EPL results
     (an international break) gets no pack and exits 0. A week with a fixture
     whose kick-off has passed but which Understat has not marked `isResult`
     yet is left for the next day's run (exit 0), so a late update never
     leaves a match out of a pack for good. After 3 days the fixture is taken
     as postponed and the pack is made without it.
   - Title: the dates of the first and last match ("18–20 October",
     "30 September – 6 October"). Subtitle: "Premier League 2026/27 · 6 goals".
     `published`: the Tuesday after the week, not the run date, so the
     launch fill does not show the whole season as New.
   - Lines from `recentLine`, as now.
   - A week where no fair 6 exists throws (exit 1). It should never happen
     with 10 or more matches to draw from, so it is worth a red run.
2. **`scripts/build-pin-gotm.ts`**: the month pack and the model check.
   - The month is the previous calendar month, plus the one before it while
     its pack is still missing (the retry above).
   - If its pack exists, exit before any network call. If the page is a 404
     or lists no nominees yet, exit 0.
   - Parse the nominees, match each (above), write the pack in the page's
     order, write the matched goals into `goals.json`, and append the month to
     `check.json`.
   - Title "September's Goal of the Month"; subtitle as above with the count.
3. **`scripts/import-pin-archive.ts`**: run once, by hand. One-off authoring
   is not upkeep.
   - Read the GotM winners from 2016/17 on from Wikipedia through the
     MediaWiki API (`action=parse`, the season tables).
   - Match each winner to Understat as above.
   - Write one `season` pack per season with 6 or more matched winners, and a
     `club` pack for each club with 6 or more matched winners (the 10 most
     recent if there are more).
   - Lines from `recentLine`. `published`: the run's date.
4. **Classics.** `scripts/fetch-pin-classics.ts` is unchanged. Of the 44
   classics, 18 are in the three existing packs. The other 26, the daily's old
   pool, go into new hand-made `classic` packs (Champions League finals, World
   Cups, Euros, as the goals allow), written once as pack files, each fair.
   More classics can be added through `classics.source.json` and the same
   script.

`npm run pin:update` runs `build-pin-round.ts` then `build-pin-gotm.ts`.

### Errors

- A source with nothing new yet (no games, no nominees, a 404 for a month not
  yet published): exit 0, write nothing.
- A source that has changed shape (a 200 page with no parsable nominees,
  Understat JSON missing its fields, Understat failing after its retries):
  exit 1. A broken scraper must turn the Action red, never fail silently.

### Licences

Unchanged: everything stays on this branch until Jonno has emailed StatsBomb
and Understat and registered with StatsBomb. Credits add the Premier League
(the shortlists) and Wikipedia (the winners list) alongside StatsBomb and
Understat.

## 3. Scheduling

**`.github/workflows/pin-packs.yml`**

- Triggers: `schedule` (cron `0 6 * * *`, daily at 06:00 UTC) and
  `workflow_dispatch`.
- `permissions: contents: write`, nothing more.
- Steps: checkout, Node 24, `npm ci`, `npm run pin:update`, `npm test`. If
  `git status --porcelain` shows changes and everything passed, commit as
  `github-actions[bot]` ("chore(pin): new packs") and push to `main`. The host
  redeploys from that push.

Why daily rather than on a calendar: both scripts work out which packs are
missing and fetch only for those. The round pack appears on Tuesday morning
and the other six runs that week cost one Understat request each; the
GotM nominees, published early in the month on no fixed day, are caught
within 24 hours; a failed run is retried by the next day's.

Cost: free. GitHub Actions includes 2,000 minutes a month on a private repo;
this uses well under 100.

Switched on at launch: scheduled workflows run only from the default branch,
so nothing fires while this lives on `feat/pitch-pin` or before a remote
exists. Merging to `main` is the switch.

The Action pushes to `main` on its own. Jonno's "ask before every push" rule
binds Claude, not the unattended robot; `npm test` guards every commit it
makes. (A PR-per-update alternative was considered and would put a merge on
Jonno every week, which is manual upkeep.)

What can be verified before launch: `npm run pin:update` against real data,
locally. The YAML itself first runs after the first push; that first run
should be a manual dispatch, watched.

## 4. What happens to the daily code

**Deleted**

- `games/pin/data/days.json`, `games/pin/data/packs.json` (moved into
  `packs/`).
- `app/pin/[date]/`, `app/pin/pack/[id]/`.
- `games/pin/lib/boards.ts` (`PIN_EPOCH`, `isDate`, `dailyPool`,
  `classicsFor`, `daySlugs`; `fair` moves to `round.ts`).
- `streakOf` in `games/pin/lib/progress.ts`.
- `scripts/build-pin-week.ts` (its Understat code moves to
  `scripts/understat.ts`).
- The 28 recent `u-*` goals in `goals.json` that only `days.json` used.
- Their tests: `boards.test.ts`, the `planWeek` and streak tests, the daily
  parts of `content.test.ts`, the date-id cases in `server.test.ts`.

**Reworked**

- `lib/week.ts` becomes `lib/round.ts`: `rankRecent` and `swapIn` stay;
  `planWeek` becomes `pickRound(ranked, n = 6)`, the top n with a later goal
  swapped in when the set is unfair, throwing when no fair set exists; `fair`
  and `PAR_PER_GOAL` live here.
- `lib/types.ts`: `Pack` gains `kind`, `subtitle`, `season?`, `published`.
  `BoardView` loses `date` and `number`.
- `server.ts` reads every `packs/*.json` once at module load (`readdirSync`,
  the pattern `src/server/board.ts` uses). `boardView(id)` looks a pack up by
  id; new `library(now)` returns the shelves with each pack's summary
  (id, kind, title, subtitle, size, par, new); `judge` and `parseThrow` are
  unchanged but for the lookup. `next.config.ts` adds
  `./games/pin/data/packs/*.json` to `outputFileTracingIncludes`.
- `progress.ts` gains `packStatus(play, n)`: not played, k of n, or finished
  with the distances.
- `app/pin/page.tsx` becomes the server library page, with a small client
  component for the statuses. `app/pin/[id]/page.tsx` is the pack page.
- `PitchPin.tsx` and `FullTime.tsx` lose the streak and the "More" block and
  gain the back link and Next pack.
- The home card's copy (old plan Task 13) changes from "Six goals a day" to
  the library: new packs every week, the Goal of the Month shortlist, the
  archive.

**Untouched:** `lib/pitch.ts`, `lib/score.ts`, `lib/line.ts`, the throw
route, `Pitch.tsx`, `pin.css`, `src/lib/daily.ts` (Chain's daily still uses
it), `fetch-pin-classics.ts`.

**The old plan** (`docs/superpowers/plans/2026-10-08-pitch-pin.md`): Tasks 1–12
are built. Tasks 13 (home card and credits), 14 (browser check) and 15 (docs)
are folded into the new plan with the changes above; the old plan is marked
so at the top.

## Testing

- `content.test.ts`, rewritten: every pack file parses; its id equals its
  filename; its `kind` is valid; `season` is present exactly when the kind
  needs it; it holds 6–10 distinct goals that all exist in `goals.json`;
  `round` and `classic` packs are fair; every goal in `goals.json` is in at
  least one pack.
- `round.test.ts`: `rankRecent` as before; `pickRound` takes the top 6, swaps
  for fairness, throws when nothing is fair; `fair` scales with pack size.
- Week windows: the latest complete Tuesday–Monday window for a given date,
  and the title formatting, as pure functions with tests.
- GotM: the nominee parser against a saved copy of the September 2026 page
  (a fixture in `games/pin/tests/fixtures/`), and the matcher against saved
  Understat match data, covering a unique match, a player with two goals in
  one match (unmatched), and two fixtures disambiguated by team name.
- Archive: the Wikipedia table parser against a saved API response.
- `server.test.ts`: pack ids resolve, unknown and malformed ids are null,
  `library()` shelves and New are right for a fixed date, the page HTML
  carries no coordinates.
- `progress.test.ts`: `packStatus` for each state.
- No test makes a network call. Real-boundary checks are run by hand during
  implementation and their output recorded: `npm run pin:update` on real
  data, the archive import, and a browser pass at phone width (library to
  full time, no console errors, no coordinates in the page HTML).

## Out of scope

- Filters, search or sorting on the library.
- Matchweek numbers (Understat has none; a second source is not worth it).
- Weekly packs from leagues other than the Premier League.
- Accounts or cross-device progress.
- The GitHub remote itself, and pushing (Jonno's call, asked before each push).

## Execution

The implementation plan is written code-complete so a fresh Sonnet session
can execute it with `superpowers:executing-plans` after a `/clear`, inline,
no per-task subagents. The real-data tasks (the GotM scraper, name matching,
the archive import) each end with an exact real-run check whose output must be
shown before the task is committed.
