# The lock-in reveal — stamps, twine, and the Pointless column

**Date:** 2026-09-11. Mockup: `design/reveal-variants.html`, variant A (chosen).

## Why

The sealed sheet had one moving part — a 2.6px string drawing itself — and it
read as a dotted computer line. The depth gauge was a 4px track on which 6th
of 16 and 14th of 16 were indistinguishable. The breakdown under the pinboard
was two grey boxes of prose restating what was already on the cards.

## The sequence

Left to right, one link at a time (`LINK_BEAT` ≈ 1150ms):

1. **The twine goes on, slack.** Heavy two-strand rope, wrapped round the pin
   head it leaves from, drawn from pin to pin.
2. **The stamp lands.** The club that made the link slams onto the connector
   as a round green ink die with the crest inside; the paper takes a
   millimetre of jolt. A link that did not hold gets a red NO LINK die.
3. **The consequence.** Held: the rope wraps the far pin and springs taut,
   overshooting. Broken: the rope parts in the middle and both ends drop.

Then: CHAIN HELD / CHAIN BROKE as a stamp across the verdict band, the score
counts up in foil, and the columns run one after the other.

## The column (replaces `DepthGauge`)

One per blank, under its print, the width of the card. Waits in pencil
outline during the string run. When it runs: the number starts at the field
size and counts **down** at a constant tick to the pick's rank, the gold fill
draining with it, and stops dead with a thud. Lower is deeper. Tick interval
is `clamp(1500 / ticks, 46, 170)` ms so a field of 16 is readable and a field
of 254 is a blur that stops. Rank 1 floods the tower gold: NOBODY DEEPER.

Under it: `Nth most obscure · of F who fit · worth S`.

## The floor (replaces `Breakdown`)

At the foot of each column: the deepest answer for that slot as a face, a
name and a score — the thing the player was counting down toward. When the
player is the deepest (rank 1, or their pick is `best`) it is their own face
in gold and reads "You found it". A pick that did not link gets a NO LINK die
in the tower and "scores nothing".

## What goes

- `DepthGauge.tsx` (its `useCountUp` moves to `countUp.ts`).
- `Breakdown` in `LockIn.tsx`, the "easiest pair is worth N" line, and the
  "split down the middle" caption.
- The obscurity chip on the sealed sheet's nameplates — "worth S" under the
  column is the same number.

## Where it lives

- `RedString.tsx` — rope, wraps, spring, snap. Driven by a phase per span
  (`idle | slack | taut | snapped`) rather than a resolved index.
- `Stamp.tsx` — the die and its ink halo.
- `DepthColumn.tsx` — the column and the floor; exports `columnSchedule` so
  `LockIn` can time the sequence from one set of timers.
- `ChainRow.tsx` — a connector shows the die once `stampedThrough` reaches
  it; a slot renders the column when `columnFor` is supplied.
- `LockIn.tsx` — the timeline.
- `globals.css` — keyframes only.

Reduced motion: the rope goes on taut, stamps appear, the column lands on its
rank immediately.
