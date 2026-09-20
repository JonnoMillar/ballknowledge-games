# Slugger — football, played as baseball

**Date:** 2026-09-20
**Status:** First draft, built in this session
**Route:** `/slugger`. Shares the pool, the club crests, the search index and
the two typefaces with Chain. Its own stylesheet (`app/slugger/slugger.css`),
its own colours.

## The pitch

"Fancy a game of Slugger?" One phone on the table, two sides. The pitcher
throws a club; the batter names someone who played for it. Everyone knows
Kane played for Spurs — that's a single. Ryan Mason is a double. Grzegorz
Rasiak is a home run. Name someone who never played there and it's a strike;
three strikes and you're out; three outs and the other side bats. Three
innings. Most runs wins.

The phone is the umpire, not the game. The batter says the name out loud,
somebody types it, the phone rules on it, shows how deep the cut was, and
moves the runners.

## Why baseball fits

Football 501 works at the pub because it is verbal, turn-based, one rule, a
leg is a few names each, and every turn has a decision with a bust behind
it. Baseball gives all of that a shape it did not have:

- **The count.** Strikes and outs are a countdown everyone at the table can
  read. "Two strikes, two out, runner on third" is tension with no
  explanation needed.
- **The bases.** A hit is not one point, it is a runner who has to be
  brought home. Singles load the bases; the home run clears them. So the
  safe answer and the show-off answer are both worth having, at different
  moments — which is the whole of the batting decision.
- **The pitcher.** The fielding side has something to do. Every at-bat the
  pitcher holds three pitches and picks one, reading the batter and the
  runners.
- **It ends.** Three outs a half, three innings, ten to fifteen minutes.
  Extras if it's tied. Rematch is one tap.

## Rules, as the page states them

1. The pitcher picks a pitch: a club. The batter names a player who played
   for that club.
2. A hit is graded by how deep the cut is: single, double, triple, home run.
   Runners move that many bases. Cross home to score.
3. Never played there? Strike. Three strikes, you're out. Three outs, the
   other side bats.
4. Three innings. Most runs wins. Tied at the end — play on until it isn't.

### Detail

- **The pitcher's hand** is three clubs, one of each kind: a **fastball**
  (a giant — Barcelona, United), a **curveball** (a mid-size club —
  Leicester, Sampdoria), a **knuckleball** (a small one — Bolton, Empoli).
  A fastball will get hit, but usually for a single. A knuckleball might
  strike the batter out, or hang there for a triple. Reading the batter is
  the pitcher's game.
- **A hit's grade** is the fame of the *fact*: the player's fame (Wikipedia
  sitelinks) scaled by how much of a stint it was and how recent (the
  spell-weighted fame Chain already ranks by — `src/lib/fame/spell.ts`).
  Kane at Spurs is 96, Kane at Leicester is 25. Bands: single at 55 and
  over, double 38–54, triple 26–37, home run under 26. A short, old stint
  at a big club is a home run whoever it was, which is what the pub means
  by "remember when he was at…". A stint with no league appearances on
  record still counts — he was on the books — and grades as the deep cut
  it is.
- **A strike** is a name that never played for the club. The umpire shows
  the clubs they *did* play for — the "ahh" moment. Also a strike: the
  clock running out ("caught looking"), or "I've got nothing".
- **A foul ball** is a player already named this match. It's a strike,
  unless the batter is already on two — then the count stands, as in
  baseball. No player twice in a match.
- **Runners** advance by the bases of the hit, all of them, every hit. A
  home run scores everyone on base plus the batter (a grand slam with the
  bases loaded).
- **Innings.** Three by default; five and nine are options. The away side
  bats the top of each inning, the home side the bottom. If the home side
  leads going into the bottom of the last inning, they don't bat. If the
  home side takes the lead in the bottom of the last inning, the game ends
  there — a walk-off. Tied after the last: extra innings, whole ones, until
  someone leads.
- **Sides** have names and a lineup of one to four batters, who bat in
  order, carried over between innings as in baseball. Two mates is one
  batter each. Four is two-a-side.
- **The clock** is 30 s a pitch by default; 20, 45 and off are options.
- **The line score** is the scoreboard: runs per inning for each side, then
  R (runs), H (hits) and K (strikeouts).
- **The deck** is hand-picked (`src/lib/slugger/deck.ts`): about 150 clubs
  a British pub would rate, sorted into the three pitches by how many
  well-known players the pool has for them. No club is pitched twice in a
  match until its pile runs out. The pool is global and lists Tokyo Verdy
  above Tottenham by depth, so the deck is a list, not a query.

## What leaks, and what does not

The pool stays on the server. A pitch request sends the clubs already
pitched and gets back three clubs; a swing sends `{club, player}` and gets
back the verdict, the grade, the appearances, and on a miss the clubs the
player did play for. The search index (`/api/names`) is names only, as it
is for Chain, and shows nothing until a name is typed. Nothing that lists a
club's players ever reaches the browser.

## Identity

Chain is a sticker album on a cream page. Slugger is the ballpark on the
same cream page: the one dark thing is the **scoreboard**, a green board
with chalk-white figures, because that is what a scoreboard is, not
because the page is dark. What is its own:

- **Outfield green** (`--grass: #1F6F43`) is the band, the scoreboard and
  the swing button. **Infield dirt** (`--dirt: #C9A66B`) is the diamond.
  **Stitch red** is the strike, the out, and the HOME RUN stamp.
- **The diamond.** Drawn plainly, runners on it named: "Kane on 2nd". A hit
  moves them; a home run empties it.
- **The pitch** is the club's crest on a card with its kind printed on it.
  Three cards fanned in the pitcher's hand; the one chosen comes to the
  plate.
- **The call.** After every swing a card gives the ruling in the umpire's
  voice — "SINGLE. 317 league games for Tottenham." / "STRIKE. Never
  played for Stoke. Did play for:" — and a Next button, so the table
  reacts before the phone moves on.

No dark default. No terminal styling. Nothing listed.

## Layout

One column, phone first. Masthead; the line score; the diamond with the
count (strikes · outs) and who's at bat; then the panel that changes: the
pitcher's hand → the at-bat (search, clock, "Got nothing") → the call.
Full time is a card over the board with the line score and Rematch.

## Files

| Path | What |
|---|---|
| `src/lib/slugger/grade.ts` | The bands: fact-fame → bases. |
| `src/lib/slugger/deck.ts` | The three piles of clubs, by hand. |
| `src/lib/slugger/match.ts` | The match reducer: sides, lineups, innings, count, bases, runs. Pure, tested. |
| `src/server/slugger.ts` | The club index over the pool, the deal, the judged swing. |
| `app/api/slugger/pitch/route.ts` | A hand of three. |
| `app/api/slugger/swing/route.ts` | A swing, judged. |
| `components/slugger/*.tsx` | The page. |
| `app/slugger/page.tsx`, `app/slugger/slugger.css` | Route and stylesheet. |

## Known limits in this draft

- The pool has an era floor (careers from 1992 on) and gaps among the
  legends. The umpire is only as good as the album; the page says so.
- Grading is one global ruler. A club's own most famous player is a single
  if they're famous, whatever the club; the pitcher's kinds are what make
  small clubs pay.
- Same-phone only. No rooms, no network play.
