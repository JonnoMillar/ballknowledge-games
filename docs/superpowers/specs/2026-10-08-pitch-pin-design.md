# Pitch pin — design

> **Superseded in part (2026-10-09)** by
> `docs/superpowers/specs/2026-10-09-pitch-pin-library-design.md`: no daily,
> no streak; a library of packs. The game itself, scoring, par and licences
> below still hold.

**Date:** 2026-10-08 (revised the same day after a ten-player review)
**Status:** Approved in session (Jonno), first draft, on branch `feat/pitch-pin`
**Mockups:** https://claude.ai/artifact/Fr5aSwkm6ANdRXT9xw8JS3 (four phone
screens, private to Jonno; drawn before the review, so no par, magnifier or
zoomed reveal yet)
**Background:** `docs/game-design-playbook.md` section 4 ("Pitch pin"), the
"Place" verb from section 3, and the sticker-album identity
(`docs/superpowers/specs/2026-09-19-sticker-album-identity-design.md`).

## The game

A goal is named: scorer, match, date, competition, and one line on what
happened. The player drops a pin on the attacking half of a pitch where they
think the shot was struck from, and throws it. The true spot lands, a line
joins the two, and the distance appears. Six goals a board, one board a day,
the same board for everyone. The brag is a bullseye; the comparison is par.

One throw per goal. Once thrown, a pin is locked.

## What the review changed

The first version of this spec was reviewed as ten players, from a casual
Match of the Day viewer to a stats nerd. What it changed, and why:

- **The lazy pin.** Pinning every goal on the penalty spot, measured on 26
  real StatsBomb goals: 10 m off per goal on average, 60 m a board, 263/600
  in points, with one free bullseye (Richarlison's scissor kick is 0.4 m from
  the spot). The most iconic goals (Bellingham, Bale's overhead kick, the
  Hand of God) are within 3 m of it. So every board now has a **par**, the
  lazy pin's score, and a board the lazy pin does well on is rejected.
- **Content runs out.** About 100 to 150 famous goals have free coordinates;
  at six a day the daily dies in under a month. The daily now takes **four
  goals from the latest league round** (Understat) and **two classics**
  (StatsBomb), plus themed packs.
- **Thumbs.** At phone width the bullseye is about 8 px across and a thumb
  covers about 8 m. While dragging, the pin rides above the thumb with a
  magnifier.
- **Mirrored memories.** Goals are remembered from a side-on TV camera; a
  pin on the wrong side scores a miss for a correct memory. The reveal now
  says so.
- **A thin payoff.** The reveal zooms in, shows the xG, links to the goal on
  YouTube, and the game keeps a streak.
- **Men only.** Women's goals join the classics; the copy is neutral.

## Data

Two free sources, both gated (see Licences). Real data loaded from both on
2026-10-08.

### Classics: StatsBomb open data

`github.com/statsbomb/open-data`, shot events with outcome `Goal`. Coverage
verified: World Cups 1970 and 1986 (selected matches), 2018 and 2022 (every
match); Euro 2020 and 2024 (every match); Women's Euro 2022 and 2025, Women's
World Cup 2019 and 2023; Premier League 2003/04 (every Arsenal match) and
2015/16 (all 380); Champions League finals 2003/04 to 2018/19; Barcelona's La
Liga matches 2004/05 to 2020/21. Checked by loading: both Maradona goals v
England 1986, Carlos Alberto 1970, Bale's overhead kick 2018, Messi's header
2009, Bellingham v Slovakia 2024, Schick from halfway 2021, Pavard 2018,
Henry v Liverpool 2004.

StatsBomb: 120 × 80 units, attacking toward x = 120, y = 0 on the attacker's
left.

### Recent goals: Understat

`understat.com`, current season of the Premier League, La Liga, Bundesliga,
Serie A and Ligue 1 (no Champions League; FotMob and SofaScore were the only
alternatives and their terms are unclear, so the Champions League is out).

- `GET https://understat.com/getLeagueData/<League>/<season start year>`
  with `X-Requested-With: XMLHttpRequest`, gzip: every fixture, `isResult`,
  dates. Leagues: `EPL`, `La_liga`, `Bundesliga`, `Serie_A`, `Ligue_1`.
- `GET https://understat.com/getMatchData/<id>`, same headers: `shots.h` and
  `shots.a`, each with `minute`, `player`, `result` (`Goal`, `OwnGoal`, …),
  `X`, `Y` (0 to 1), `situation` (`OpenPlay`, `FromCorner`, `SetPiece`,
  `DirectFreekick`, `Penalty`), `shotType` (`RightFoot`, `LeftFoot`, `Head`,
  `OtherBodyPart`), `lastAction`, `xG`, and the score.
- Verified: the 2026/27 Premier League loads, latest result Man City 5–3
  Sunderland on 20 Sep 2026; no league fixtures between 21 Sep and 9 Oct
  (the calendar, not a lag), next round from 10 Oct.

Understat: `X` along the pitch, 1 at the goal attacked; `Y` across, but
**flipped against StatsBomb**: `Y = 0` on the attacker's right. Checked on the
four goals of Leicester v Manchester United, both meetings in 2015/16, which
are in both sources.

### Coordinates

Pitch pin stores metres on a nominal 105 × 68 m pitch, attacking half only,
goal at the top of the screen. Both sources normalise every pitch to one
size, so these are nominal metres; the page says "on a standard pitch".

- `x` across, 0 at the attacker's left touchline, 68 at the right.
- `y` out from the goal line, 0 at the goal line, 52.5 at halfway.

| Source | `x` | `y` |
|---|---|---|
| StatsBomb | `sb_y × 68 / 80` | `(120 − sb_x) × 105 / 120` |
| Understat | `(1 − Y) × 68` | `(1 − X) × 105` |

Checked: Carlos Alberto 1970 (a right back arriving on the right) lands at
`x = 48.9`, right of centre.

**The data's own error.** The two sources disagree on the same four goals by
0.3, 0.9, 1.5 and 2.9 m (Vardy). StatsBomb tagged the 2018 World Cup in
whole yards. So the bullseye is **2 m**, about what the data can tell apart;
a smaller bullseye would reward noise.

## Content

### A goal

`games/pin/data/goals.json`, keyed by slug, for classics and recent goals
alike:

| Field | Example |
|---|---|
| `scorer` | `Jude Bellingham` |
| `match` | `England v Slovakia` |
| `date` | `2024-06-30` |
| `competition` | `Euro 2024, round of 16` |
| `line` | `An overhead kick in the fifth minute of stoppage time, with England a minute from going out.` |
| `source` | `{ "from": "statsbomb", "matchId": 3941017, "eventId": "…" }` or `{ "from": "understat", "matchId": 31222, "shotId": "…" }` |
| `at` | `{ "x": 34.8, "y": 8.7 }` (metres) |
| `xg` | `0.10` |
| `kind` | `classic` or `recent` |

`source`, `at` and `xg` are written by the scripts, never by hand.

**Classic lines** are written by hand. **Recent lines** are generated from
the data, so no one writes four lines a day: the kind of finish (a
header, a direct free kick, else a shot), the situation (from a corner,
after a dribble, from a cross), the minute, and what the goal did to the
score. "A shot after a dribble, in the 56th minute, to make it 4–3." Which
foot is never said. These lines cannot carry position words by
construction; the test checks them anyway.

**Rules every goal obeys** (tested, except 5):

1. Not a penalty, not an own goal.
2. In the attacking half: `0 ≤ x ≤ 68`, `0 ≤ y ≤ 52.5`.
3. The `line` gives no position away. Banned whole words, any case: yard(s),
   metre(s), meter(s), edge, box, area, post, left, right, centre, center,
   halfway, distance, range, close, far, long, near, angle, six, wide,
   outside, inside. So "left foot" and "right foot" go too: a classic line
   says "an overhead kick", "a volley", "a header", never which foot.
4. Copy is gender-neutral: no "he", "his", "him" in lines or UI strings.
5. Classics are famous: goals a football fan has seen replayed. Hand-picked.

### Recent goal selection

`scripts/build-pin-week.ts`, run by hand once a week (nothing schedules it
yet: there is no remote, and scheduled jobs die silently):

1. Load every result in the five leagues since the last run.
2. Keep goals that obey rules 1 and 2.
3. Prefer the memorable: Premier League first, then the others; within that,
   lowest xG first (a 0.04 xG goal is the one in the highlights); at most one
   goal per match.
4. Drop goals the lazy pin is within 4 m of.
5. Write the goals to `goals.json` (`kind: recent`) and the next seven days'
   boards.

During a break (no new round) the script keeps drawing unused goals from the
latest rounds; a weekend across five leagues yields far more than 28 usable
goals.

### A board

Six goal slugs. A daily board is four recent goals and two classics; a pack
is six goals on a theme.

- **Par** is the lazy pin's score on that board: every goal pinned on the
  penalty spot (`x = 34`, `y = 11`). In metres, the sum of distances; in
  points, the sum of points.
- **The lazy-pin filter** (tested): a board's par is at least 42 m (an
  average of 7 m a goal). Real classics averaged 10 m, so mixed boards pass
  easily; a board of six central headers does not.
- Every board has six distinct goals, at least one struck from outside the
  penalty area and one from inside it (tested).

**Daily boards** are files, `games/pin/data/days/YYYY-MM-DD.json`, written by
the week script. The two classics for a day come from a seeded shuffle of the
classics pool (`dailyOrder` from `src/lib/daily.ts`), two a day. Goals in a
pack are kept out of the daily pool, so a pack never spoils a daily. A pool
of about 150 lasts 75 days before it repeats; the draft's pool is smaller
(see Draft content). **If no file exists for today** (the script was not
run), today's board is six classics from the same shuffle, so the daily never
goes blank. That fallback board is exempt from the lazy-pin filter: it is
the rare path, and a famous central goal is still a fair question.

**Packs**, `games/pin/data/packs.json`: id, title, six goals. Draft packs:
World Cup 2022, the Invincibles (Arsenal 2003/04), Lionesses (Women's Euro
2022 and 2025). Packs are played any time and do not touch the streak.

**Draft content:** about 36 classics: 18 in the three packs, about 18 for
the daily (nine days of classics), including women's goals (Russo's backheel
v Sweden and Kelly's final winner, 2022); and one real week of recent boards
from the round starting 10 Oct (or the latest round, if the week script runs
before then). Growing the classics pool toward 150 is content work after
the draft.

## The daily

- `PIN_EPOCH` is the launch date (`2026-10-08` for the draft); the board
  number is `dayNumber` from that epoch. `dayNumber` in `src/lib/daily.ts`
  gains an optional epoch parameter (default `EPOCH`, so Chain is unchanged).
- `/pin` is today's board (the player's local date, as Chain does).
  `/pin/YYYY-MM-DD` replays an earlier day; a day that has not come is a 404.
  `/pin/pack/<id>` plays a pack. `/pin` lists earlier days and the packs
  under the game.
- Progress in `localStorage`, `pin.progress.v1`: per board, each thrown pin
  and the server's answer for it. A refresh resumes. Only the first throw
  counts; a finished board shows its full-time screen.
- **Streak:** consecutive days the daily was finished. Missing a day ends it.
  (Unlike Chain's there is nothing to "hold"; finishing is the habit.)

## Scoring: both, to compare

Jonno wants to play both before choosing. Distances are stored once; one pure
module turns them into either score. `?score=points` switches to points;
metres is the default. The mode is a view, not a save.

**Metres, darts-style.** Total metres off, lowest wins, against par.

| Ring | Distance | Share mark |
|---|---|---|
| Bullseye | ≤ 2 m | 🎯 |
| Inner | ≤ 5 m | 🟩 |
| Outer | ≤ 10 m | 🟨 |
| Miss | > 10 m | ⬜ |

**Points per pin.** `points(d) = 100` when `d ≤ 2`, else
`round(100 × e^(−(d − 2) / 8))`: about 69 at 5 m, 37 at 10 m, 11 at 20 m.
Out of 600, against par.

**Share text** (no names, no positions):

```
Pitch pin No. 3
31.4 m, par 58 (26 under)      or: 452 / 600, par 263
🎯🟨🟩⬜🟩🟩
```

`navigator.share` where it exists, else copy to clipboard, as Chain does.

Chain's daily has no score on purpose (a number made a correct chain feel
like a loss). Pitch pin is different: distance is the whole answer, not a
judgement laid over it, and par says what a guess would have got.

## Screens

Phone first, one centred column, 16 px gutters, max-width 560. Light theme
only: cream page, white cards, ink, one red band. Big Shoulders Display for
the masthead, scorer, numbers; Libre Franklin for the rest; no tracked caps,
no middle-dot meta strings.

1. **Goal.** Red masthead "Pitch pin" with a pin mark and the board number.
   "Goal 3 of 6" with six progress ticks. The goal card (a white sticker):
   competition, scorer in caps, match and date, the line. The pitch: ink
   lines on a white card, attacking half, goal at the top, penalty spot and
   D, the centre-circle arc at halfway. "Where was it struck from?" A red
   **Throw** button, disabled until a pin is down.
2. **Reveal**, in place. The pitch zooms (about 2.5×) onto the pin and the
   true spot; the ball presses down; the rings fade in; the dashed line
   draws; the distance appears; the pitch zooms back out. Under it:
   - the distance in big figures and the ring (metres), or the points and
     the running total against par (points);
   - "Struck 8.7 m out" and the xG: "Understat gave it a 4% chance" /
     "StatsBomb gave it a 10% chance";
   - **the mirror note** when the pin was on the wrong side: if the distance
     is over 5 m and the distance to the true spot mirrored left-to-right is
     under half of it, "Wrong side? Mirrored, you were 1.2 m off." It does
     not change the score;
   - **Watch it**: a link to a YouTube search for the scorer, match and year
     (a search, not an embed);
   - **Next goal**.
   The goal card shrinks to scorer and match.

   **Rings:** three discs centred on the true spot at 10, 5 and 2 m, each
   lightly shaded in its own colour (Outer gold, Inner green, Bullseye red),
   the tint stronger toward the centre. The three colours also step down in
   lightness, outside in, so they read apart without hue. Drawn in both
   scoring modes.
3. **Full time.** The total against par ("26 under par"), a stamp for any
   bullseyes (the one deliberate lean the identity allows), the pitch with
   all six pins, balls and lines, numbered; the six goals with scorer,
   match, and distance or points with the ring; the streak; the share text
   and a red Share button.

**The pin** is a flat red disc with a white ring, centred exactly on its
spot. **While dragging** (touch), the pin sits 48 px above the contact point
and a magnifier (a 96 px circle at 2.5×, above the pin) shows the pitch
lines around it; on release it stays where it was shown. A mouse drags the
pin directly, no offset. **Keyboard:** the pitch is focusable; arrows nudge
0.5 m (Shift 2 m), Enter throws. Coordinates are clamped to the half.

Footer on every screen: the data credit for the goals on this board
("Shot data: StatsBomb open data" with the logo; "Shot data: Understat").

**Motion**, the identity's three durations: the zoom in and out (420 ms),
the ball press (240 ms, the sticker overshoot), the line draw (240 ms), the
rings fade (240 ms). Reduced motion: no zoom, the finished reveal at once.

## Licences

Both sources are gated: the mode stays on the branch until both reply.

**StatsBomb** (Public Data User Agreement, updated 8 Sept 2023): for
research and "shared analytical understanding"; forbids providing the data to
third parties (1.2.1) and commercial use (1.2.2); requires the StatsBomb logo
on publications (1.4). Revealing one coordinate per thrown pin is arguably
publication of analysis, not redistribution: grey, not cleared.

**Understat**: no terms or licence published (footer "© understat
2017–2026"; the site carries ads). We would call its internal data endpoint
weekly, which it can change or block at any time (it already moved from
data embedded in the page to an endpoint). Repeated extraction of small
parts of a database can fall under UK/EU database right. Greyer than
StatsBomb.

What the code does about it:

- Commit only the coordinates and xG of chosen goals, never raw files.
- A coordinate reaches the browser only after its pin is thrown.
- Credit both sources on every screen that shows their goals, and on
  `/credits`. The StatsBomb logo comes from its media pack; ask Jonno before
  downloading it.
- Non-commercial. If Chain ever carries ads or a paid tier, both sources'
  data must go.

**Jonno, not code:** register at statsbomb.com/resource-centre; email
StatsBomb and support@understat.com to ask about game use, before any
public launch.

## Architecture

The pattern is Rondo's: the game in its own folder, thin route files.

| Path | What |
|---|---|
| `games/pin/lib/pitch.ts` | Metres geometry: both sources to metres, distance, mirror, clamp. Pure. |
| `games/pin/lib/score.ts` | Ring and points for a distance, par, board totals, share text, both modes. Pure. |
| `games/pin/lib/line.ts` | The generated line for a recent goal. Pure. |
| `games/pin/lib/progress.ts` | `pin.progress.v1`: plays and the streak. |
| `games/pin/server.ts` | Reads the data files; the board for a date (file or classics fallback) or a pack; a board without coordinates for the page; judging a throw. |
| `games/pin/data/` | `goals.json`, `packs.json`, `days/*.json`. Committed. |
| `games/pin/components/` | `PitchPin.tsx` (the board state), `Pitch.tsx` (SVG: lines, pin, ball, rings, zoom, magnifier), `GoalCard.tsx`, `Reveal.tsx`, `FullTime.tsx`. |
| `games/pin/pin.css` | Its stylesheet, on the album tokens. |
| `app/pin/page.tsx`, `app/pin/[date]/page.tsx`, `app/pin/pack/[id]/page.tsx` | Server components; ship the board without `at` or `xg`. |
| `app/api/pin/throw/route.ts` | `POST { board, goal, x, y }` → `{ at, distance, mirrored, xg }`. |
| `scripts/fetch-pin-classics.ts` | For each classic, loads its StatsBomb event file, finds the goal, writes `source`, `at`, `xg`. Fails loudly on no match, a penalty, or an own goal. |
| `scripts/build-pin-week.ts` | Recent goals from Understat and the next seven daily boards. |
| `games/pin/tests/` | The tests below. |

**Answers stay on the server.** The page gets scorer, match, date,
competition and line, never `at` or `xg`. `POST /api/pin/throw` validates the
board (a date with a board, or a pack id), the goal (on that board), and `x`,
`y` (finite, inside the half), then returns that goal's answer. A player can
fetch an answer with a dummy throw; the first throw is what counts locally,
the honesty model of any daily without accounts.

**Home.** A Pitch pin card in the home page's "also" section, beside Rondo
and Slugger.

## Testing

- `pitch.ts`: both conversions on the four shared Leicester v Manchester
  United goals (the two sources within 3 m of each other); Carlos Alberto
  right of centre; goal line → `y = 0`; distance; mirror; clamp.
- `score.ts`: ring boundaries at exactly 2, 5 and 10 m; points at 2, 5, 10,
  20 m; par on a known board; both share texts.
- `line.ts`: generated lines for each situation and body part; none contains
  a banned word.
- Content: every goal resolved, in the half, not a penalty or own goal,
  `line` clean of banned and gendered words; every board six distinct
  existing goals, one inside and one outside the area, par ≥ 42 m; no goal
  twice on a day's board; packs the same.
- Daily: the board for a date with a file; the classics fallback without
  one, the same on every run; day numbers from `PIN_EPOCH`; Chain's
  `dayNumber` unchanged.
- Progress: resume, first throw counts, streak over finished days.
- Route: rejects a bad board, an unknown goal, a goal not on the board,
  non-numbers, points outside the half; returns the answer.
- `npm test`, `npm run typecheck`, then the browser at phone (375) and
  desktop width, light theme: a full board in both scoring modes, the
  magnifier on touch emulation, a mirrored throw, reduced motion.

## Out of scope for the draft

Hand-placed goals; the Champions League; an async "beat my score" link;
recorded global averages; the scorer's photo; scheduling the week script.
