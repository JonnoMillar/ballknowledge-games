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
  day does not look bad. The score is what the day's scouting report is
  worth: "Sharp · Report valued at £37.0m" (Jonno, 2026-11-13). One mark per
  task, then the player's best moment of the run, named with its fact.
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

**How it shows: the report's value (Jonno, 2026-11-13).** He asked for an
obscure score with no visible scale, then chose a fee for the *report*, not
for the player: the scout files the day's dossier and the dossier is valued,
the way a scouting department is judged by the transfers it sources. A fee on
the player would read as if the player were the one being sold. The player
sees "Report valued at £37.0m", never *R*:

> report value (£m) = `VALUE_BASE` × `VALUE_GROWTH` ^ *R*, with 1.0 and 1.05,
> shown to one decimal: "£37.0m".

| *R* | Report value | Band |
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

Why a report value:
- **No ceiling to read against.** Fees have no famous maximum, so £14.6m
  reads as a real player, not as 55 out of 100. Nothing is hidden: the score
  is exact and the same play always gets the same fee; the page just never
  prints a maximum.
- **Fine margins where they matter.** The curve is steep at the top: one
  point of *R* is £0.1m at the bottom and over £6m at the very top, so the
  best players are spread far apart. Mates compare to £0.1m.
- **Football's own unit, on the scout's own work.** Every fan reads a fee;
  the brag writes itself ("my report was worth £63m today"). It fits the
  dossier and the scout and agent direction Jonno raised.
- Not Krillion's metres, and none of its words.
- Known stretch: Log the shot and Read the season do not find players, so
  "what the report is worth" is loose for them. Accepted: a report covers
  everything the scout checked that day.

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
  `SCALE_MEAN` 60 and spread `SCALE_SD` 15, drawn with the report value under
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
and their own record ("Your best report this month: £52.4m"), no percentage
(Jonno, 2026-11-12).

**Per task, later:** facts, not ranks. "12% of today's scouts spotted this
spoof first time."

---

## 4. The end screen, and the peak

The report runs in stages, one at a time, on one laptop screen at 1366×768.

1. **The dossier closes** (~800 ms).
2. **The marks** tick in down the task list, 100 ms apart.
3. **The result** lands alone and large: eyebrow "Ball knowledge", the band
   word ("Sharp") in Big Shoulders, in the band's material (the Steps case
   textures), and under it "Report valued at £37.0m", the fee counting up as
   it lands. Under that, once the fee stops, a real transfer of about the
   same fee: "About what Newcastle paid for Harvey Barnes" (section 4a).
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

### 4a. The transfer beside the fee (Jonno, 2026-11-13)

A report value means more beside a deal the player remembers. Measured in
gate 1 (section 10): Wikipedia's "List of English football transfers" pages
give a real deal near almost every value.

- **The line:** "About what Newcastle paid for Harvey Barnes" (£38m, 2023),
  in small type under the fee. The fee and year show on tap, not in the line.
- **The pick:** among priced deals within ±10% of the report value, the
  player with the most English Wikipedia views (`player-views.json`), at
  least `TRANSFER_MIN_VIEWS` 500k, from 2010 on (the audience is 16 to 26);
  a deal within ±5% beats one further away. Fixed per value, so the same
  fee always gets the same deal.
- **No deal close enough:** "More than Arsenal paid for Declan Rice" (the
  dearest known deal under the value). Measured: 5 of 1,001 values need it
  (£113m to £119m).
- **Not in the share line:** it would push the grid down; the fee is enough.
- **Data:** `data/transfers.json` (shared, next to the pool), built by a
  script from the transfer-list pages: player (matched to the pool by
  Wikipedia title), from, to, fee in pounds, window. Only stated fees count:
  "Undisclosed", free and loan rows are dropped. CC BY-SA text, fees are
  facts; a credits line on `/credits`. A cron refreshes it after each window
  closes (early February and early September), so no hand upkeep.

**Hub dossier states:** never played (red Open); not started; part played
(tasks ticked, Continue); done (the result on the dossier, the countdown, no
red; the hub's suggestion moves to the unfinished dailies).

---

## 5. The share card

```
Today's assignment #55
Ball knowledge: Sharp
Report valued at £37.0m
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
  result type, the run score, bands, the report value, the scale curve and "Top
  X%", marks, the share line, the streak, `run.progress.v1`. Pure, tested.
- `games/<name>/run/` (each game): a `RunTask` component and its mapping to a
  task score, importing only shared code.
- `app/run/page.tsx` and `app/api/run/day`: the route assembles the tasks and
  each game's server slice. A route is neither a game nor shared code.

| Piece | Work | Size |
|---|---|---|
| **Shared run shell** | `/run` route, dossier frame, task header and clock, staged moves, resume at the first open task (with the clock restarted for that item), the report, archive (`/run?date=`), hub dossier states, `markDone('run')`, `syncHub` | Large |
| **Scoring and calibration** | `src/lib/run` maths with tests; the simulation that sets `BANDS`, `SCALE_MEAN`, `SCALE_SD`; a test that the laziest run stays under 4.0 | Medium |
| **Transfers** | `data/transfers.json` from Wikipedia's transfer lists, a parser tested on a saved real page (like Odd Man Out's `wiki.ts`), the deal-picking rule with tests, a cron after each window, a credits line | Medium |
| Spoofed | `RunTask` over careers 1 and 2 with the clock; write picks to its progress | Small |
| Steps | `RunTask` over steps 1 and 2; the pick route returns a `depth` (0 to 1 inside the grade) so the score is continuous; capped reveal; write to its progress | Small to medium |
| Pitch pin | A run schedule (3 goals a day, reuse gap, mix: section 10), its cron, `RunTask` on the existing throw | Medium |
| Season line | A run schedule (the mid-fame pool in section 10, no board shared with the daily within `BOARD_GAP`, a five-season window placed at random), its cron, `RunTask` (whole line, club guesses with hints, season pick in the window); reset `EPOCH` before launch | Medium |
| Odd Man Out | **Solo mode:** a generator that plants a believable fake in a real XI, a schedule and cron, a `problems()` check, `RunTask` with up to 2 taps; a playtest | Large |
| Pecking Order | Merge first; then `RunTask` over categories 1 and 2 | Medium, blocked |
| **Result store** | To show real players' curve, each finished run's score is sent to a small online database (today every score stays on the phone). `POST /api/run/report` (date, *R*, marks, a random id kept on the phone; first finished run per phone per day; never archive runs); `GET /api/run/curve` (binned, *n*). Free tier from the Vercel Marketplace: costs nothing at our size, but it is a new outside service. **Jonno, 2026-11-13: later, once the run has traffic.** Until then "Top X%" stays on our scale. No personal data. | Medium |

**Phases**
1. **Run v1:** shell, scoring (with the scale curve for "Top X%"), the
   transfer line, Spoofed, Steps, Pitch pin, Season line. No server.
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
| 1 | Score display | An exact score with the band word, on no visible scale (2026-11-13: not 1 to 10 or 1 to 100, so a bad score does not look bad). Shown as what the day's report is worth: "Report valued at £37.0m" (2026-11-13). |
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
| 16 | Transfer line | A real deal of about the same fee under the report value (2026-11-13, Jonno's idea; section 4a). |

**Still open:** nothing. Phase 1 started 2026-11-13 ("Let's go"); gate 1 is
section 10.

**Follow-ups outside this branch**
- **Rename to Pecking Order** on the game's own branch
  (`claude/brave-heisenberg-ba64b8`, currently "Sorted": label, route, storage
  key and view-transition name change together) and on the hub board's label
  in `design-drafts/brand-concepts/bible.html`. Not done here: this branch
  writes only its two docs.
- **Share glyphs:** Spoofed's and Chain's 🟩🟨🟥 differ by hue alone.

---

## 10. Gate 1: data check (2026-11-13)

Measured on the committed data and live Wikipedia, free, no keys. The
scratch scripts are not committed; the numbers are.

### Transfers for the report value (section 4a)

- **Source:** English Wikipedia's "List of English football transfers summer
  YYYY" and "winter YYYY–YY" pages, 2010 to summer 2026: all 33 windows exist
  and parse (one table format: date, player with `{{sortname}}` or a link,
  from, to, fee). Wikipedia rate-limits bursts (HTTP 429): fetch with a pause
  of a few seconds a page and retry.
- **Rows:** 7,569 moves; 997 with a stated fee of £0.5m or more (2,550
  undisclosed, 2,322 free, 1,643 loans, dropped). 803 of the 997 match a pool
  player by Wikipedia title.
- **Coverage of every report value** (£1.0m to £131.5m in steps of *R* 0.1,
  1,001 values), counting only deals for players with 500k+ English views
  since 2010: **874 within ±5%, 996 within ±10%.** With 1M+ views since 2016:
  650 and 758. With 300k+ views, 1,001 of 1,001 within ±10%. The 5 left
  (£113m to £119m) use the "more than" line.
- **Top fees:** Coutinho £142m (2018), Enzo Fernández £107m (2023), Rice
  £105m, Caicedo £100m, Kane £95m. The page also lists Enzo Fernández at
  £125m and Barcola at £106m in summer 2026: unchecked, spot-check the
  parser's top rows against the pages before shipping.
- **Licence:** CC BY-SA text; fees and clubs are facts. Credits line needed.

### Pitch pin: goals for a 3-goal daily

- 187 goals: 143 recent (110 since 2022), 44 classic (14 before 2010); 95
  struck inside the box, 92 outside. About 6 new goals a week arrive (55
  this season, 21 Aug to 25 Oct).
- 3 goals a day uses 21 a week, so goals must repeat. With
  `RUN_PIN_GAP` 60 days a schedule needs about 180 distinct goals: it fits
  today, only just, and grows by about 6 a week. **Default: 3 a day, a goal
  never back within 60 days, at most one classic a day and at least one from
  this season, never two from one match.** The generator fails loudly (and
  the cron goes red) if it cannot fill a day; then drop to 2 goals a day.

### Season line: run boards

- 268 boards, 204 in the daily pool. Run pool: 2000 on, at least one story,
  no title story, story score + 2 × fame under 5 (mid-fame): **147 boards
  over 39 clubs** (e.g. Bolton 01/02 collapse, Norwich 12/13 boom,
  Bournemouth 22/23 escape).
- The run and the daily share boards, so no board appears in either within
  `BOARD_GAP` 60 days of the other. At one run board a day the pool cycles
  in about five months; a finished season adds about 20 boards.

### Steps and Spoofed slices

- Both games store a day as one entry per round (`step.progress.v2`: a
  verdict per step; `spoofed.progress.v1`: picks per career), so the run can
  write rounds 1 and 2 and the daily resumes at round 3 with no format change.
- Steps' verdict carries the grade but not the pick's ruler value, so the
  continuous score needs the pick route to add a `depth` (0 to 1 inside the
  grade, from where the pick's fact sits between its grade's bar cuts). A
  small change inside `games/step`.

**Gate 1 verdict:** every phase 1 task has the data it needs. Next is gate
2, the playable draft: shared shell and scoring first, then Spoofed and
Steps (no new data), then Pitch pin and Season line (new schedules).

---

## 11. Gate 2: playable draft, first slice (2026-11-13)

Built: the shared run (scoring, shell, clocks, report) and the first two
tasks, Check the rumours and Trace the link. Pitch pin, Season line and the
transfer line come next. Play it at `/run` (`?date=` for a past day).

| Path | What |
|---|---|
| `src/lib/run/tasks.ts` | `RUN_TASKS` (all six: id, name, rule, items, `clockMs`), `RUN_REVEAL_MS`, `FIND_ORDER`, the `TaskResult` and `RunTaskProps` types. |
| `src/lib/run/score.ts` | `gradeScore` (grade range placed by depth), `runScore`, `reportValue`/`money`, `BANDS`, `topPercent` (our scale's normal curve), `bell`, `markOf` and glyphs, `bestMoment`, `shareLine`. |
| `src/lib/run/progress.ts` | `run.progress.v1` (results per task, `finishedOn`, frozen `score`), `streakOf` (rest days, `REST_EVERY` 7, `REST_MAX` 2), `bestThisMonth`. |
| `tests/run/score.test.ts` | The spec's fee table, bands, Top X%, marks, find tie-break, share card, streak and rest days. |
| `components/run/Run.tsx`, `RunClock.tsx`, `run.css` | The shell: checklist, header (eyebrow + rule), staged sheet moves, resume at the first open task, the report (marks tick in, band word in its grade material, the fee counting up, the find, the curve and Top X% or your best this month, streak, countdown, Share, Back to the board). `markDone('run')` on finishing. |
| `app/run/page.tsx`, `RunRoute.tsx` | The route; `RunRoute` (client) hands each game's RunTask to the shell, so shared code imports no game. |
| `games/itk/run/RunTask.tsx` | Careers 1 and 2 of today's Spoofed, 30 s each. Writes `spoofed.progress.v1`; a timeout pads the picks with index -1 so the daily reads it as missed. Score 25 × points. |
| `games/step/run/RunTask.tsx` | Steps 1 and 2, 45 s each, reveal cut at 2 s (`Slam` `cap`). Writes `step.progress.v2` and records cards to the collection as the daily does. A timeout locks the chosen name if any, else asks for a miss. |

Changes inside the games (small, tested):
- Steps: `judge` returns `depth` (`depthOf` in `lib/rules.ts`: where the
  pick's fact sits between its grade's bar cuts, in log space; the field's
  deepest checkable answer is 1). The verdict carries it. `judgePick` with
  pick `''` is a timeout: a miss with the step's answers, pick "No answer".
  `After` says "Out of time" for it. `Track`, `After`, `useAlbum` exported.
- Spoofed: `judgePick` accepts index -1 when `last` (the clock ran out):
  reveals the fake. `VERDICT` exported.

**Deviation:** no `app/api/run/day` yet. Each RunTask fetches its own game's
API (the slices need nothing new server-side). Add it when Pitch pin and
Season line bring run schedules.

**Verified:** typecheck clean, `npm test` 2,212 passed. Playwright on the dev
server, 1366×768: a full run (career 1 found first time, career 2 timed out
and peeled, step 1 Kevin-Prince Boateng Sharp, step 2 timed out), the report
at £10.5m Decent, `scrollHeight` = 768 on the task and report screens;
375×812 report stacks and Share shows. After the run, `/spoofed/play` opens on
career 3 and `/step` on step 3 with the run's marks. Reload of a finished run
opens the report. No console errors after a duplicate-key fix.
**Not checked:** a real run timed end to end (the waits above were forced),
the archive path `/run?date=`, Share's clipboard text in a real browser, a
real phone.

**Settled after the first slice (2026-11-13):**
1. Finds rank by their own item's score (`findScore`: one career, one
   pick, one goal), not the task average, so a timeout elsewhere in a task
   cannot bury its best moment. Ties still go by `FIND_ORDER`.
2. Pale band words (Decent, Solid) carry an ink edge.
3. A task already answered shows its clock spent after a reload.

---

## 12. Gate 2, rest of phase 1: Log the shot, Read the season, the transfer line (2026-11-13)

Phase 1 is now whole: four tasks in order and the transfer line under the
fee. Play it at `/run`.

| Path | What |
|---|---|
| `games/pin/lib/run.ts`, `data/run.json` | The run's goals: 3 a day from `RUN_PIN_START` 2026-11-13, a 60-day reuse gap, at most one classic, one from the last 365 days (this season's first), never two from one match, the lazy pin under 60. When goals run thin (summer has none for ten weeks) the gap shrinks by itself in steps of 10 to `RUN_PIN_GAP_MIN` 30 and the day records it (`gap`), so nobody has to step in; below 30 it throws. On today's goals alone, with no new ones, it runs 182 days. |
| `games/pin/run/RunTask.tsx`, `app/api/pin/run` | One throw a goal, 20 s each, on the existing pitch and throw route (board `run:<date>`, served only from its date). Out of time with no pin: 0 points, the true spot shown. StatsBomb credit and logo on the task, as its licence asks. Find: the closest bullseye. |
| `games/season-line/lib/run.ts`, `data/run.json` | The run's boards: `runPool` (2000 on, a story, no title, story + 2 × fame under 5: 147 boards), a club not back within 10 days, never the daily's board within 60 days either way (the daily's `extend` now also keeps clear of the run). The window's first season is drawn per date. |
| `games/season-line/run/RunTask.tsx`, `app/api/season-line/run` | The whole line, "Between 2005/06 and 2009/10", three club guesses at 30 s (squad player after one miss, top scorer after two), then the season at 20 s (`SEASON_PICK_MS`). Hints that could place the season (the top scorer's tally) wait until it is picked. Score 80/55/30 + 20 exact or 10 one off. Find: club first time and season exact. |
| `src/lib/transfers.ts`, `data/transfers.json`, `scripts/run/build-transfers.ts`, `app/api/run/deal` | 1,598 priced moves from 33 windows (summer 2010 to summer 2026), 1,252 matched to the pool by title. The parser reads the three page formats the lists have used (one-line headers and "Name", `{{dts}}` dates, rowspans on any cell, `{{ntsh}}` keys or plain fees); tested on a cut of the real summer 2023 page. `dealFor`: a 500k+ view player's deal within ±10% (±5% first), else "More than" the dearest under. 954 of the 1,001 report values get a near deal, 47 the "More than" line. Served by a route so the page does not carry the list. |
| `scripts/run/build-days.ts`, `.github/workflows/run-days.yml`, `transfers.yml` | `npm run run:days` tops both run schedules up to 28 days ahead; daily at 06:30 UTC after pin-packs. `npm run transfers` re-reads the lists; on 3 and 10 February and September. Both run tests before committing. **They fire only once on `main`.** |
| `src/lib/run/progress.ts` | `loadItems`/`saveItems`: mid-task state for tasks with no daily (Log the shot, Read the season) lives in `run.progress.v1`. The shell re-reads the record before filing a task, so it never overwrites that state. |

Top fees read: Coutinho £142m (2018), Isak £125m (2025), Enzo Fernández
£125m (summer 2026), Rogers £117m, Anderson £116m, Barcola £106m (2026):
as the pages state them; not checked against another source.

**Verified:** typecheck clean, `npm test` 2,232 passed, prod build clean
(`NEXT_DIST_DIR=.next-prod`). Playwright, dev server, 1366×768:
Log the shot (a goal timed out at +0 with the spot shown, two throws, the
reveal), Read the season (a wrong guess brought the squad player, Leicester
on guess 2, 2000/01 exact: 75), the report with four marks, £9.4m Decent and
"About what Bournemouth paid for Justin Kluivert" (fee, club and year on
tap); `scrollHeight` 768 on each; no console errors. The spoofed and steps
results in that run were seeded, so the four were not played in one go.
**Not checked:** a real run timed end to end, a phone through the new two
tasks, the crons on GitHub, the archive path.

**Known, for Jonno:**
1. The goals and boards are generated, not reviewed: gate 3 is your read of
   upcoming days (`npm run run:days -- --print`). Some goals are obscure
   (Saman Ghoddos, Guemissongui Ouattara); some boards are famous-ish
   (Liverpool 18/19).
2. The hub does not yet show the run (the hub is being redesigned on `main`).
3. The run's archive starts at 2026-11-13: the goal schedule cannot be
   backfilled to 19 September, because goals had to exist before their day.
