# Daily run: spec

Written 2026-11-12. Part 2 of Jonno's daily-run brief; the research it
stands on is `docs/daily-run-research.md` (Part 1). **Nothing here is built.**
This records proposals and the decisions Jonno needs to make; the open
questions are at the end.

**The idea (Jonno, 2026-11-12):** every daily game played in one go, each
shortened and framed as a scout's task, one overall result at the end. The
individual dailies stay playable afterwards. It opens from the centre slot
of the new hub, "Today's assignment", a manila dossier on the cork board
(`design-drafts/brand-concepts/bible.html`). Only that slot is locked; the
rules below can change after the lobby rebake.

## At a glance

- **Six tasks, about 6 to 7 minutes**, in a fixed order: Check the rumours
  (Spoofed), Trace the link (Steps), Log the shot (Pitch pin), Find the mole
  (Odd Man Out), Line them up (Sorted), Read the season (Season line).
- **Phase 1 ships four** (the four that already have the content): about 5
  minutes. Find the mole needs a solo mode; Sorted needs to merge first.
- **Result:** one word on the site's existing scale ("Ball knowledge:
  Sharp"), one mark per task, then the player's best moment of the run, named
  with its fact. No numbers on screen, never "N of M".
- **Comparison with today's players** comes later (it needs a result store),
  overall only, from 100 plays, with a number only for the top half.
- **Streak:** days with a finished run, with an earned rest day.
- **Content:** where a daily is a sequence (Spoofed, Steps, Sorted), the run
  plays its first part and the daily carries on from there. Where a daily is
  one puzzle (Season line) or there is no daily (Pitch pin, Odd Man Out), the
  run has its own.

---

## 1. Which games, in what order, and why

| # | Task | Game | Verb | Input |
|---|---|---|---|---|
| 1 | Check the rumours | Spoofed | spot the liar | tap |
| 2 | Trace the link | Steps | recall a set | type and search |
| 3 | Log the shot | Pitch pin | place | pin and throw |
| 4 | Find the mole | Odd Man Out (solo) | spot the liar | tap |
| 5 | Line them up | Sorted (The Tunnel) | order | drag or tap to swap |
| 6 | Read the season | Season line | identify a shape | choose club and season |

**In:** every game with a daily or daily-able content. **Out:** Rondo
(multiplayer), Chain's own puzzle (see open question 2: it is a 2-minute
held-or-not board; Steps carries Chain's verb in a fraction of the time).

**Why this order:**
1. **Open on the quickest win.** Spoofed is tap only and understood in a
   glance: competence in the first 30 seconds, no typing.
2. **Hardest recall second,** while the player is fresh: Steps is the only
   task that needs a name from memory.
3. **A breather third.** Pitch pin is physical, needs no recall, and always
   scores something.
4. **The second spot-the-liar fourth,** two tasks away from the first, on
   different content (a team sheet, not a career).
5. **Ordering fifth,** a different hand action (drag).
6. **A story to close.** Season line's line draws in and the reveal names
   the season and its champion: a narrative close. It has partial credit
   (the club right, the season wrong), so a miss is rarely total.

Inputs alternate (tap, type, place, tap, drag, choose), so no two tasks in a
row feel the same. The order is fixed every day: ritual needs sameness
(research Q4).

The peak-end rule (research Q4) is handled by the end screen, not the task
order: the report ends on the player's best moment, whatever the last task
was.

**Phase 1 order** (four tasks): Check the rumours, Trace the link, Log the
shot, Read the season.

---

## 2. The cut-down round for each game

Every task header is the task name as an eyebrow and one plain rule line,
on the live task (no separate intro screen). Untimed, as every solo game
here is.

| Task | Full daily today | Run round | Rule line | Time |
|---|---|---|---|---|
| Check the rumours | 5 careers, 2 picks each | Careers 1 and 2 of today's Spoofed daily (the ramp's easier end), 2 picks each, same peel reveal | "One move in each career never happened. Find it." | ~50 s |
| Trace the link | 4 steps, one shot each | Steps 1 and 2 of today's Steps daily, one shot each, a shorter reveal (below) | "Name a player who fits the gap." | ~70 s |
| Log the shot | No daily; packs of 6 to 9 | 3 goals from the run's own daily set, one throw each, 0 to 100 a goal as now | "Pin where each goal was struck from." | ~45 s |
| Find the mole | Pub game, no solo mode | One real XI from a real match with one player planted by the generator; up to 2 taps | "One name in this XI didn't start. Find it." | ~40 s |
| Line them up | 6 categories on 5 players | Categories 1 and 2 (age, height) of today's Sorted daily | "Put them in order." (category as the headline) | ~60 s |
| Read the season | 5 guesses, line grows by fifths | The run's own board: line starts at 15 games, 3 guesses (15, 23, 30 games), club and season guessed together, hints as now (nearest rival after miss 1, a squad player after miss 2) | "Name the club and the season." | ~75 s |

**Total:** tasks ~340 s, moves between tasks ~5 s each (30 s), the report
~30 s: **about 6 m 40 s.** Phase 1: ~240 s + 20 s + 30 s, **about 4 m 50 s.**
Estimates are from the games' current shapes, not measured: time a real run
at the playable-draft gate and cut first where it runs long (Steps or Season
line).

**Notes per task**
- **Season line, 3 guesses:** this also fixes the game's open risk (up/down
  arrows bisect 26 seasons in five guesses). Three arrows split 26 seasons
  only to about 3, so the line has to be read.
- **Steps' reveal:** the full show is ~4.1 s at Elite. In the run, cap it
  (`RUN_REVEAL_MS`, proposed 2 s) by dropping the push-in and keeping the
  cases and the develop. Jonno's call: he tuned that motion.
- **Find the mole:** the fake must follow Spoofed's fairness rules (same
  era, plausible club or nation, never famous enough to be a tell) and Odd
  Man Out's leak rules (names only: no number, flag, portrait or captain
  mark).
- **Line them up:** age and height are complete in the data (1,545 and
  1,560 of 1,562 candidates); the FIFA and Instagram categories, the supply
  problem on the Sorted branch, are not needed for the run.
- Between tasks, the finished task sheet slides into the dossier and the
  next slides out (no teleports; staged, ~800 ms). The reveal of each task
  ends with the one red button, "Next: Log the shot", so the player reads the
  truth at their own pace.

---

## 3. The scoring model

### Task score, 0 to 100

Each game's result maps to one task score *s*. The mapping lives in that
game's run module, since only it knows its result.

| Task | Mapping | Laziest play, expected |
|---|---|---|
| Check the rumours | *s* = 25 × points, points 0 to 4 (2/1/0 a career, Spoofed's own) | Random taps on ~6 stops: 0.5 a career, *s* ≈ 25 |
| Trace the link | Per step: miss 0, Basic 40, Decent 55, Solid 70, Sharp 85, Elite 100; *s* = mean of the two | The most famous answer, usually Basic: *s* ≈ 40 |
| Log the shot | *s* = floor(mean of the three goals' points) | Pin on the spot: ~37 (Pitch pin's measured lazy median) |
| Find the mole | First tap 100, second tap 50, else 0 | Random: 1/11 × 100 + 10/11 × 1/10 × 50 ≈ 14 |
| Line them up | Per category: *c* = max(0, pairs right − 5) × 20, pairs out of 10; *s* = mean | Random order averages 5 pairs: *s* ≈ 0 (a little above, from spread) |
| Read the season | Solved on guess 1, 2, 3: 100, 75, 50; club right but season not: 25; else 0 | A guess at a famous champion: low, ~10 |

Why these: a hold in Steps is the achievement, so any held pick is worth
most of the task and depth adds the rest. Sorted's raw pairs reward random
order with half marks, so chance is subtracted. Spoofed and Pitch pin keep
their own numbers.

### Run score and verdict

The run score *R* = floor(mean of *s* over the tasks in today's run). Equal
weights: simple to explain, and calibration (below) makes each task worth the
same to a decent fan.

| Verdict | *R* (proposed; set by simulation) |
|---|---|
| Basic | 0 to 39 |
| Decent | 40 to 54 |
| Solid | 55 to 69 |
| Sharp | 70 to 84 |
| Elite | 85 to 100 |

The words are the site's existing scale (Steps, the grades key), so no new
scale and no rename (open question 1 has the alternatives). The laziest run
above averages about 22 (Basic).

**Calibration, before launch** (the Pitch pin method): a script plays every
upcoming day as lazy, casual, decent and expert strategies, 200 runs each.
Accept when the laziest median is under 40 and its maximum under 55 (floored
*R*, so lazy play never reaches Solid), and a decent fan lands Solid on most
days. Every number above is a named constant (`TASK_MAP`, `BANDS`,
`RUN_REVEAL_MS`) so a playtest moves one number.

### Task marks

| Mark | *s* | On screen | In the share line |
|---|---|---|---|
| Clean | 80 to 100 | solid ink disc, white tick | ✅ |
| Partial | 40 to 79 | half-filled disc | 🔸 |
| Miss | 0 to 39 | hollow ring, cross | ❌ |

Each mark differs by shape and lightness, never by hue alone (Jonno is
colour-blind). The marks are not counted anywhere: no "4 of 6".

### Comparison with today's players (phase 3)

Only overall, never per task. Shown as a second layer under the verdict.

- **Curve:** a smoothed histogram of today's real *R* values (21 bins,
  kernel-smoothed), the player's mark on it, no y-axis numbers. Never a
  fitted normal curve.
- **Open when** today has at least `CURVE_MIN` = 100 reports. Under that,
  the last 7 days pooled, labelled "this week", if they reach 100. Under
  that, nothing.
- **The number,** only for the top half: "Ahead of X% of today's scouts",
  X = 100 × (count below *R* + ½ count equal to *R*) / *n*, rounded down,
  shown only when X ≥ 50. Anyone on today's top score sees "Joint best
  today" instead.
- **Below the top half:** the curve and the mark with no number, plus the
  player's own record ("Your best this month: Sharp").
- **Per task, later:** facts, not ranks. "12% of today's scouts spotted this
  spoof first time." "4% named Bogarde."

Why: research Q2 (rank feedback lowers effort for low performers; a
percentile under 100 plays is off by 10+ points; ties at the top read as a
loss).

---

## 4. The end screen, and the peak

The report runs in stages, one at a time (lessons 1.7), on one laptop
screen at 1366×768.

1. **The dossier closes** (~800 ms): the last task sheet slides in on top of
   the others.
2. **The marks** tick in down the task list, 100 ms apart, each with its
   task name: the report card.
3. **The verdict** lands alone and large: eyebrow "Ball knowledge", the word
   in Big Shoulders, in its grade's material (the Steps case textures, Basic
   to Elite), so it reads as the same scale.
4. **The find (the peak):** one card, the player's best moment today, said
   in one line with its fact. Then everything else fades in beneath.
5. **The rest:** the curve (when open), the streak, the countdown to
   tomorrow's assignment, **Share** (the one red button), Back to the board
   (plain).

**The find.** The candidate with the highest task score, ties broken by this
order:
1. A Steps pick graded Sharp or Elite: "Elite find: Bogarde at Chelsea".
2. Read the season on guess 1: "Read it from 15 games: Leicester 15/16".
3. A bullseye (2 m): "Bullseye: Saka v Spurs, 1.4 m".
4. A spoof spotted first time, on the longer career: "Spotted first time"
   with the fake club's crest.
5. The mole on the first tap; a perfect line in Sorted.

With no find, the best task is named plainly ("Best work: Log the shot").
Every find is checkable from data the game already holds. Once the store
exists, the find adds its rarity among today's players.

**Why the find comes after the verdict:** the peak-end rule. The verdict can
be low; the find is always the best thing that happened. Ending there means
every run ends on its high point, truthfully (research Q4).

**Hub dossier states** (lessons 1.1): never played (the dossier, "Today's
assignment", red Open); not started (date stamped); part played (tasks
ticked so far, Continue); done (the verdict word and marks on the dossier,
the countdown, no red; the hub's suggestion moves to the unfinished
dailies).

---

## 5. The share card

```
Today's assignment #55
Ball knowledge: Sharp
✅✅🔸✅❌✅
🔥 12
ballknowledge-games.vercel.app
```

- No names, no clubs, no positions: spoiler-free (research Q1).
- One glyph per task in the fixed order, so mates read it the same way.
- "· ahead of 81%" is added to the verdict line only when the player is shown
  that number (top half, curve open). Nobody's share carries a low rank.
- The day number is the shared one from `EPOCH` 2026-09-19 (lessons 2.6), so
  the run's number matches every game's.
- The streak only when it is 2 or more.
- An archive run shares as "Assignment #41".
- The glyphs differ by shape (tick, diamond, cross), not hue. **Flag,
  separate from this branch:** Spoofed's and Chain's share lines use 🟩🟨🟥,
  which differ by hue alone; worth fixing site-wide.

---

## 6. Streaks

- **The run streak counts days with a finished run** on the player's own
  date, whatever the verdict. A bad day never breaks it: research Q4, a
  performance streak punishes, a completion streak builds the ritual.
- **Rest days:** one is banked for every 7 days in a row played, at most 2
  banked, spent automatically on a missed day. Earned, never bought. A day
  covered shows as a hollow mark in the streak row. (Duolingo's freezes raised
  daily learners without more days off; one missed day does not break a
  habit.)
- **Best streak beside current**, so a lost streak does not erase the record.
- **Archive runs** never count, and never feed the curve.
- **No notifications.** Nothing reminds, nags or guilts.
- **The hub's streak** becomes the run streak once the run ships. Chain's
  own streak (consecutive dailies held) stays on `/chain` unchanged.

---

## 7. How the run touches each game's daily

| Game | Run uses | Effect on that game's daily |
|---|---|---|
| Spoofed | Careers 1 and 2 of today's daily | Picks are written to `spoofed.progress.v1`; the daily resumes at career 3 ("3 careers left"). Done only when all 5 are. |
| Steps | Steps 1 and 2 of today's daily | Written to `step.progress.v2`; the daily resumes at step 3. |
| Sorted | Categories 1 and 2 of today's daily | Written to its progress; resumes at category 3. |
| Season line | Its own board (a different club-season from today's daily) | None: today's daily stays unspoiled. |
| Pitch pin | Its own 3 goals a day | None (no daily). |
| Odd Man Out | Its own XI a day, solo | None (the pub game is separate). |

- **Already played the slice?** If the player did Spoofed's careers 1 and 2
  before the run, the run shows that task as filed with its marks and moves
  on. Same content, same result: nothing to replay.
- **Done state:** the run marks `run` done in `src/lib/today.ts`. A game's
  own daily is marked done only when it is finished in full.
- **Why this hybrid:** one pipeline per game where the daily is a sequence
  (no duplicate generation, no spoiled daily, the run is a fast lane into
  each daily); own content only where sharing would spoil a single puzzle or
  there is no daily to share. Options in open question 3.

---

## 8. What each game needs built

**Architecture.** The run composes games, and `CLAUDE.md` says games never
import each other and shared code never imports a game. So:
- `src/lib/run/` (shared): the task result type (`TaskResult`: task, *s*,
  mark, find, detail), the run score, bands, marks, the share line, the
  streak, `run.progress.v1`. Pure, tested.
- `games/<name>/run/` (each game): a `RunTask` component and its mapping to
  `TaskResult`, importing only shared code.
- `app/run/page.tsx` and `app/api/run/day`: the route assembles the tasks
  and each game's server slice. A route is neither a game nor shared code,
  so the rule holds. The run is a page, not a game folder.

| Piece | Work | Size |
|---|---|---|
| **Shared run shell** | `/run` route, dossier frame, task header, staged moves between tasks, resume at the first open task on reload, the report (marks, verdict, find, streak, share, countdown), archive (`/run?date=`), hub dossier states, `markDone('run')`, `syncHub` | Large |
| **Scoring and calibration** | `src/lib/run` maths with tests; a simulation script per task (lazy, casual, decent, expert) that sets `BANDS`; a test that the laziest run stays under 40 | Medium |
| Spoofed | `RunTask` over careers 1 and 2 (the trail and peel exist); write picks to its progress | Small |
| Steps | `RunTask` over steps 1 and 2; the capped reveal; write to its progress | Small to medium |
| Pitch pin | A run schedule (3 goals a day from the library: round packs and classics, never three from one match, the fairness test the round packs use), its cron, `RunTask` on the existing throw | Medium |
| Season line | A run schedule (a board a day, never today's daily club-season, no repeat within a gap), its cron, `RunTask` with 3 guesses from 15 games; reset `EPOCH` before launch (already on its list) | Medium |
| Odd Man Out | **A solo mode:** a generator that plants a believable fake in a real XI (era, club or nation, position; Spoofed's fairness guards), a schedule and cron, a `problems()` check, `RunTask` with up to 2 taps; a playtest | Large |
| Sorted | Merge first (draft branch); then `RunTask` over categories 1 and 2 | Medium, blocked |
| **Result store** (phase 3) | `POST /api/run/report` (date, *R*, marks, a random device id kept locally; first finished run per device per day; never archive runs), `GET /api/run/curve` (binned, *n*); free-tier store from the Vercel Marketplace. **Needs Jonno's OK before adding** (a new service, even on a free tier). No personal data. Accept some noise from cleared browsers. | Medium |

**Phases**
1. **Run v1:** shell, scoring, Spoofed, Steps, Pitch pin, Season line. No
   server store. About 5 minutes.
2. **Six tasks:** Odd Man Out solo, Sorted once merged.
3. **The curve:** the store, "Ahead of X%", per-task facts and rarity in the
   find.

Gate per phase as for a new game: data check, playable draft (time a real
run), a review of generated days; HANDOFF, commit, check in with Jonno.

---

## 9. Open questions for Jonno

1. **The result's words.**
   - (a) **The site scale:** Basic, Decent, Solid, Sharp, Elite, shown as
     "Ball knowledge: Sharp". One scale site-wide, no rename, the grade
     materials already exist. *Recommended.*
   - (b) Scout's recommendation words: Monitor, Track, Shortlist, Recommend,
     Sign. Strong scout flavour, but a second five-word scale on the same
     ruler (lessons 2.3: two scales confuse), and "Sign" reads oddly about
     yourself.
   - (c) Scout ranks: Trialist, Scout, Senior, Chief, Director. Clashes with
     Spoofed's "Scout" rank.
2. **Chain's puzzle in the run?**
   - (a) No: Steps is "Trace the link"; the puzzle stays its own daily.
     *Recommended.*
   - (b) The puzzle replaces Steps: Chain's own board, held or not, ~2 min.
   - (c) Both: over 8 minutes.
3. **Does the run share content with the dailies?**
   - (a) **Hybrid** (section 7). *Recommended.*
   - (b) Own content for every task: run and dailies fully apart; more
     generation, and players who do both see more of the same game.
   - (c) The run *is* the day's slice and marks each daily done: the full
     dailies stop being worth playing after it.
4. **Comparison with today's players.**
   - (a) Phase 3: grade first; curve from 100 plays; number for the top half
     only. *Recommended.*
   - (b) Never: grade and own record only, no store.
   - (c) Krillion's way: a number for everyone, from day one.
5. **Streak.**
   - (a) Completion streak with earned rest days (one per 7, at most 2).
     *Recommended.*
   - (b) Strict: miss a day, back to zero.
   - (c) No streak: best verdicts and the record only.
6. **Find the mole.**
   - (a) Build the solo planted-XI mode in phase 2. *Recommended.*
   - (b) Leave it out of the run (five tasks).
   - (c) Put a different short task in its slot.
7. **Read the season's round.**
   - (a) 3 guesses from 15 games. *Recommended.*
   - (b) 2 guesses from 23 games: shorter, harder to read the shape wrong.
   - (c) One guess at the club, the season shown after: quickest, least
     satisfying.
8. **The result store (phase 3):** a free-tier store from the Vercel
   Marketplace: (a) yes, when phase 3 starts; (b) not until the run has
   traffic to justify it; (c) never (same as 4b).
9. **Task names:** keep the working names (Check the rumours, Trace the
   link, Log the shot, Find the mole, Line them up, Read the season)? They
   fit the scout frame and avoid Krillion's words. (a) Keep. (b) Shorter,
   one word each (Rumours, Link, Shot, Mole, Lineup, Season). (c) Rename
   later with the brand.

Also needs a ruling before phase 2: The Tunnel or Sorted on the board's
label (already open in `bible.html`).
