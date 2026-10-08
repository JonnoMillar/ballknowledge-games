# Pitch pin — design

**Date:** 2026-10-08
**Status:** Approved in session (Jonno), first draft, on branch `feat/pitch-pin`
**Mockups:** https://claude.ai/artifact/Fr5aSwkm6ANdRXT9xw8JS3 (four phone
screens; private to Jonno)
**Background:** `docs/game-design-playbook.md` section 4 ("Pitch pin"), the
"Place" verb from section 3, and the sticker-album identity
(`docs/superpowers/specs/2026-09-19-sticker-album-identity-design.md`).

## The game

A famous goal is named: scorer, match, date, competition, and one line on
what happened. The player drops a pin on the attacking half of a pitch where
they think the shot was struck from. The true spot lands, a line joins the
two, and the distance appears. Six goals a board, one board a day, the same
board for everyone. The brag is a bullseye.

One throw per goal. Once a pin is thrown it is locked.

## Data: StatsBomb open data only

Decided with Jonno before design.

**Source.** StatsBomb open data (`github.com/statsbomb/open-data`), shot
events with `shot.outcome.name === 'Goal'`. Coverage is much wider than the
2015/16 Premier League: verified by loading real event files, it includes
World Cups 1970 and 1986 (selected matches), 2018 and 2022 (every match),
Euro 2020 and 2024 (every match), Premier League 2003/04 (every Arsenal
match) and 2015/16 (all 380), single Champions League finals 2003/04 to
2018/19, and Barcelona's La Liga matches 2004/05 to 2020/21. Checked
examples: Maradona's two goals v England 1986, Carlos Alberto 1970, Bale's
overhead kick 2018, Messi's header 2009, Bellingham v Slovakia 2024, Schick
from halfway 2021, Pavard 2018, Henry v Liverpool 2004.

Older goals with no free coordinates (Rooney v City 2011) are out of scope.
Hand-placed coordinates were considered and set aside; if they come back,
the method must be calibrated against goals StatsBomb also has, and the
score bands kept wider than the measured error.

**Licence** (StatsBomb Public Data User Agreement, updated 8 Sept 2023).
The data is for research and "shared analytical understanding". It forbids
distributing or providing the data to third parties (1.2.1) and commercial
exploitation (1.2.2), and requires the StatsBomb logo on any publication
(1.4). A game that reveals one coordinate per thrown pin is arguably
publication of analysis, not redistribution. It is a grey area, not
cleared. So:

- Only the coordinates of curated goals are committed, never event files.
- A coordinate reaches the browser only after the pin for that goal is
  thrown (the server judges; see Architecture).
- StatsBomb logo and credit line on every Pitch pin screen and on
  `/credits`. The logo comes from StatsBomb's media pack; ask Jonno before
  downloading it.
- Non-commercial. If Chain ever carries ads or a paid tier, the StatsBomb
  coordinates must go.
- **Jonno, not code:** register at statsbomb.com/resource-centre, and email
  StatsBomb to confirm game use before any public launch. Until then the
  mode stays on the branch.

**Understat** was considered and not used: no terms or licence found, it
rate-limits scrapers, and it only adds Premier League 2014 onwards.

**Precision.** StatsBomb locations are an analyst's tag, not tracking data.
The 2018 World Cup is tagged in whole yards. The bullseye radius (1.5 m) is
set at about that tagging error, so a bullseye means "as close as the data
can tell".

### Coordinates

StatsBomb's pitch is 120 × 80 units, attacking left to right, y = 0 on the
attacker's left. Pitch pin stores metres on a 105 × 68 m pitch, attacking
half only, goal at the top of the screen:

- `x` across, 0 at the attacker's left touchline, 68 at the right:
  `x = sb_y × 68 / 80`
- `y` out from the goal line, 0 at the goal line, 52.5 at halfway:
  `y = (120 − sb_x) × 105 / 120`

Checked against Carlos Alberto 1970 (a right back arriving on the right:
`sb_y = 57.5`, so `x = 48.9`, right of centre).

Distance is Euclidean in these metres. Every shipped goal must have
`y ≤ 52.5` (Schick's halfway-line goal is the furthest, `y ≈ 49.5`).

## Content

**A goal** (`games/pin/data/goals.json`, keyed by a short slug):

| Field | Example |
|---|---|
| `scorer` | `Jude Bellingham` |
| `match` | `England v Slovakia` |
| `date` | `2024-06-30` |
| `competition` | `Euro 2024, round of 16` |
| `line` | `An overhead kick in the fifth minute of stoppage time, with England a minute from going out.` |
| `source` | `{ matchId: 3941017, eventId: "…" }` (StatsBomb ids) |
| `at` | `{ x: 34.8, y: 8.7 }` (metres) |

`source` and `at` are written by the fetch script, never by hand.

**Rules every goal obeys** (1 to 3 held by a test, 4 by hand):

1. No penalties (`shot.type.name !== 'Penalty'`). Every penalty is the same
   spot.
2. In the attacking half: `0 ≤ x ≤ 68`, `0 ≤ y ≤ 52.5`.
3. The `line` gives no position away. Banned words, whole-word and
   case-insensitive: yard(s), metre(s)/meter(s), edge, box, area, post, left, right,
   centre/center, halfway, distance, range, close, far, long, near, angle,
   six. (So no "left foot" or "right foot" either.) The line may say what kind of goal it was (overhead kick, header,
   volley, solo run), which is the memory the player digs for.
4. Famous: a goal a British football fan has seen replayed. Hand-picked.

**A board** (`games/pin/data/boards.json`): an id (`001`, `002`, …) and six
goal slugs. Each board mixes eras and competitions (by hand), has at least
one goal struck from outside the penalty area and at least one from inside
it (tested), and no goal appears on two boards (tested). First draft: five boards, thirty
goals.

## The daily

- Board of the day from the existing helpers in `src/lib/daily.ts`:
  `dailyOrder` over the board ids and a day number from Pitch pin's own
  epoch (`PIN_EPOCH`, set to the launch date; `2026-10-08` for the draft).
  `dayNumber` gains an optional epoch parameter (default `EPOCH`, so Chain
  is unchanged) rather than the code being copied.
- `/pin` plays today's board. `/pin/NNN` plays an earlier one; a board whose
  day has not come yet is a 404. `/pin` lists earlier boards under the game.
- Progress in `localStorage` under `pin.progress.v1`: per board, each thrown
  pin and the server's answer for it. A refresh resumes where the player
  was. Only the first throw counts; a played board shows its full-time
  screen. Same no-accounts stance as Chain.

## Scoring: both, to compare

Jonno wants to play both before choosing. Distances are stored once; one
pure module turns them into either score. `?score=points` switches to
points; metres is the default. The mode is a view, not a save: switching
re-renders the same throws.

**Metres, darts-style.** The score is total metres off, lowest wins.

| Ring | Distance | Share mark |
|---|---|---|
| Bullseye | ≤ 1.5 m | 🎯 |
| Inner | ≤ 4 m | 🟩 |
| Outer | ≤ 8 m | 🟨 |
| Miss | > 8 m | ⬜ |

**Points per pin.** `points(d) = 100` when `d ≤ 1.5`, else
`round(100 × e^(−(d − 1.5) / 8))`: about 66 at 5 m, 35 at 10 m, 10 at
20 m. Out of 600. The same share marks by ring.

**Share text** (no names, no positions):

```
Pitch pin No. 3
26.2 m off            (or: 447 / 600)
🎯🟨🟩⬜🟩🟩
```

`navigator.share` where it exists, else copy to clipboard, as Chain's share
button does.

Note: Chain's daily has no score on purpose (a number made a correct chain
feel like a loss). Pitch pin is different: distance is the whole answer,
not a judgement laid over it.

## Screens

Phone first, one centred column, 16 px gutters, max-width 560. Light theme
only: cream page, white cards, ink, one red band. Big Shoulders Display for
the masthead, scorer, numbers; Libre Franklin for the rest; no tracked caps,
no middle-dot meta strings.

1. **Goal.** Red masthead "Pitch pin" with a pin mark, board number.
   "Goal 3 of 6" with six progress ticks. The goal card (white sticker):
   competition, scorer in caps, match and date, the line. The pitch below:
   **ink lines on a white card** (chosen over grass), attacking half, goal
   at the top, penalty spot and D, centre-circle arc at the halfway line.
   "Tap where it was struck from. Drag the pin to adjust." A red "Pin it"
   button, disabled until a pin is placed.
2. **Reveal**, in place on the same pitch. The ball (white, ink ring) presses
   down on the true spot; a dashed ink line runs from the pin to it; the
   distance in big figures with "Struck 8.7 m out" under it, and the ring
   name (metres) or the points and running total (points). Then "Next goal".
   The goal card shrinks to scorer and match.
   **Rings:** three discs centred on the true spot at 8, 4 and 1.5 m, each
   lightly shaded in its own colour (Outer gold, Inner green, Bullseye red),
   the tint stronger toward the centre, so closeness reads at a glance.
   Drawn in both scoring modes.
3. **Full time.** The total (metres or points), a stamp for any bullseyes
   (the one deliberate lean the identity allows), the pitch with all six
   pins, balls and lines, numbered; a list of the six with scorer, match,
   and distance or points with its ring; the share text and a red Share
   button.

The pin is a flat red disc with a white ring, centred exactly on the spot
(a drawing pin from above), so nothing points away from where it sits.

Footer on every screen: "Shot data: StatsBomb open data" with the logo.

**Motion**, from the identity's three durations: the ball presses down
(240 ms, the sticker overshoot), the line draws (240 ms), the rings fade in
(420 ms). Reduced motion: the finished reveal at once.

**Input.** Pointer events on the SVG: tap places, drag moves, keyboard
arrows nudge 0.5 m (Shift for 2 m) once the pitch has focus, Enter throws.
Coordinates are clamped to the half.

## Architecture

The pattern is Rondo's: the game in its own folder, thin route files.

| Path | What |
|---|---|
| `games/pin/lib/pitch.ts` | Metres geometry: StatsBomb to metres, distance, clamp. Pure. |
| `games/pin/lib/score.ts` | Ring and points for a distance, board totals, share text, both modes. Pure. |
| `games/pin/lib/progress.ts` | `pin.progress.v1` read and write. |
| `games/pin/server.ts` | Reads `goals.json` and `boards.json`; the board for a day; a board without coordinates for the page; judging a throw. |
| `games/pin/data/goals.json`, `boards.json` | Committed content. |
| `games/pin/components/` | `PitchPin.tsx` (the board state), `Pitch.tsx` (the SVG: lines, pin, ball, rings), `GoalCard.tsx`, `FullTime.tsx`. |
| `games/pin/pin.css` | Its stylesheet, on the album tokens. |
| `app/pin/page.tsx`, `app/pin/[id]/page.tsx` | Today's board, an earlier board. Server components; ship the board without `at`. |
| `app/api/pin/throw/route.ts` | `POST { board, goal, x, y }` → `{ at, distance }`. |
| `scripts/fetch-pin-goals.ts` | For each goal in `goals.json`, loads its StatsBomb event file, finds the goal shot, writes `source` and `at`. Fails loudly on no match or a penalty. |
| `games/pin/tests/` | The tests below. |

**Answers stay on the server.** The page gets scorer, match, date,
competition and line, never `at`. `POST /api/pin/throw` validates the board
id (`/^\d{3}$/`, exists), the goal slug (on that board), and `x`, `y`
(finite, inside the half), then returns that one goal's `at` and the
distance. A determined player can fetch an answer by throwing a dummy pin;
the first throw is what counts locally, which is the same honesty model as
any daily without accounts.

**Home.** A card for Pitch pin in the home page's "also" section, beside
Rondo and Slugger.

## Testing

- `pitch.ts`: StatsBomb conversion on known points (Carlos Alberto right of
  centre; goal line `sb_x = 120` → `y = 0`), distance, clamp.
- `score.ts`: ring boundaries (1.5, 4, 8 exactly), points at 1.5, 5, 10,
  20 m, totals, both share texts.
- Content: every goal resolved (`at` and `source` present), in the half, not
  a penalty, `line` free of banned words; every board has six distinct goals
  that exist, at least one from outside the penalty area and one from
  inside it; no goal on two boards.
- Daily: same board for a date on every run; day numbers from `PIN_EPOCH`.
- Route: rejects a bad id, an unknown goal, a goal not on the board,
  non-numbers and points outside the half; returns `at` and the distance.
- `npm test`, `npm run typecheck`, then the browser: phone (375) and
  desktop, light theme, a full board in both scoring modes, reduced motion.

## Out of scope for the draft

Hand-placed goals; Understat; an async "beat my score" link; recorded
global averages; the scorer's sticker photo on the goal card.
