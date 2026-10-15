# Bluff (working name) — state of play

**Updated:** 2026-10-15. Branch `claude/blissful-lewin-d41d05` (worktree
`.claude/worktrees/blissful-lewin-d41d05`), cut from `main` at 43231e5.
The name is a working name: ask Jonno before naming it.

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

## Stage 2: playable draft (in progress, 2026-10-15)

Jonno approved Wikipedia only, finals plus World Cup and Euro knockouts,
1995 to now.

**Done and tested** (typecheck clean, `npm test` 1,754 passed):
- `scripts/bluff/build-sides.ts` (`npm run bluff:sides`) writes
  `games/bluff/data/sides.json`: 408 XIs from 267 matches (CL finals 55,
  FA Cup finals 41, World Cup 183, Euro 129). 73 more dropped as too obscure
  (`MIN_MEDIAN_FAME` = 40, the XI's median pool fame). Only miss: the 2021
  FA Cup final.
- `lib/wiki.ts` (box styles `{{Football box`, `{{footballbox`,
  `{{#invoke:football box`; `{{abbr|RB|..}}` codes; `{{nowrap}}`;
  multi-line footnotes), `lib/lineup.ts` (codes to lines, formation, left
  on the left), `lib/match.ts` (the round and match reducer; `LIVES` = 3,
  `MAX_LOSSES_PER_ROUND` = 2, roles rotate, help suggestions), `server.ts`
  and `POST /api/bluff/deal`.
- Front page written, not yet routed: `components/Lobby.tsx`, `Setup.tsx`
  (names 2 to 6, year range, Help the faker on/off).
- Hub entry and `Hub.tsx` change (tile without a miniature) are in the
  working tree, **not committed**: the tile would link to a page that
  doesn't exist yet.

**Left to build:**
1. `components/Bluff.tsx` (the match on `/bluff/play`): scoreboard with
   lives; plant (tap a slot, search via `/api/names` + `src/lib/search`,
   help chips from `suggestions()`, red "Pass the phone"); cover ("Hand it
   to Ben", red "I'm Ben"); guess (tap, red "That's the fake", wrong slots
   marked real); reveal (fake marked, the real name under it, red "Next
   round", or full time with Rematch). Every phase change through
   `smooth()`, elements `.vt`.
2. A pitch component: lines bottom (keeper) to top, names split first name
   small / rest big, the same for real and fake. No numbers, flags or photos.
3. `games/bluff/bluff.css` (`bf-` prefix; setup styles copied from Rondo's,
   to move to shared `components/` when this merges), `app/bluff/page.tsx`
   (Lobby with `YEARS`, count), `app/bluff/play/page.tsx`, credits line.
4. Verify at 375 and 1200, commit with the hub entry, stage gate.

**Open for Jonno:** the name; a hub miniature (Higgsfield, needs his yes);
whether the bluffer should pay anything when caught first time (now
nothing: only the guesser loses lives); `MIN_MEDIAN_FAME`.
