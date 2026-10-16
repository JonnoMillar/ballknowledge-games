# Odd Man Out — state of play

**Updated:** 2026-10-16 (playtest round 1 changes below). Route `/odd-man-out` (front page) and
`/odd-man-out/play` (the match). Internal id and folder `bluff`, its first
working name, like Spoofed's `itk`. Branch `claude/blissful-lewin-d41d05`
(worktree `.claude/worktrees/blissful-lewin-d41d05`), cut from `main` at
43231e5. Merged to `main` 2026-10-16.

**Resume prompt:** "Read games/bluff/HANDOFF.md. Odd Man Out is merged to
main and live. Next: decide on a Higgsfield-generated icon for its hub tile
(it has none; the hub tile is bare, see Playtest round 1), then any
playtest round 3 notes."

## The game (Jonno, 2026-10-15)

Two or more players, one phone, turns. The bluffer sees a real starting XI
from a real match, in its formation, and swaps any one player in any
position for anyone (search over every player, Rondo's index). Cover
screen, pass the phone. The guesser sees the XI and taps the one they think
is fake while the bluffer stares at them. A guesser can lose up to two
lives a round before the reveal (wrong, wrong, reveal); three lives each in
total; several rounds, roles alternate. Lives numbers are named constants
(Jonno tunes them after playtesting). Options: year range, and "Help the
faker" (three plausible fakes: same club, era, position). Famous matches
keep it fair. "Clean sheet" (no swap, the guesser calls it) is parked for a
hard mode.

## Stage 1: data check (done 2026-10-15)

Lineups are not in our data. Two free candidates, both checked against the
real sources.

### StatsBomb open data

- 2,651 men's matches. Starting XIs with an explicit formation (`442`,
  `3412`, from the `Starting XI` event) and exact positions.
- Coverage is lumpy: full 2015/16 seasons of the PL, La Liga, Serie A,
  Bundesliga and Ligue 1 (380 each, mostly unfamous fixtures); every match
  of WC 2018 and 2022, Euro 2020 and 2024, AFCON 2023, Copa 2024; Messi's
  Barcelona league games 2004–2021 (~520); 16 single CL finals (2004–2019,
  plus 1971–73 and one 1999 group game); a handful of old WC games.
- Names are full legal names ("Wayne Mark Rooney", "David de Gea
  Quintana"), so matching to our pool is fuzzy name work.
- Licence: grey. The open-data agreement bars redistribution and
  commercial use and needs their logo (already on Pitch pin's launch
  checklist, `games/pin/HANDOFF.md`).

### Wikipedia

- Every final article carries both XIs in one table format
  (`|GK ||'''1''' ||[[Edwin van der Sar]]`), with position codes (GK, RB,
  CB, LB, DM, CM, AM, RW, LW, CF, RF, LF, RWB...). A scratch parser read
  both XIs from 98% of 204 articles: European Cup / CL finals 1956–2026,
  FA Cup finals 1946–2026, World Cup finals, Euro finals. Misses so far:
  2013 and 2021 FA Cup, 2014 and 2022 World Cup (a footnote inside a row);
  fixable.
- World Cup and Euro stage pages ("1998 FIFA World Cup knockout stage",
  "2006 FIFA World Cup Group C") carry the same tables for every match, back
  to at least 1990. That is several hundred more famous-ish matches.
- Every player is a wiki link, and a link resolves to a Wikidata QID, which
  is our pool's id. Matching is exact, no name guessing.
- Formation is a picture, not text. It can be drawn from the position codes
  (back line, holding, middle, attacking, front).
- Licence: lineups are facts; the text is CC BY-SA 4.0, which the credits
  page already acknowledges. Clean.

### The real limit: our pool, not the lineups

The pool starts at careers from 1992, so old XIs are mostly strangers to
it. XIs (finals only) with at least 10 of 11 starters in the pool:

| Years | XIs | 10+ of 11 in pool |
|---|---|---|
| before 1985 | 152 | 0 |
| 1985–89 | 24 | 0 |
| 1990–94 | 26 | 6 |
| 1995–99 | 24 | 11 |
| 2000–04 | 26 | 20 |
| 2005–09 | 24 | 23 |
| 2010–26 | 78 | 77 |

It matters for the bluffer, not the display: a fake has to come from the
pool, so in a 1988 final there is no player of the right era to plant.
Earlier years need the pool extended (the Chain pipeline, Wikidata), which
is a separate job.

### Recommendation (waiting on Jonno)

Wikipedia only: finals (European Cup / CL, FA Cup, World Cup, Euro) plus
World Cup and Euro knockout matches, an XI kept only when 10+ of its 11 are
in the pool. Year range 1995 to now. StatsBomb adds formation strings but
its licence is grey and its famous matches are mostly the same tournaments.

### Leaks to design out (noted now, built in stage 2)

- Every name is shown the same way: the pool's name when the player is in
  it, otherwise the Wikipedia link text. No shirt numbers, flags, portraits
  or captain marks: the fake has none of them, so any one of them would
  give it away.
- "Help the faker" for a national side is same nation, era and position
  (pool `nation`, `careers.json` stint years, pool `positions`).
- The fake can't be someone already in the XI (checked by id).

## Stage 2: playable draft (done 2026-10-15)

Jonno, 2026-10-15: Wikipedia only, finals plus World Cup and Euro
knockouts, 1995 to now. Name "Odd Man Out". No hub miniature yet. A faker
caught on the first tap loses nothing for now; rules get another look
after playtesting.

**Data.** `npm run bluff:sides` (`scripts/bluff/build-sides.ts`) writes
`games/bluff/data/sides.json`: 408 XIs from 267 matches (CL finals 55, FA
Cup finals 41, World Cup 183, Euro 129); 73 more dropped as too obscure
(`MIN_MEDIAN_FAME` = 40, the XI's median pool fame; quartiles 46/55/64).
Only miss: the 2021 FA Cup final. Imported by `server.ts`, so file tracing
ships it. Re-run when a final is played (manual for now; see below).

**Code.**
| Path | What |
|---|---|
| `lib/wiki.ts` | Wikitext to matches: the three box styles, `{{abbr}}` codes, `{{nowrap}}`, multi-line footnotes, kit titles or headings for national sides. |
| `lib/lineup.ts` | Position codes to lines (wingers with an AM else up front; wing-backs in midfield behind a back three), left on the left, formation, pool position classes. |
| `lib/match.ts` | The reducer: `LIVES` = 3, `MAX_LOSSES_PER_ROUND` = 2 (tune here), deal, plant, cover, guess, reveal, roles rotate past players who are out, rematch, `helpSet()` and `groupAt()` for Help the faker. |
| `lib/store.ts` | Match and last names/options in localStorage. |
| `server.ts`, `app/api/odd-man-out/deal` | A side in the year range the phone hasn't seen. |
| `components/Lobby.tsx`, `Setup.tsx` | Front page on the kit: names 2 to 6, year range (native selects), Help the faker on/off, Kick off. |
| `components/Game.tsx`, `Pitch.tsx`, `Swap.tsx` | The match. One red button a screen: Pass the phone, I'm <name>, That's the fake, Next round / Rematch. Every change through `smooth()`. |
| `bluff.css` | `bf-` classes; the setup form is Rondo's, copied. |

Hub: a tile with no miniature gets `.hub__tile--bare` (words fill the tile);
`GameCard.icon` is optional. Rondo's wide-tile line moved into its
`line` field. Credits name Odd Man Out and its Wikipedia source.

**Checked 2026-10-15.** Typecheck clean; `npm test` 1,754 passed (24 of them
Odd Man Out: reducer, wiki parser on a trimmed real page, lines, and the
shipped file: 11 a side, one keeper, unique keys, only id/name/pos per
player); prod build clean. Browser (dev server, Playwright, 375×812 and
1200×900): hub tile, hub to front page morph, setup, plant with help chips
and search, cover, a wrong tap (life lost, slot greyed), the right tap,
reveal, next round with roles swapped, full time ("Ann wins") and Rematch
(lives back to 3, seen kept). No horizontal scroll, no console errors.
Not covered: a real phone, reduced motion, a match of 3+ players in the
browser (the reducer tests cover the rotation).

**Known limits.**
- Display names are the pool's, so a few read oddly ("Marcelo Vieira" for
  Marcelo). Real and fake use the same source, so it doesn't leak; the fix
  is pool aliases (the gap `src/lib/short-name.ts` notes).
- Odd man out of the pool: about one starter in 20 isn't in it (e.g.
  Ronaldinho 2002) and shows by his Wikipedia name; he can't be searched,
  only swapped out.
- Help the faker is "same club that season" from `careers.json` stint years,
  which are calendar years: a few picks are a season off or were out on
  loan (Morgan Rogers for City 2023). National picks need two years of
  career by the match.
- New finals are not added by themselves: re-run `npm run bluff:sides`. A
  yearly GitHub Action would fit Jonno's no-manual-upkeep rule; not built.
- The setup form is duplicated from Rondo; move it to `components/` when
  this merges.
- At 1200 wide the two pub tiles share the hub's bottom row unevenly (Odd
  Man Out under Chain, a gap beside it). Revisit with the miniature.

**Open for Jonno:** playtest the lives (3, two wrong taps a round); whether
the faker should pay when caught first time; `MIN_MEDIAN_FAME`; the hub
miniature when wanted (Higgsfield, his yes first); then merge to `main`
(root HANDOFF gets one games-index line).

## Playtest round 1 (Jonno, 2026-10-16)

Done: front-page headline "Can you find the mole?" (the game's name, hub
tile and masthead are still Odd Man Out, say if they should change);
crest or flag each side of the scoreline and on the pitch's halfway line
(`lib/team.ts` maps every team in the data to a club id or nation id, tests
hold all 81; `components/TeamBadge.tsx`; flags are `ClueBadge`'s drawn ones,
now exported as `Flag`, plus Georgia, Northern Ireland, Yugoslavia).
Help the faker is now one keeper and two each for defence, midfield and
attack, drawn once a round (`HELP_COUNT`), so every player in a group sees
the same ones; shown as the pitch's own white cards (`Help.tsx`), tap or
drag onto the pitch (`useCardDrag.ts`, pointer events, works on touch).
The reveal turns the fake's card over to the real player's, the fake kept
on a tab above it. Abandon match and New game gone: the end has Rematch
(red) and Back to main menu (plain button, `bf-menu`, goes to the front
page; the masthead Back is the way out mid-match). Help the faker is a
sliding switch with an (i) that opens a short note. Mini titles are an
eyebrow (a short rule and small caps, `bf-eyebrow`), not pills. How it
goes is a looping demo phone (`HowDemo.tsx`) with four steps to jump to.
Lives are hearts (`Lives.tsx`) in the game's teal, not red: red stays the
brand and the action. A lost heart pops and floats away.

Open: Back to main menu goes to the front page, not the site hub. The
search results are not draggable, only the suggested cards. Dev overlay
shows "Transition was skipped" from `smooth()` in `src/lib/motion.ts`
(shared, unhandled `t.finished` rejection, harmless; not touched on this
branch).

## Playtest round 2 (Jonno, 2026-10-16)

Done: flags are the real ones (flag-icons, MIT, copied to `public/flags`
with its licence; Yugoslavia's from Commons; credits page says so): the
drawn flags added in round 1 are gone and `ClueBadge` is back as it was.
Clubs use the real crests via `ClubBadge`. Suggested cards show only after a
position is tapped, and only that position's. The (i) note is a short white
card. The demo no longer plays by itself: it stays on the step tapped, tap it
again to replay. On a laptop (900px up) the pitch sits beside the head and
controls (`bf-stage`), checked at 1366x768 with no scroll, footer included.

## Icon (2026-10-16)

Jonno likes the miniature direction; the name and objects are not final.
One candidate generated (his yes for exactly one): a needle-felted mole on a
molehill on the felt disc with one straight white pitch line. Higgsfield job
`5355225a-4e58-48d3-81a8-747f2c504e3b` (gpt_image_2_5, reference
`docs/hub-icon-reference.png`). Not cut out, cropped or on the hub yet; show
Jonno first. Pitch lines on any icon must be ones that exist on a real pitch
(rules in `docs/new-game-build-lessons.md` 1.6).
