# Slugger — football, played as baseball

**Date:** 2026-09-20 (second shape, same day)
**Status:** Built. The first shape was played once and cut down; see "What
the first draft got wrong" at the end.
**Route:** `/slugger`. Shares the pool, the club crests, the search index and
the two typefaces with Chain. Its own stylesheet (`app/slugger/slugger.css`),
its own colours.

## The pitch

"Fancy a game of Slugger?" One phone on the table, two sides. The pitcher
throws a club; the batter names someone who played for it. Throw Barcelona
and they'll hit it — but it's only a single. Throw Bolton and it's an out,
or a home run. Three batters a half, three innings, most runs wins. Ten
minutes.

The phone is the umpire, not the game. The batter says the name out loud,
somebody types it, the phone rules on it and moves the runners.

## Rules, as the page states them

1. The pitcher picks a pitch — a club. The batter names a player who played
   for it. One swing: a hit, or an out.
2. A hit is worth what the pitch was worth. Fastball single, curveball
   double, slider triple, knuckleball home run. Runners move up; anyone on
   second or third comes home.
3. Three batters a half. Then the other side bats, and anyone left on base
   is stranded. No name twice in a match — that's a foul, swing again.
4. Three innings, most runs wins. Tied at the end, play on till it isn't.

### Detail

- **The pitcher's hand** is four clubs, one of each kind, dealt fresh every
  batter: a **fastball** (a giant — Barcelona, United), a **curveball** (a
  club with a shelf of names — Leicester, Sampdoria), a **slider** (one you
  have to think about — Stoke, Bologna), a **knuckleball** (a small club —
  Brentford, Empoli). The card says what a hit off it is worth.
- **Knuckleballs are three a side per game.** The small club is a card you
  spend when the bases are loaded, not a setting you leave on.
- **The runners.** Everyone advances by the hit; a runner on second or third
  comes home on any hit. This is what makes the safe pitch cost something:
  three fastball singles concede exactly one run, so the off-speed pitch is
  always a gamble against a run that is otherwise coming.
- **An out** is a name that never played for the club (the umpire shows the
  clubs they *did* play for — the "ahh"), the clock running out, or "I've
  got nothing". No count: one swing a batter.
- **A foul** is a name already hit this match. The line says so; the batter
  swings again at the same pitch, clock still running.
- **Innings.** Three by default; five and nine are options. Away bats the
  top, home the bottom. If home leads going into the bottom of the last,
  they don't bat (the board shows an X). If home takes the lead in the
  bottom of the last, it's over there — a walk-off. Tied after the last:
  whole extra innings until someone leads.
- **Sides** have names and a lineup of one to four batters, who bat in
  order, carried over between halves. Two mates is one batter each.
- **The clock** is 30 s a pitch by default; 20, 45 and off are options.
- **The call** after every swing is a stamp — SINGLE, OUT, GRAND SLAM —
  and the fact under it, and then the game moves on by itself (a beat and
  a half for a hit, three for an out with its clubs). A tap moves on
  sooner. No Next button.
- **The line score**: runs per inning, then R, H, O.
- **The deck** is hand-picked (`src/lib/slugger/deck.ts`, ~200 clubs a
  British pub would rate) and tiered into the four kinds by how many
  well-known players the pool holds for each. No club is pitched twice in
  a match until its pile runs out. The pool is global and lists Tokyo Verdy
  above Tottenham by depth, so the deck is a list, not a query.

## The pitcher's decision, which is the game

Expected runs off a fastball are about one per three batters, whoever is
batting. Expected runs off a knuckleball are four times the chance the
batter knows a name at the club. So: against a mate who knows everything,
throw fastballs and take the one run; against a mate who doesn't, throw
the nasty stuff and hope for nothing. With runners on, every pitch is that
sum again with the bases weighted in. That is the whole of pitching in
baseball, and it fits on one card.

## What leaks, and what does not

The pool stays on the server. A pitch request sends the clubs already
pitched and gets back four clubs; a swing sends `{club, player}` and gets
back hit or miss, the appearances, and on a miss the clubs the player did
play for. The search index (`/api/names`) is names only, as it is for
Chain, and shows nothing until a name is typed. Nothing that lists a club's
players ever reaches the browser.

## Identity

Chain is a sticker album on a cream page. Slugger is the ballpark on the
same cream page: the one dark thing is the **scoreboard**, a green board
with chalk-white figures, because that is what a scoreboard is, not
because the page is dark.

- **Outfield green** (`--grass: #1F6F43`) is the band, the scoreboard and
  the swing button. **Infield dirt** (`--dirt`) is the diamond. **Stitch
  red** is the out, the knuckleball and the HOME RUN stamp.
- **The diamond**, runners on it by name: "Navas" on first. Beside it, the
  batters this half and the knuckleballs the pitcher has left.
- **The pitch** is the club's crest on a card, its kind on the band at the
  top and what it's worth at the bottom. Four cards in the pitcher's hand.

No dark default. No terminal styling. Nothing listed.

## Files

| Path | What |
|---|---|
| `src/lib/slugger/grade.ts` | Kind → bases, and the ruler the deck is tiered with. |
| `src/lib/slugger/deck.ts` | The four piles of clubs, by hand. |
| `src/lib/slugger/match.ts` | The match reducer: sides, lineups, innings, bases, runs, the knuckleball budget. Pure, tested. |
| `src/server/slugger.ts` | The club index over the pool, the deal, the judged swing. |
| `app/api/slugger/pitch/route.ts` | A hand of four. |
| `app/api/slugger/swing/route.ts` | A swing, judged. |
| `components/slugger/*.tsx` | The page. |
| `app/slugger/page.tsx`, `app/slugger/slugger.css` | Route and stylesheet. |

## What the first draft got wrong

The first shape graded a hit by how *obscure* the name was (the
spell-weighted fame Chain ranks by — Kane at Spurs a single, Kane at
Leicester a home run), gave every batter three strikes, ended a half on
three outs, and made the pitcher pick from three clubs with no cost. It was
played once and three things were wrong:

- **The grade was invisible.** The batter couldn't aim for a double; the
  home run was a surprise, not a decision. Now the pitch says what it's
  worth before the swing.
- **The big club was never worth throwing.** A fastball couldn't get anyone
  out, so the pitcher's choice was no choice, and halves that end on outs
  never ended. Now the fastball is the *safe* pitch — a single, and a run
  every three of them — and the half is three batters whatever happens.
- **Too long.** Three strikes a batter, three outs a half, and a Next
  button after every pitch: four taps a swing and twenty minutes. Now one
  swing a batter, nine swings an inning, and the call moves on by itself.

## Known limits

- Untested at a real table beyond the author. The tiers and the
  knuckleball budget are the numbers to move first.
- The pool has an era floor (careers from 1992 on) and gaps among the
  legends. The umpire is only as good as the album; the page says so.
- Same-phone only. No rooms, no network play.
