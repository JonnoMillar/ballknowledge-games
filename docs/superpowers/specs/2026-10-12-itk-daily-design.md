# ITK: the generator and the daily — design

**Date:** 2026-10-12
**Status:** Draft, awaiting Jonno's approval. Branch `feat/itk-ship`.
**Game rules, playtest history and the do-not-re-litigate list:** `games/itk/HANDOFF.md`.
This spec turns the v5 prototype into a daily that refreshes itself with no
manual step. It does not change how a round plays or how the end screen looks.

## Decisions carried in (2026-10-12)

- **Known-club rule: by country.** A club is known if it has ≥300k enwiki views
  and is in England/UK, Spain, Italy, Germany, France, Monaco, the Netherlands or
  Portugal; or it passes the old rule (≥300k views and ≥30% of its pool players
  also played in the PL); or it has ≥2M views. At most one unknown stop per
  career. Measured: 233 eligible players. The handoff's alternative (PL share
  0.15, "huge" at 1M) was rejected: it calls Mohun Bagan (0% PL share), Club
  América, Pachuca, Santos and Mumbai City known.
- **Player floor stays 500k views** (Adam at 335k was rejected as unknown).
  **First stop ≥2000** (was 2004); median stop ≥2008 and last stop ≥2015 stand.
  **Up to 9 stops** (the phone layout).
- **Built on the v5 rules** without a v5 playtest. Every threshold below is a
  named constant, so a playtest after launch changes a number, not the design.
- **No pattern honours** at launch.
- **Name:** "ITK" stays the working name in code and on the page until Jonno
  picks one; renaming is one string in a handful of places plus the route.

## 1. How the daily refreshes: a committed schedule, topped up by a cron

`games/itk/data/days.json` holds the schedule: one entry per date, each with five
rounds (player, stops, the fake's index, the real club it covered). The server
reads it; it never reaches the browser.

`scripts/itk/build-days.ts` (`npm run itk:days`) extends it. If fewer than
**14** days lie ahead of today (UTC), it generates days up to **28** ahead,
appends them, and writes the file. A GitHub Actions workflow,
`.github/workflows/itk-days.yml`, runs it daily at 05:00 UTC, runs `npm test`,
and commits the file to `main` if it changed; the push deploys on Vercel. This
is the Pitch pin pattern (`pin-packs.yml`), which already works. In practice it
commits about once a fortnight.

Why this and not a pure function of the date:

- **Past days are frozen.** Jonno will retune the rules after playing. With a
  pure function, every rule change rewrites every past and current day, including
  one somebody is halfway through. With a schedule, a change only reaches days
  not yet written.
- **Reuse needs history.** "Not seen for N days" and "never the same fake for the
  same player" are reads of the schedule, not a recomputation from day 1 on
  every server start.
- **The upcoming days can be read.** Jonno can open the file (or the generator's
  printout) and see the next fortnight before anyone plays it.
- **A broken cron does not break the game.** There are always 14 or more days in
  hand; a failing workflow shows as a red run on GitHub long before players notice.

**Deterministic.** Each day's random choices are seeded from its date, and the
generator reads only committed files (no network). The same schedule and the same
data always give the same next day. A test holds this.

**Day 1** is `ITK_EPOCH`, set to the launch date at merge. `ITK #n` is the day
number (`dayNumber(date, ITK_EPOCH)` from `src/lib/daily.ts`).

## 2. Who can appear (eligibility)

The v5 picker's rules (`scripts/itk/pick-examples.mjs`), rewritten as tested
functions in `games/itk/lib/`:

- **The trail.** Senior spells only (reserve and B sides dropped by the same
  regex), a loan's parent club shown even with no games, a loan return shown
  when the parent spell runs on past the loan, consecutive spells at one club
  merged. 4–9 stops, every stop with a crest. No club in the pool record that the
  career does not explain.
- **Fame.** English Wikipedia views over 24 months (`enwiki-views.json`),
  500k to 5M. Above 5M (four players) is too easy.
- **Era.** First stop ≥2000, median ≥2008, last ≥2015.
- **Known clubs.** The country rule above, at most one unknown stop.
- **Photo.** A player needs a resolved portrait (`data/portraits.json`), so the
  photo guard knows which spell the picture is from. `none` (silhouette) is fine
  and needs no guard. The guard reads the year of the photo production shows: a
  Commons portrait's `year`, or a cutout's `alt.year`. The prototype fetched
  Commons metadata at pick time; the generator does no network calls.
- **Name.** Displayed from the enwiki title, not the Wikidata label.

Club countries come from Wikidata `P17`, fetched once for every club with ≥300k
views by `scripts/itk/fetch-club-countries.ts` into
`games/itk/data/club-countries.json`, committed. (Checked 2026-10-12: one query
covers all 446 such clubs.)

## 3. The fake (unchanged from v5, with one fix)

Swap a real stop or insert a move that never happened; the player is not told
which. The candidates and guards are v5's:

- Never swap the signature club (most apps), a club with ≥8M views, a spell of
  50+ games, or the spell the photo is from.
- A fake is known, not a giant (top 25 clubs by views), not bigger than the
  career's median club, within 3× the views of the club it replaces, has 8+
  pool players, and is not a club the player ever played for.
- **It fits the era:** ≥4 pool players started there within ±2 years.
- **It fits the path:** real players moved between it and the neighbouring
  clubs at least twice (the transfer-flow score), at a similar level.
- The kinds: `loan`, `mid`, `late`, `return` (a club he had twice, or a loan
  return) and `insert`. The best-scoring candidate of each kind is kept.
- **The fix:** v5 refused to *insert* between two ≥8M clubs but would still
  *swap* the stop between them. The handoff's rule is "never put the fake between
  two marquee moves", so the swap gets the same guard.

## 4. A day

Five careers, ordered easy to hard by v5's difficulty score (fame first, then
how hidden the fake is: insert, loan or return, journeyman, a fake both
neighbours lead to).

- **Fame bands, sized to the pool.** The eligible players are ranked by views
  and split 20 / 40 / 40%. A day takes 1 from the top band, 2 from the middle
  and 2 from the bottom, so every band runs through its players in about
  pool ÷ 5 days (≈46 at 233 players). Fixed view boundaries cannot do this:
  the 2–5M band holds 36 players and would come round every 36 days.
- **Who next.** Within a band, the player seen longest ago (never seen first),
  ties broken by the day's seed. A player whose every fake option is spent, or
  who cannot fit the day's mix, is skipped for that day.
- **Within the day:** five different fake kinds where possible (at least one
  insert); a short career (≤5 stops) is offered an insert first 60% of the time,
  never always; at least one journeyman (≥7 stops); no fake club twice.
- **Across days:** a club is not used as a fake again within 7 days.
- The playtest exclusion list (`PLAYED`) is dropped: it existed to keep Jonno's
  playtests fresh.

## 5. Reuse

A player returns, with a different fake, once his band comes round again
(≈46 days). Hard floor: never within **36** days (80% of pool ÷ 5), checked by a
test over a year of generated days. **Never the same fake club for the same
player**, ever: the generator reads every earlier appearance. A player with no
unused fake left drops out of the rotation; the test reports how many days a
year of schedule supports before any band runs dry.

## 6. The page and the API

- `/itk` renders the shell. The client works out the player's local date (the
  way Chain does) and fetches `GET /api/itk/day?date=YYYY-MM-DD`, which returns
  the five rounds without the answer. The route refuses a malformed date, a date
  before the epoch, a date after UTC today + 1 (no peeking ahead; +1 covers time
  zones east of UTC), and a date not in the schedule.
- `POST /api/itk/pick` takes `{ date, round, index, last }` and judges as today.
  The judge is stateless, as Chain's seal is: there is no leaderboard to protect.
- **One play a day.** Picks are saved to `localStorage` (`itk.progress.v1`)
  after each pick, so a reload resumes the round and cannot re-pick. Coming back
  after finishing shows the end screen. "Play again" goes; a daily cannot be
  replayed blind. The share line uses the real day number.
- The rounds review (tap a career on the end screen) stays.

## 7. Ship prep

- Remove the prototype tooling: set switcher, feedback strip
  (`Feedback.tsx`, `itk.feedback.v1`), result picker, "End screen" jump, the
  "Prototype" pill, `content/itk/examples.json`, `pick-examples.mjs`,
  `pool-funnel.mjs` (both superseded by `games/itk/lib`; git keeps them).
- Recheck the end screen at 375×812 once the bars are gone.
- Fix the vandalised label "Andrcu Onana" in `src/pipeline/overrides.ts` and
  `data/pool.json`.
- Portraits: `fetch-portraits.ts` also resolves every eligible ITK player
  (`--itk`), then `fetch:credits` reruns.

## 8. Layout

Per `CLAUDE.md`: `games/itk/` holds `lib/`, `components/`, `tests/`, `data/`
(`days.json`, `club-countries.json`, the enwiki views moved from `data/itk/`),
`server.ts`, `itk.css`, `HANDOFF.md`. `app/itk/page.tsx` and
`app/api/itk/{day,pick}/route.ts` are thin shells. New code is written there from
the start; the prototype files move in during ship prep. Scripts stay in
`scripts/itk/`. A card in `src/games.ts`; a row in the root `HANDOFF.md`.

## Known limits (not in this ship)

- **Careers are a snapshot** (fetched 2026-09-20, after the summer window). After
  the January window some careers will be missing their latest move. The fix is
  the cron refreshing careers for the ~233 eligible players before generating.
  Recommended as the first follow-up, before February 2027.
- **Views are a snapshot** (Oct 2023 – Sep 2025). Fame drifts slowly; a yearly
  refresh in the same cron would keep it honest.
- No streak, no archive of past days, no honours.
