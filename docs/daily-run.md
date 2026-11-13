# Daily run: spec

Written 2026-11-12; revised the same day with Jonno's answers (section 9).
Part 2 of Jonno's daily-run brief; the research it stands on is
`docs/daily-run-research.md` (Part 1). **Nothing here is built.**

**The idea (Jonno, 2026-11-12):** every daily game played in one go, each
shortened and framed as a scout's task, one overall result at the end. The
individual dailies stay playable afterwards. It opens from the centre slot
of the new hub, "Today's assignment", a manila dossier on the cork board
(`design-drafts/brand-concepts/bible.html`). Only that slot is locked.

## At a glance

- **Six tasks, about 6 minutes, never more than 8** (the clocks cap it), in a fixed order: Check the
  rumours (Spoofed), Trace the link (Steps), Log the shot (Pitch pin), Find
  the mole (Odd Man Out), Line them up (Pecking Order), Read the season (Season
  line).
- **Timed in the run, untimed alone.** Each task has a clock that caps it;
  time never scores. Played individually, every game stays untimed.
- **Phase 1 ships four** (the four that already have the content). Find the
  mole needs a solo mode; Pecking Order needs to merge first.
- **Result: an exact score with no visible ceiling, beside its band word.**
  Jonno wants a score that is not read against 1 to 10 or 1 to 100, so a bad
  day does not look bad. Proposed: a transfer valuation, "Sharp · £37.0m"
  (to confirm). One mark per task, then the player's best moment of the run,
  named with its fact.
- **"Top X%"** from day one, on our own scale's curve (a normal distribution),
  switching to today's real players at 100 plays. Shown to the top half only.
- **Streak:** days with a finished run, with earned rest days.
- **Content:** where a daily is a sequence (Spoofed, Steps, Pecking Order), the
  run plays its first part and the daily carries on. Where it is one puzzle
  (Season line) or there is no daily (Pitch pin, Odd Man Out), the run has its
  own.

---

## 1. Which games, in what order, and why

| # | Task | Game | Verb | Input |
|---|---|---|---|---|
| 1 | Check the rumours | Spoofed | spot the liar | tap |
| 2 | Trace the link | Steps | recall a set | type and search |
| 3 | Log the shot | Pitch pin | place | pin and throw |
| 4 | Find the mole | Odd Man Out (solo) | spot the liar | tap |
| 5 | Line them up | Pecking Order | order | drag or tap to swap |
| 6 | Read the season | Season line | identify a shape | choose |

**In:** every game with a daily or daily-able content. **Out:** Rondo
(multiplayer) and Chain's own puzzle (Jonno, 2026-11-12: Steps is "Trace the
link"; the puzzle stays its own daily).

**Why this order:**
1. **Open on the quickest win.** Spoofed is tap only and understood in a
   glance.
2. **Hardest recall second,** while fresh: Steps is the only task that needs
   a name from memory.
3. **A breather third.** Pitch pin needs no recall and always scores.
4. **The second spot-the-liar fourth,** two tasks from the first, on a team
   sheet, not a career.
5. **Ordering fifth,** a different hand action.
6. **A story to close.** Season line's reveal names the club, the season
   and its champion.

Inputs alternate, so no two tasks in a row feel the same. The order is fixed
every day (ritual needs sameness, research Q4). The peak-end rule is handled
by the end screen: the report ends on the player's best moment.

**Phase 1 order:** Check the rumours, Trace the link, Log the shot, Read the
season.

**Task names are config, not content** (Jonno: easy to edit, baked in
nowhere). They live in one constant (`RUN_TASKS` in `src/lib/run/tasks.ts`:
id, name, rule line, clock) and every screen and the share line read it.
**Flag for the hub art:** `bible.html` has the dossier showing "a typed
checklist of the day's tasks". It must not be generated into the image;
generate the dossier blank and set the checklist in real type, or the names
are baked in.

---

## 2. The cut-down round for each game

Each task's header is its name as an eyebrow and one plain rule line, on the
live task (no separate intro screen).

### Clocks (Jonno, 2026-11-12: time limits in the run, none alone)

- A clock per item, shown as a draining ink bar under the header (not red:
  red is the brand and the action). When it runs out the item locks with what
  the player has (nothing entered is a miss for that item).
- **Time never scores.** No speed points, no bonus for time left. Speed
  points would reward fast typing over knowing players; the clock's jobs are
  tension and a hard cap on the run's length.
- Archive runs are timed too. Each game played on its own is untimed, as now.
- Clock values are named constants in `RUN_TASKS`; the numbers below are
  first guesses, tuned at the playtest. The playbook's "solo is untimed" rule
  still holds for every game outside the run.

| Task | Run round | Rule line | Clock | Typical | Max |
|---|---|---|---|---|---|
| Check the rumours | Careers 1 and 2 of today's Spoofed daily, 2 picks each, same peel reveal | "One move in each career never happened. Find it." | 30 s a career | ~50 s | 60 s |
| Trace the link | Steps 1 and 2 of today's Steps daily, one shot each, reveal capped at `RUN_REVEAL_MS` (2 s) | "Name a player who fits the gap." | 45 s a step | ~70 s | 90 s |
| Log the shot | 3 goals from the run's own daily set, one throw each | "Pin where each goal was struck from." | 20 s a goal | ~45 s | 60 s |
| Find the mole | One real XI with one name planted by the generator; up to 2 taps | "One name in this XI didn't start. Find it." | 40 s | ~35 s | 40 s |
| Line them up | Categories 1 and 2 (age, height) of today's Pecking Order daily | "Put them in order." | 30 s a category | ~55 s | 60 s |
| Read the season | The run's own board, reshaped (below) | "Name the club. Then the season." | 30 s a guess, 20 s for the season | ~60 s | 110 s |

**Length:** typical ~5 m 15 s of tasks, plus ~30 s of moves and ~30 s of
report: **about 6 m 15 s.** The clocks cap the tasks at 7 m 00 s, so the
whole run is **never more than about 8 minutes.** Phase 1: typical ~3 m 45 s
of tasks plus moves and report, about 4 m 35 s. Time a real run at the
playable-draft gate.

### Read the season, reshaped (Jonno, 2026-11-12)

Jonno's note: show the whole line, add hints, and maybe a year range instead
of guessing the exact year. Spec:

1. The **whole 38-game line** is drawn from the start, with a **five-season
   window** stated ("2005/06 to 2009/10"). The answer's place in the window is
   random, so the middle is not a tell.
2. **Guess the club,** up to 3 guesses. After miss 1, a squad player; after
   miss 2, the top scorer with their tally (the daily's own hints).
3. Once the club is right (or after the third miss, when the club is shown),
   **one pick of the season** inside the window.
4. Score: club on guess 1, 2, 3 = 80, 55, 30; season exact +20, one off +10.

The run's boards must be mid-fame stories, not the iconic ones: with the
whole line showing, Leicester 15/16 is a giveaway. The selection uses the
daily's story score but caps club and story fame (a run-board filter, named
and tested). The full daily keeps its own design (the line by fifths, five
guesses).

### Other notes per task

- **Find the mole:** the fake follows Spoofed's fairness rules (same era,
  plausible club or nation, never famous enough to be a tell) and Odd Man
  Out's leak rules (names only).
- **Line them up:** age and height are complete in the data; the FIFA and
  Instagram categories (the draft branch's supply problem) are not needed.
- Between tasks the finished sheet slides into the dossier and the next slides
  out (staged, ~800 ms). Each task's reveal ends with the one red button,
  "Next: Log the shot", so the player reads the truth at their own pace (the
  next clock starts only then).

---

## 3. The scoring model

### Task score, 0 to 100, as fine-grained as the data allows

Jonno wants exact scores with fine margins, so mates rarely tie. Each task
score *s* uses the continuous measure where the game has one and keeps one
decimal internally.

| Task | Mapping | Continuous? | Laziest play |
|---|---|---|---|
| Check the rumours | *s* = 25 × points, points 0 to 4 (Spoofed's 2/1/0 a career) | No: 5 values | ≈ 25 |
| Trace the link | Per step, by grade, then placed inside the grade by the pick's ruler value (`factOf`) between that grade's cuts: Basic 40–54, Decent 55–69, Solid 70–84, Sharp 85–94, Elite 95–100; miss 0. *s* = mean of the two | Yes | ≈ 42 |
| Log the shot | *s* = mean of the three goals' points (0 to 100 each) | Yes | ≈ 37 |
| Find the mole | First tap 100, second 50, else 0 | No: 3 values | ≈ 14 |
| Line them up | Per category: *c* = max(0, pairs right − 5) × 20, pairs out of 10; *s* = mean | Partly: 11 values a category | ≈ 0 |
| Read the season | Club guess 1/2/3: 80/55/30, plus season exact +20 or one off +10 | Partly: 13 values | ≈ 10 |

Chance is subtracted where random play would score (Pecking Order's pairs).
Spoofed and the mole stay coarse; the continuous tasks give the margins.

### Run score

*R* = mean of *s* over the tasks in today's run, to one decimal. Equal
weights: calibration (below) makes each task worth the same to a decent fan.

**How it shows: a valuation (Jonno, 2026-11-13: an obscure score with no
visible scale; the valuation itself is to confirm).** The player sees a
transfer fee, never *R*:

> valuation (£m) = `VALUE_BASE` × `VALUE_GROWTH` ^ *R*, with 1.0 and 1.05,
> shown to one decimal: "£37.0m".

| *R* | Valuation | Band |
|---|---|---|
| 0 | £1.0m | Basic |
| 22 (laziest run) | £2.9m | Basic |
| 40 | £7.0m | Decent from here |
| 55 | £14.6m | Solid from here |
| 60 (the scale's middle) | £18.7m | Solid |
| 70 | £30.4m | Sharp from here |
| 74 | £37.0m | Sharp |
| 85 | £63.3m | Elite from here |
| 100 | £131.5m | Elite |

Why a valuation:
- **No ceiling to read against.** Fees have no famous maximum, so £14.6m
  reads as a real player, not as 55 out of 100. Nothing is hidden: the score
  is exact and the same play always gets the same fee; the page just never
  prints a maximum.
- **Fine margins where they matter.** The curve is steep at the top: one
  point of *R* is £0.1m at the bottom and over £6m at the very top, so the
  best players are spread far apart. Mates compare to £0.1m.
- **Football's own unit, and the agent theme.** Every fan reads a fee; the
  brag writes itself ("a £63m scout today"). It fits the scout and agent
  direction Jonno raised.
- Not Krillion's metres, and none of its words.

The alternative, if a fee feels wrong: a points total with an odd ceiling
(e.g. task maxima that sum to 2,387, never printed).

The band words are the site's scale (Jonno, 2026-11-12), shown beside the
fee; new words may come later with a new name for the whole site.

**Calibration, before launch** (the Pitch pin method): a script plays every
upcoming day as lazy, casual, decent and expert strategies, 200 runs each.
Accept when the laziest median *R* is under 40 and its maximum under 55, and a
decent fan lands Solid on most days. Every number is a named constant
(`TASK_MAP`, `BANDS`, `SCALE_MEAN`, `SCALE_SD`, `RUN_REVEAL_MS`, the clocks).

### Task marks

| Mark | *s* | On screen | In the share line |
|---|---|---|---|
| Clean | 80 to 100 | solid ink disc, white tick | ✅ |
| Partial | 40 to 79 | half-filled disc | 🔸 |
| Miss | 0 to 39 | hollow ring, cross | ❌ |

Shape and lightness differ, never hue alone. Marks are never counted on
screen. Each task's own number is one tap away on the report.

### "Top X%" (Jonno, 2026-11-12)

Two sources, one line, overall only (never per task), top half only.

**Before real data** (fewer than `CURVE_MIN` = 100 reports today, and fewer
than 100 over the last 7 days):
- The curve is **our scale's normal distribution** over *R*, mean
  `SCALE_MEAN` 60 and spread `SCALE_SD` 15, drawn with the valuation under
  the player's mark and no axis numbers.
- X = 100 × (1 − Φ((*R* − 60) / 15)), rounded up to a whole number. £37.0m
  (*R* 74) is top 18%; £63.3m (*R* 85) is top 5%; £18.7m (*R* 60) is top 50%.
- **The words say it is the scale:** "Top 18% on our scale". Until real
  players exist, "of scores" or "of players" would be a claim that is not
  true (research Q2).
- The calibration simulation checks the bell is roughly right (a decent fan
  near the middle); `SCALE_MEAN` and `SCALE_SD` move if not.

**With real data** (100+ reports today, or 100+ over the last 7 days, labelled
"this week"):
- The curve is a smoothed histogram of the real scores, never a fitted bell.
- X = 100 × (count at or above *R*) / *n*, rounded up: "Top 18% today".
- Anyone on today's top score sees "Joint best today".
- Needs the result store (section 8: later, once the run has traffic).

**For everyone below the top half** (X > 50): the curve with their mark on it
and their own record ("Your best this month: Sharp · 7.9"), no percentage
(Jonno, 2026-11-12).

**Per task, later:** facts, not ranks. "12% of today's scouts spotted this
spoof first time."

---

## 4. The end screen, and the peak

The report runs in stages, one at a time, on one laptop screen at 1366×768.

1. **The dossier closes** (~800 ms).
2. **The marks** tick in down the task list, 100 ms apart.
3. **The result** lands alone and large: eyebrow "Ball knowledge", the band
   word and the valuation ("Sharp · £37.0m") in Big Shoulders, in the band's
   material (the Steps case textures). The fee counts up as it lands.
4. **The find (the peak):** one card, the player's best moment today, in one
   line with its fact.
5. **The rest:** the curve and "Top X%" line (top half), the streak, the
   countdown, **Share** (the one red button), Back to the board (plain).

**The find:** the candidate with the highest task score, ties broken in this
order: a Steps pick graded Sharp or Elite ("Elite find: Bogarde at Chelsea");
the club on the first guess and the exact season; a bullseye ("Bullseye,
1.4 m"); a spoof spotted first time on the longer career; the mole on the
first tap; a perfect line. With no find, the best task is named plainly.
Every find is checkable from data the game already holds.

**Why the find comes after the result:** the peak-end rule. The result can be
low; the find is the best thing that happened, so every run ends on its high
point, truthfully.

**Hub dossier states:** never played (red Open); not started; part played
(tasks ticked, Continue); done (the result on the dossier, the countdown, no
red; the hub's suggestion moves to the unfinished dailies).

---

## 5. The share card

```
Today's assignment #55
Ball knowledge: Sharp · £37.0m
✅✅🔸✅❌✅
Top 18% on our scale
🔥 12
ballknowledge-games.vercel.app
```

- No names, clubs or positions: spoiler-free.
- One glyph per task in the fixed order.
- The "Top X%" line only when the player is shown it (top half), worded as on
  screen ("on our scale" or "today").
- The day number is the shared one from `EPOCH` 2026-09-19.
- The streak only when it is 2 or more. An archive run shares as
  "Assignment #41".
- Glyphs differ by shape (tick, diamond, cross). **Flag, separate from this
  branch:** Spoofed's and Chain's share lines use 🟩🟨🟥, which differ by hue
  alone.

---

## 6. Streaks (Jonno, 2026-11-12: as recommended)

- Counts days with a finished run on the player's own date, whatever the
  score.
- One rest day banked for every 7 days in a row played, at most 2 banked,
  spent automatically on a missed day. Earned, never bought. Shown as a hollow
  mark in the streak row.
- Best streak beside current. Archive runs never count. No notifications.
- The hub's streak becomes the run streak. Chain's own streak stays on
  `/chain`.

---

## 7. How the run touches each game's daily (Jonno: hybrid)

| Game | Run uses | Effect on that game's daily |
|---|---|---|
| Spoofed | Careers 1 and 2 of today's daily | Written to `spoofed.progress.v1`; the daily resumes at career 3. Done only when all 5 are. |
| Steps | Steps 1 and 2 of today's daily | Written to `step.progress.v2`; resumes at step 3. |
| Pecking Order | Categories 1 and 2 of today's daily | Written to its progress; resumes at category 3. |
| Season line | Its own board | None: today's daily stays unspoiled. |
| Pitch pin | Its own 3 goals a day | None (no daily). |
| Odd Man Out | Its own XI a day, solo | None (the pub game is separate). |

- **Clock difference:** a slice played in the run was timed; finished in the
  daily, the rest is untimed. The daily's result counts the run's picks as
  they were made.
- **Already played the slice?** The run shows that task as filed with its
  marks and moves on.
- **Done state:** the run marks `run` done in `src/lib/today.ts`; a game's
  daily is done only when finished in full.

---

## 8. What each game needs built

**Architecture.** Games never import each other and shared code never
imports a game (`CLAUDE.md`), so:
- `src/lib/run/` (shared): `RUN_TASKS` (names, rule lines, clocks), the task
  result type, the run score, bands, the valuation, the scale curve and "Top
  X%", marks, the share line, the streak, `run.progress.v1`. Pure, tested.
- `games/<name>/run/` (each game): a `RunTask` component and its mapping to a
  task score, importing only shared code.
- `app/run/page.tsx` and `app/api/run/day`: the route assembles the tasks and
  each game's server slice. A route is neither a game nor shared code.

| Piece | Work | Size |
|---|---|---|
| **Shared run shell** | `/run` route, dossier frame, task header and clock, staged moves, resume at the first open task (with the clock restarted for that item), the report, archive (`/run?date=`), hub dossier states, `markDone('run')`, `syncHub` | Large |
| **Scoring and calibration** | `src/lib/run` maths with tests; the simulation that sets `BANDS`, `SCALE_MEAN`, `SCALE_SD`; a test that the laziest run stays under 4.0 | Medium |
| Spoofed | `RunTask` over careers 1 and 2 with the clock; write picks to its progress | Small |
| Steps | `RunTask` over steps 1 and 2; continuous score from `factOf` inside the grade; capped reveal; write to its progress | Small to medium |
| Pitch pin | A run schedule (3 goals a day: round packs and classics, never three from one match, the round packs' fairness test), its cron, `RunTask` on the existing throw | Medium |
| Season line | A run schedule (mid-fame boards, never today's daily, a five-season window placed at random), its cron, `RunTask` (whole line, club guesses with hints, season pick in the window); reset `EPOCH` before launch | Medium |
| Odd Man Out | **Solo mode:** a generator that plants a believable fake in a real XI, a schedule and cron, a `problems()` check, `RunTask` with up to 2 taps; a playtest | Large |
| Pecking Order | Merge first; then `RunTask` over categories 1 and 2 | Medium, blocked |
| **Result store** | To show real players' curve, each finished run's score is sent to a small online database (today every score stays on the phone). `POST /api/run/report` (date, *R*, marks, a random id kept on the phone; first finished run per phone per day; never archive runs); `GET /api/run/curve` (binned, *n*). Free tier from the Vercel Marketplace: costs nothing at our size, but it is a new outside service. **Jonno, 2026-11-13: later, once the run has traffic.** Until then "Top X%" stays on our scale. No personal data. | Medium |

**Phases**
1. **Run v1:** shell, scoring (with the scale curve for "Top X%"), Spoofed,
   Steps, Pitch pin, Season line. No server.
2. **Six tasks:** Odd Man Out solo, Pecking Order once merged.
3. **Real curve,** once the run has traffic: the result store, "Top X%
   today", per-task facts.

Gate per phase as for a new game: data check, playable draft (time a real
run, try the clocks), review of generated days; HANDOFF, commit, check in.

---

## 9. Decisions and what is still open

**Decided by Jonno, 2026-11-12**

| # | Question | Decision |
|---|---|---|
| 1 | Score display | An exact score with the band word, on no visible scale (2026-11-13: not 1 to 10 or 1 to 100, so a bad score does not look bad). A transfer valuation is proposed, to confirm. |
| 2 | Fine margins | Continuous task scores where the data allows. Plus Jonno's addition: time limits in the run only, none when a game is played on its own. Spec: clocks cap, never score. |
| 3 | Band words | The site scale: Basic, Decent, Solid, Sharp, Elite. New words maybe later, with a new name for the whole site. |
| 4 | Curve before real data | "Top X%" from our scale's normal distribution from day one, worded "on our scale". |
| 5 | Percentage once real | Top half only. |
| 6 | Chain's puzzle | Not in the run; Steps is "Trace the link". |
| 7 | Shared content | Hybrid. |
| 8 | Streak | Finished runs, earned rest days. |
| 9 | Find the mole | Build the solo planted-XI mode in phase 2. |
| 10 | Read the season | The whole line, hints (squad player, top scorer), the club guessed, the season picked inside a five-season window (section 2). |
| 12 | Task names | Keep the working names, held in one config constant, baked into no art. |
| 13 | Name | **Pecking Order** (2026-11-13), for the game the docs called The Tunnel and its branch calls Sorted. |
| 14 | Result store | Later, once the run has traffic (2026-11-13). |
| 15 | Clocks | Cap only: time never scores (2026-11-13). |

**Still open**

1. **The valuation** (section 3): confirm a transfer fee ("Sharp · £37.0m"),
   or use a points total with an odd, never-printed ceiling.

**Follow-ups outside this branch**
- **Rename to Pecking Order** on the game's own branch
  (`claude/brave-heisenberg-ba64b8`, currently "Sorted": label, route, storage
  key and view-transition name change together) and on the hub board's label
  in `design-drafts/brand-concepts/bible.html`. Not done here: this branch
  writes only its two docs.
- **Share glyphs:** Spoofed's and Chain's 🟩🟨🟥 differ by hue alone.
