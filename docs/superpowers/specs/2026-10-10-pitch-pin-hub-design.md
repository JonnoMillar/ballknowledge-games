# Pitch pin: the hub, the scale and the laptop layout

> 2026-10-10. Builds on `2026-10-09-pitch-pin-library-design.md` (packs,
> shelves, data) and `2026-10-08-pitch-pin-design.md` (the throw, the
> reveal, licences). Where this spec and those disagree, this one wins.
> Mockups (approved): https://claude.ai/artifact/GFjr6JVcsh7r3BXoFXyUPq

## Why

Jonno played the build and found three things wrong:

1. **On a laptop the Throw button is below the fold.** At 1440×760 its top
   edge sits at 735 px; at 1366×657 it is off screen. One 560 px column
   with a pitch that scales with width is taller than a laptop window.
2. **Full time does not land.** "41.2 m, par 58, 17 under" asks the
   player to decode par, and says nothing about how good that was.
3. **The library is dull.** Uniform white cards, no introduction, no
   suggested action.

Research (summarised in the session, sources in the mockup reply): get
people playing at once and show rather than tell; one suggested action at
the top of a hub, with cards that show progress; a results screen that
builds to a clear grade, scales its celebration to the grade, keeps low
grades neutral and names the next target.

## Decisions

- **One scoring mode: points.** Each goal scores 0 to 100 on the existing
  curve (`points()`: 100 within 2 m, then `100·e^(−(d−2)/8)`). The **pack
  score** is the mean, rounded **down** to a whole number, so a 6-goal and
  a 9-goal pack compare. Metres stay as the fact behind each throw
  ("3.1 m off"). This settles launch step 3. `?score=points` and every
  metres-total and par reading go.
- **Par goes from the screen and from the code.** Nothing a player sees
  says par.
- **Five tiers on the pack score**, one scale for every pack:

  | Score | Tier | Colour |
  |---|---|---|
  | 90–100 | Pinpoint | ink `#141210` |
  | 75–89 | Deadly | red `#D62839` |
  | 60–74 | Sharp | green `#178A4C` |
  | 40–59 | Close | gold `#E2B53A` (ink text) |
  | 0–39 | Wide | silhouette `#C9C2B4` (ink text) |

  Benchmarked on all 31 packs, 200 simulated runs each: random tap median
  11; lazy pin (penalty spot) median 37, max 59.86 (floor 59); casual fan
  (~7.5 m typical miss) 51; decent (~5 m) 65; good (~3.7 m) 74; expert
  (~2.5 m) 84, Pinpoint about one pack in four.
- **The fairness rule moves onto the same scale.** `fair()` (round and
  classic packs, the ones we pick) becomes: the lazy pin's pack score is
  under 60, and the pack has goals from inside and outside the area. It
  replaces `PAR_PER_GOAL`. Every current round and classic pack passes both
  the old and the new rule (lazy scores 20 to 57). Month, season and club
  packs are official lists and are not held to it: a test on them would
  fail the daily job on a shortlist we cannot change.
- **No global average yet.** It needs other players' results and there is
  no server store. When hosting is chosen (launch step 2), results can be
  logged behind `/api/pin/throw` with no client change; a "you against
  everyone" spread is a later spec, shown only once a pack has enough
  plays. Until then the comparison is the fixed scale plus the player's
  own record.
- **Your record is derived, not stored.** Packs finished, average and best
  come from the existing `pin.progress.v1` store (every throw's distance
  is already there). No new storage key.
- **The demo is decoration that explains.** A looping animation, no coach
  marks, no practice goal. It uses an unnamed goal at a made-up spot, so
  it spoils nothing.

## The hub (`/pin`)

Top to bottom (phone; laptop below):

1. **Masthead** as now. Returning players get a "How it works" link in it
   that jumps to the section.
2. **The top card**, one of three:
   - **First visit** (this browser has thrown at no current pack): eyebrow
     "Famous goals, one pin each", headline "Where was it struck from?",
     the **demo**, then "Start here": the suggested pack (kind swatch,
     title, New badge, "8 goals") and a big red **Play**.
   - **A pack in progress** (some throws, not finished): **Carry on**. The
     pack's kind colour as art with this browser's pins and true spots so
     far, the title, points so far, "3 of 8 thrown" with ticks, and a big
     **Continue**.
   - **Otherwise**: **Up next**, the suggested pack with its kind art and
     **Play**, no demo. If every pack is finished: "Every pack played. New
     ones land each week." and no button.
3. **Your record** (only once a pack is finished): Packs, Average, Best
   with its tier stamp.
4. **How it works**, first visit only here (returning: at the foot of the
   page): three numbered tiles ("A famous goal is named." / "Pin where it
   was struck from." / "Up to 100 a goal. Inside 2 m is a bullseye.") and
   the tier scale bar with its five names, "Each pack lands on the scale,
   out of 100."
5. **Shelves**, each a row: This season, Classics, By season, By club,
   Earlier (round and month packs of past seasons). Empty shelves are left
   out. On a phone a shelf scrolls sideways; on a laptop it is a grid,
   six across.
6. Credit line as now.

**Suggested pack** (`suggest()`): the first pack in library order this
browser has started and not finished; else the first it has not started;
else none. Library order is shelf order, so "This season, newest first"
leads. `nextPack()` keeps its meaning (Next pack on Full time).

**Pack card**: a kind-coloured art band (top ~78 px phone, ~96 px laptop)
with the kind name and a cropped mini pitch (box and arc). A played or
part-played card draws this browser's pins and true spots in the art.
Below: title, subtitle, and a foot: unplayed "Not played" (plus New when
new); part "3 of 8"; finished the pack score and tier stamp.

**Kind colours** (art band, text on it):

| Kind | Name on card | Band | Text and lines |
|---|---|---|---|
| month | Goal of the Month | `#E2B53A` | ink |
| round | Round | `#1E6B45` | white |
| season | Season | `#23395B` | white |
| club | Club | `#7A1F35` | white |
| classic | Classic | `#141210` | white |

**The demo** (8 s loop, CSS keyframes, no JS): a placeholder goal card of
grey silhouette bars above a half pitch. A ripple, a pin drops and is
dragged into place, "Tap the pitch, drag to adjust" with a Throw chip that
presses, then the ball presses in, the rings fade up, the trail draws, and
"3.0 m, +88, Inner" rises in. Pin at (25, 19.3), ball at (22.5, 21).
`prefers-reduced-motion`: the final frame, still. The SVG has an
`aria-label` describing it.

## Throwing (`/pin/<id>`)

- **Per goal**: the result shows **+points** large with the ring badge,
  "So far" points, and the fact line leads with metres ("3.1 m off. Struck
  23.9 m out. …"). As today's points mode, now the only mode.
- **Laptop layout**, at `min-width: 900px` and `min-aspect-ratio: 1/1`:
  two columns in a ~1180 px container. Left (360 px): ticks, goal card,
  "So far", the hint, the Throw button pinned to the bottom of the column,
  "All packs". Right: the pitch, sized by height so the whole page fits
  the window: the pitch never pushes Throw (or Next goal) out of view.
  The result panel takes the Throw button's place in the left column.
- **Acceptance**: at 1366×657 and 1440×760 the whole pitch and the Throw
  button are on screen without scrolling, before and after a throw. The
  phone layout (375 px) is unchanged.

## Full time

Top to bottom:

1. **Score card**: "Full time", the pack score huge with "/100", and the
   tier stamp. Below it the scale bar (five segments sized 40/20/15/15/10)
   with a marker at the score. Then: "N off <next tier>." (or "Top tier."
   at Pinpoint), the bullseye count when there is one, and once this
   browser has finished two or more packs, "Your average is A; this is
   your best / second best / third best." (just "Your average is A."
   below third).
2. **The pitch** with every pin and true spot, numbered (as now).
3. **The list**: number, scorer, "3.1 m off · match", points, ring badge.
4. **Share text** and **Share** / **Next pack** (with the next pack's
   title under it) side by side, then "All packs".

**Motion**: list rows slide in one after another (150 ms apart); then the
score scales in, the marker slides along the bar from 0, and the stamp
lands. Sharp and up: the stamp slams (scale down from 2.2×). Wide and
Close: the stamp fades in, no slam. `prefers-reduced-motion`: all static.
Laptop: the score card and list in the left column, the pitch on the
right, same breakpoint as throwing.

**Share text** (no names, no positions):

```
Pitch pin · September's Goal of the Month
79 Deadly
🎯🟨🟩🟩🟨🎯🟩🟨
```

## Code

| File | Change |
|---|---|
| `games/pin/lib/score.ts` | Keep `ring`, `points`, `RING_NAME`, `MARK`. Add `packScore(ds)` (floor of mean points), `Tier`, `TIERS` (floor, name, colour), `tier(score)`, `nextTier(score)` → `{ name, gap } \| null`, `lazyScore(ats)`. Rewrite `shareText(title, ds)`. Remove `Mode`, `Tally`, `tally`, `par`, `againstPar`. |
| `games/pin/lib/round.ts` | `fair()` uses `lazyScore(ats) < 60`; `PAR_PER_GOAL` goes. |
| `games/pin/lib/progress.ts` | Add `record(store, cards)` → `{ packs, average, best, scores }` over finished packs that still match their size, and `suggest(order, store)` → `{ id, state: 'part' \| 'fresh' } \| null`. |
| `games/pin/lib/shelves.ts` | Shelves become This season, Classics, By season, By club, Earlier. |
| `games/pin/lib/types.ts` | Drop `par` from `BoardView` and `PackCard`; `BoardView` gains `kind`. |
| `games/pin/server.ts` | No par; `boardView` returns `kind`. |
| `app/pin/page.tsx`, `app/pin/[id]/page.tsx` | No `score` search param. The pack page's `order` carries `title` for the Next pack label. |
| `games/pin/components/Library.tsx` | The hub: top card, record, how it works, shelves. |
| `games/pin/components/PackCard.tsx` (new) | One card, with its art. |
| `games/pin/components/Demo.tsx` (new) | The looping demo. |
| `games/pin/components/Scale.tsx` (new) | The tier bar, with an optional marker; used by the hub and Full time. |
| `games/pin/components/PitchPin.tsx` | Points only; laptop layout. |
| `games/pin/components/FullTime.tsx` | The new Full time. |
| `games/pin/pin.css` | Kind and tier tokens, the hub, the demo keyframes, the laptop grid, the Full time motion. |

## Testing

- `score.test.ts`: `packScore` floors (79.1 → 79, 59.86 → 59); tier
  boundaries 39/40, 59/60, 74/75, 89/90, 100; `nextTier` gaps (79 →
  Pinpoint 11; 90 → null); `lazyScore` on a known set; the new share text.
- `round.test.ts`: `fair` rejects a pack the lazy pin scores 60+ on,
  accepts one under, still wants goals in and out of the area.
- `progress.test.ts`: `record` (no finished packs; a stale size ignored;
  average and best); `suggest` (part beats fresh; first in order; all done
  is null).
- `shelves.test.ts`: the five shelves and their order; empty ones left out.
- `content.test.ts`: unchanged in shape; round and classic packs pass the
  new `fair`.
- Browser, real dev server: 375×812 (phone), 1366×657 and 1440×760
  (laptop). Hub first visit, in progress and returning (seeded store);
  a pack played to Full time; Throw visible without scrolling at both
  laptop sizes; reduced motion shows static demo and Full time; no `"at"`
  or `"xg"` in either page's HTML.

## Out of scope

A global average or percentile (needs a store; later spec). Accounts.
Sound. Replaying a finished pack. Retitling pack data (season packs keep
"Goal of the Month winners 2025/26").
