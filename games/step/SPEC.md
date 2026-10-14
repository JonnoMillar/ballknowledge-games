# Step chain — spec (decisions only)

2026-10-14. **Signed off by Jonno 2026-10-14: every recommendation taken.** Working id `step`, route `/step` until it has a name. Self-contained
in `games/step/` so it can move into the merged Chain hub later.

**The game.** One gap at a time. Step 1: PLAYER — ? — CLUB. The answer is
anyone who shared a club with the player and played for the club. Lock it in,
it is graded at once, then the screen slides to CLUB (same club) — ? — NEW
PLAYER, and so on. The givens alternate P1 C1 P2 C2 P3… Any valid answer
counts; the grade is how deep you went. Same daily for everyone, plus an
archive of past days.

## Decisions for Jonno

**1. Run length — recommend 4.** Givens P1 C1 P2 C2 P3: the run starts and ends
on a player, the four cards sit 2×2 on a phone, and it takes about as long as
a Spoofed day. 3 is too short for a run grade (one miss is a third of it). 5
ends on a club and drags. It is one constant (`STEPS`).

**2. Grade words — five, shown as "Ball knowledge: <word>".**

| Today | Proposed | Case | Cut (share of the field better known than you) |
|---|---|---|---|
| Common | **Basic** | bronze | < 10% |
| Uncommon | **Decent** | silver | < 25% |
| Rare | **Solid** | gold | < 45% |
| Niche + Gem | **Sharp** | sapphire | 45% and deeper |
| Grail | **Elite** | onyx and gold (the Grail case) | the deepest checkable answer, or deeper |

Niche and Gem merge because most picks land low; the low end is where the
steps need to be fine. Sapphire over diamond: diamond reads as silver.
Alternative words if those don't land: Fair, Good, Strong, Expert, Elite.
Recommend **one scale for the whole site**: Deep Cuts and the album switch to
the same five words, and old Niche/Gem cards become Sharp. Two scales for the
same ruler would confuse.

**3. A pick that doesn't fit — recommend one shot.** The step's card comes up
empty with a red ✕, and the run moves on. Retries remove the bet: the safe
play becomes "try something deep, fall back on the obvious name", so depth
costs nothing. (Alternative: one retry per step, at the cost of that tension.)

**4. The run grade — recommend the floor of the average.** Basic 1 … Elite 5, a
miss 0; the run's word is the average rounded down, floor Basic if anything
held. No number on screen, only "Ball knowledge: Sharp" over your cards (a
number on a good answer read as a loss on Chain). Rounding down means an Elite
run is four Elites: the per-card Elite is the trophy, the Elite run a feat.
(Alternative: round to nearest, so two Elites and two Sharps is Elite.)

**5. How each day is chosen — automatic, measured on the pool today.**
- Givens: fame 70+, 2–6 clubs (Deep Cuts' rule). Clubs: the biggest 60 in
  followed leagues (35 clubs: Milan, Chelsea, Sevilla, Porto, Everton…).
- A step is kept only if: the club is not in the given player's career (or
  every player at that club would fit), 25+ answers, 12+ of them checkable
  (fame 30+), and the most famous answer is fame 60+, so there is always an
  obvious way in.
- Measured: **1,643 steps pass**, over 102 givens and 35 clubs, median field 37
  (10th percentile 27). A run uses 4 steps, so no step ever repeats for over a
  year; no given within 21 days.
- Schedule like Spoofed: a committed `days.json`, a daily GitHub cron keeps it
  14+ days ahead. No hand upkeep.

**6. Name** — can wait until before merge. Rejected words to avoid: Casual
(Spoofed rank), Deep Cut (Krillion's tier).

## Changed after Jonno played it (2026-10-14)

Pack-opening reveal.
The linking club and the obvious answer shown after each step. Givens either
side of a club share no club; a step's shown answers fit no other step that
day. Givens British-placeable (Premier League spell, British, or fame 90+);
a Premier League club every day; given gap 14 days; a step may return after
120 days. Details in HANDOFF.md.

## Defaults I'll take unless you object

- No player twice in a run. Searched, never listed.
- The server judges each pick; the next given and the verdict come back
  together. Nothing about a step's field reaches the browser before the lock,
  and the deepest answers wait for the end of the run: step 1's answers all
  played for C1 and could answer step 2.
- The grade weighs both halves of the fact: the link to the player and the
  stint at the club (Kane at Leicester is deep; Kane at Spurs is not). Deep
  Cuts today weighs only the player link.
- End screen: the four cards, "Ball knowledge: <word>", then the Elite answer
  per step. Share line `<Name> #n · Ball knowledge: Sharp` plus one glyph per
  step, no names.
- Cards go into the existing album (one per player, best grade kept). Archive
  days play once each and collect like the daily. A reload resumes at the open
  step. Day #1 = 2026-09-19 like Chain and Spoofed, so the archive starts full.
- Deep Cuts stays live and untouched (apart from the words, if 2 is yes) until
  the hub merge.
