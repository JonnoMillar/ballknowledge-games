# Rondo — a passing game for the pub

**Date:** 2026-09-20
**Status:** First draft, built in this session
**Route:** `/rondo`. Lives in `games/rondo/`. Shares the pool, the search index, the sticker and the
club crests with Chain. Its own stylesheet (`games/rondo/rondo.css`), its own
accent.

## The pitch

"Fancy a game of Rondo?" One phone on the table. Somebody is on the ball.
You pass to anyone who shared a club with them. Every club the pass goes
through is burnt for the rest of that ball, so Barcelona and Bayern are gone
after two passes and the ball gets harder with every touch. Can't find a
pass? You've lost it: take a bib. Three bibs and you're in the middle.

The phone is the referee, not the game. Players say the name out loud, the
phone confirms the link, shows the crest it went through, and burns the
club. Nobody has to know a career for certain; the ref does.

## Why this shape

Football 501 works at the pub because it is verbal, turn-based, one rule,
a leg is a few names each, a match is a few legs, and the bust (overshoot
and you score nothing) gives every turn a decision. Rondo keeps all of that
and swaps the stat for the link, which is what the pool is good at:

- **One rule.** Share a club, don't reuse a club, don't reuse a player.
- **Every turn is a decision.** A pass is also an attack: Kane via Spurs
  leaves Bayern open; Vardy via Leicester leaves Fleetwood and Halifax.
  Pass to someone the ref can't take it on from and it's a dead end — your
  bib. That is the bust.
- **It ends.** A ball burns at least one club per pass, so it cannot run
  forever; in practice ten to twenty passes.
- **Length.** A ball is a minute or two. Three bibs each is ten to fifteen
  minutes. Rematch is one tap.
- **Knowledge level.** "Who played for Bayern?" is pub level. "Where else
  did Vardy play?" is the ceiling.

## Rules, as the page states them

1. Someone's on the ball. Pass to a player who shared a club with them.
2. Every club a pass goes through is burnt for the rest of the ball. No
   club twice, no player twice.
3. Can't find one? You've lost it — take a bib. A pass nobody can take on
   is a dead end: your bib too.
4. Three bibs and you're in the middle. Last one standing wins.

### Detail

- A **ball** starts with a dealt player (famous, three or more clubs, at
  least two of them with a real shelf of players behind them) with every
  club open. The player who lost the last ball makes the first pass.
- A **pass** names a player. It holds if they share at least one open club
  with the carrier. All the shared open clubs burn, and the named player is
  now on the ball.
- A pass is a **dead end** if, after the burn, nobody in the album could
  take it on. The passer loses the ball. The ref checks this silently.
- A **loss** is: no shared open club; a player already named this ball; a
  dead end; the clock; or "I've got nothing". The loser takes a bib. The
  reveal shows the clubs that were open — the "ahh" moment.
- Two to four players, pass the phone. A player with three bibs is out of
  the rotation. One left standing is the match.
- The shot clock is 30 s by default; 20 s and off are options.
- One attempt per pass. Tap a name, then confirm the pass. A wrong pass
  costs the ball, so the confirm is deliberate.

## Identity

Rondo is a sibling of Chain: the same cream page, the same sticker, the
same two typefaces. What is its own:

- **The bib.** Training-bib orange, `--bib: #F26B1D`, is the one loud
  colour: the masthead band, the pass button, and the bibs on the
  scoreboard. A loss is a bib sliding onto your name.
- **The burn.** A crest that has been passed through goes to the burnt
  row, greyed and struck through. The row is the story of the ball.
- **The carrier.** One big sticker in the middle of the page: the player
  on the ball, on their signature club's ground. The trail of names it
  came through sits above it, small.

No dark default. No terminal styling. Nothing is listed: the search shows
nothing until a name is typed, and the carrier's open clubs are never shown
while the ball is live.

## What leaks, and what does not

The club index and the pool stay on the server. A pass posts `{carrier,
burnt, named, target}` and gets back a verdict, the clubs it went through
(with names and whether a crest exists), and on a loss the clubs that were
open. Nothing about the target's other clubs comes back on a held pass, so
the receiving player still has to know the career.

## Layout

One column, phone first. Masthead; scoreboard (names, bibs, whose pass);
the ball (trail, carrier sticker, burnt row); the pass box (whose turn, the
clock ring, a search field, results, the confirm button, "I've got
nothing"). A loss is a card over the ball with the reveal and "Next ball".
Full time is the same card with the result and two ways out: "New game" (the lobby, with the names and clock kept) and "Main menu" (the hub).

## Files

| Path | What |
|---|---|
| `games/rondo/lib/rules.ts` | `judgePass`, `openClubs`, `receivable`: the rule, pure. |
| `games/rondo/lib/match.ts` | The match reducer: players, bibs, turn order, the ball. Pure, tested. |
| `games/rondo/server.ts` | The club index over the pool, the deal, the judged pass with club views. |
| `app/api/rondo/deal/route.ts` | A starter. |
| `app/api/rondo/pass/route.ts` | A pass, or a forfeit, judged. |
| `games/rondo/components/` | The front page (`Lobby.tsx`, on the site's front-page kit) and the match (`Rondo.tsx`). |
| `games/rondo/lib/store.ts` | The match and last names in `localStorage`. |
| `app/rondo/page.tsx`, `app/rondo/play/page.tsx`, `app/api/rondo/` | The Next.js routes, thin (front page, match). `games/rondo/rondo.css` is the stylesheet. |

## Known limits in this draft

- The pool has an era floor (a career starting on or after 1992) and gaps
  in the legends (Maldini, Giggs, Cantona, Ronaldinho are not in it). The
  ref is only as good as the album; the page says so.
- Portraits exist only for players on shipped Chain boards; most stickers
  in Rondo show the silhouette on the club ground.
- Same-phone only. No rooms, no network play.
