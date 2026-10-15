# Season line (working name) — state of play

Branch `claude/intelligent-cannon-7f05ea` (worktree of the same name), cut
from `main` at 43231e5. Site-wide notes: root `HANDOFF.md`. The brief is
Jonno's decision of 2026-10-15 in `docs/game-design-playbook.md` section 4.

A Premier League club's league position game by game, drawn as a line. Guess
team + season, five guesses. The line grows by fifths (8, 15, 23, 30, 38
games); each wrong guess adds a hint: 2 a squad regular (not the star), 3
another club's line on the same chart, 4 a second squad player, 5 the club's
top scorer with tally. Team locks green once right; season feedback up/down.
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
