# Season line (working name) — state of play

Branch `claude/intelligent-cannon-7f05ea` (worktree of the same name), cut
from `main` at 43231e5. Site-wide notes: root `HANDOFF.md`. The brief is
Jonno's decision of 2026-10-15 in `docs/game-design-playbook.md` section 4.

A Premier League club's league position game by game, drawn as a line. Guess
team + season, five guesses. The line grows by fifths (8, 15, 23, 30, 38
games); each wrong guess adds a hint: after miss 1 the nearest rival's line,
2 a squad player (the better known of the two stored), 3 the next two rivals'
lines, 4 the top scorer with tally. Team locks green once right; season feedback up/down.
After the last guess: the answer and that year's champion. Daily from
2000/01; endless mode over a year range the player picks.

## Gate 1: data check (2026-10-15)

All free, no keys, no cost.

**Results: football-data.co.uk.** `https://football-data.co.uk/mmz4281/<yyyy>/E0.csv`
(`0001` = 2000/01; the `www.` host 302s to the bare one, so follow
redirects). Every PL season 1993/94 to 2025/26 downloads complete (380
games; 462 in the two 22-club seasons), plus 2026/27 in progress (60 games
on 2026-10-15). Columns vary by season (a `Time` column appears later), so
parse by header name. 51 clubs, short names (`Man United`, `Nott'm Forest`).

**Tables.** Position after each of the club's games = the table on that
date, all games so far, sorted by points, goal difference, goals for.
Checked on real data: champion and bottom three right for all 33 complete
seasons; Leicester 15/16, Liverpool 13/14 (2nd after 38), Newcastle 95/96
(1st for 29 games), West Brom 04/05 (20th at Christmas, 17th) all as
remembered. Points deductions are not in the CSVs; four PL cases are a
constant table (Middlesbrough 96/97 −3, Portsmouth 09/10 −9, Everton 23/24
−10 then −6 on appeal then −2 more, Forest 23/24 −4) and land right
(Everton 15th, Portsmouth 20th). A future deduction needs one line added.

**Top scorer: Wikipedia club season articles, infobox `league_topscorer`.**
Coverage of 1993/94 to 2025/26 is 100% (every club-season), once Leeds is
looked up as `Leeds United A.F.C.` (its season articles keep the old name).
2026/27 is 19 of 20 (Palace not filled yet; irrelevant, the season is not
playable until it ends). Spot-checked: Henry 30 (03/04), Vardy 24 (15/16),
Suárez 31 (13/14), Agüero 23 (11/12), Kenny Miller 4 (Derby 07/08). Values
are wikitext (`<br>[[Luis Suárez (Uruguayan footballer)|Luis Suárez]] (31)`)
and ties list several names (`Neves<br>Podence<br>(6 each)`); both parse.
This is the league tally, not all competitions.

**Squad players: `data/careers.json` stints.** All 51 clubs match a stint
`title`. With "stint covers the whole season, 20+ league apps a season on
average", 2000/01 to 2025/26 has 8+ candidates for 464 of 520 club-seasons;
the thinnest is 1. Noise found: infobox years include loans out and the
first/last half-seasons (Fàbregas counts for Arsenal 03/04 with no league
games; Konchesky for Leicester 15/16 while on loan at QPR). Plan: prefer
seasons strictly inside a stint (not its first or last year), fall back to
edge seasons only when fewer than two interior players exist, and never use
the top scorer as a squad hint.

## Open questions for Jonno (gate 1)

1. **Binary search.** 26 daily seasons, up/down arrows, five guesses:
   2^5 = 32 > 26, so a player who gets the team on guess 1 can always bisect
   to the season without reading the line. Hiding season feedback until the
   team is locked only helps when the first team guess is wrong.
2. **Step 3's second line.** The champion's line (to the same game) names
   a club that won in 1 to 8 seasons, which with the shape is often decisive
   (Leicester, Liverpool). A rival is weaker.

**Jonno's answers (gate 1, 2026-10-15):** arrows on every guess, from the
first ("not very rewarding to get it in 5 if they got the club in 1");
step 3 is the nearest rival, named (the club whose line tangled most).

## Draft build (2026-10-15) — gate 2, playable

Play it: `npm run dev`, then `/season-line` (front page) and
`/season-line/play` (today) or `/season-line/play?from=2000&to=2010` (endless).

- Data: `npm run season-line:update` (`scripts/season-line/update.ts`) fetches
  any finished season not yet in `data/seasons.json` (results + raw
  `league_topscorer` field, retried politely: Wikipedia rate-limits bursts),
  rebuilds boards (`--boards`), tops up `data/days.json` (append-only).
  `.github/workflows/season-line.yml` runs it daily once on `main`. A club new
  to the PL gets a guessed name and article (warning, not a failure); add it
  to `lib/clubs.ts` for a proper name. Real run: 33 seasons, 268 boards (385
  flat lines dropped, 11 without hints), 204 daily-grade; schedule to
  2026-12-14. `EPOCH` 2026-10-15 is a draft date: reset it, and rebuild
  `days.json`, at launch.
- Stories (`lib/drama.ts`): title, race, chase, collapse, escape, drop,
  surge, boom/slump (vs the club's median finish). Daily = 2000+ and
  story score + 2 x club fame >= 3 (keeps every champion, Invincibles too).
- Server (`server.ts`) judges every guess; answer only when done. Ids: a date,
  or `e<n>-<from>-<to>` for endless. Demo board Newcastle 95/96 never dealt.
- Screens: front page on the kit (teal ground `#1F5F57`, today's line so far
  as the hero picture, red Play; once done the red moves to Endless); How it
  goes (Newcastle 95/96 vs Man United); Endless with a year range. Game: the
  chart (top four and bottom three shaded, the rest of the season paper, new
  games draw in), hint chips, five guess rows (club green once right, season
  ▲/▼), native selects for club and season (season list = that club's PL
  seasons), share line `🟩⬆️`-style.
- Checked 2026-10-15: `npm run typecheck` clean; `npm test` 1,747 passed
  (56 files); prod build clean (only the site-wide Big Shoulders font
  warning); Playwright at 375 and 1200: front page, a daily played to a win
  in 4 (line grew 8/15/23/30, hints in order, club locked green, reveal with
  champion, red moved to Endless), endless deal. No console errors.
- Gotcha: Playwright screenshots right after a guess can show the frame
  before the view transition; the DOM is right, take the shot again.

**Not done / for Jonno:**
- Name (working name only) and a hub tile (needs a miniature: Higgsfield
  credits, ask first). Until then it is not on the hub and not in `src/games.ts`.
- Squad hints are estimates from careers stints (a player's season inside a
  spell, 20+ apps a season on average); expect the odd wrong one.
- Tied positions break by name (the PL uses head-to-head after goals).
- Not checked: a real phone, Share sheet, reduced motion, a deploy.

## Playtest round 1 (2026-10-16)

Jonno's playtest notes, done: games axis ends at the last game shown (8, 15,
23, 30, 38) and the line grows into it (`Chart.tsx` draws at its box's pixel
size, tweens the axis); chart left, clues + guess box right on laptop (the
front page's 1000px), phone stacks chart, guess box, clues; season list is
every year in range for any club (no hint from the list); arrows green up /
red down; hidden club = `?` badge, crest once named; rivals are crest badges
(no text clue); clue slots are grey missing stickers that stick down when
earned; line colours per club in `lib/clubs.ts` `COLOUR`.

## Playtest round 2 (2026-10-16)

PL lion (`public/season-line/pl-lion.png`, from Jonno) tops the chart card.
Crests have no ring; the hidden club is a solid `?` disc. Hovering a line
(or its badge) brings it forward, dims the rest, tags rivals with their name.
Axis titles `Games` / `Position`. Roomier reveal card.

**Bonus:** solve by guess 4 (before the top scorer clue was earned) and that
slot becomes one guess at the season's top scorer (datalist of every board's
scorer; full name or surname, accents ignored; `scorerMatches` in
`server.ts`). Right = green "Bonus" card and a ⭐ on the share line; wrong =
"Missed" with the answer. Server decides (`view(id, guesses, bonus)`), the
guess is kept in `seasonline.bonus.v1`. Solved on guess 5 or missed: no bonus.

**How it goes** is a live loop (`How.tsx`): a real board (Newcastle 95/96)
plays its five steps and the reveal, rules light in step. Lobby: How and
Endless are full width.

## Playtest round 3 (2026-10-16)

Front page: the coloured card holds both ways to play, today's daily on the
left and Endless (years + button) on the right; the red button is on
whichever is not done. The live How it goes card is back underneath (paper,
`How.tsx`: demo chart + clues + a guess row, rules lit in step). On the
board: a right year locks (green) just as a right club does; a finished
board drops the empty guess rows; windows under 700px high tighten so the
whole board stays on screen (checked 1280x560, 1366x768, 390x740). The
unused mini chart mode is gone.

## Hub tile and icon (2026-10-16)

On the hub. Icon: `public/hub/season-line.webp`, one Higgsfield generation
(gpt_image_2_5, job `6bfa35fc-beb2-405c-86e6-1843fdbd6e78`, Chain reference)
and one cut-out (`04f17760-6e43-4a63-8663-db9b7da74ee5`), cropped with the
standard box. Jonno steered the concept: a cream wool cord in a sharp
zigzag, white axis lines in the disc's corner (two lines, no arc), and a
mustard shield with a `?` at the end of the line (the game's hidden-club
disc, as a club-badge template). First try (a smooth cord, round `?` disc)
read as a worm. `GAMES` entry in `src/games.ts` (line "Name that season",
tag Daily, ground `#1F5F57`, `dailies: ['season-line']`); credits line on
`/credits` (football-data.co.uk, Wikipedia, the lion); root `HANDOFF.md` row
updated. Checked: typecheck, 1,777 tests, prod build, hub in the browser
at 1366x768.

**Open on the hub:** with three square tiles and two wide ones the 4-column
board has one hole, bottom right (pin moved last in `GAMES` so the hole sits
at the end, not mid-board). The page is ~1020px tall at 1366x768, so it
scrolls (it did before this tile). Season line's ground is close to Odd Man
Out's teal (`#14615B`).

**Before launch:** `EPOCH` (2026-10-15) in `lib/day.ts` is a draft date; reset
it and rebuild `data/days.json`. The Premier League lion
(`public/season-line/pl-lion.png`) is the league's trademark: decide if it
stays on a public site. A name (working title only).
