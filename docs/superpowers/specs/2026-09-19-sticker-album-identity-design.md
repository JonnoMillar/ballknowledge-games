# The sticker album — identity, flow and daily design

**Date:** 2026-09-19
**Status:** Approved (Jonno, in session), building in stages
**Scope:** the chain route end to end. Recall XI (`/recall-xi`) stays parked
and keeps its own scoped dark theme.

## Why

The game worked but had no identity: a cork-board diorama (paper stack,
pins, muslin, stamps, foil, random tilt on everything) that read as clutter
rather than a brand, a puzzle that took a third of a desktop screen and was
off-canvas on a phone, and a 9.7-second reveal that spent its first five
seconds on a faint pencil line. It shipped the whole player pool inside the
HTML (8.6 MB decoded) and had no front door, no daily and no memory.

## The identity: "got, got, need"

The Panini sticker album is the recall game every football fan already knows.
A player is a sticker; an empty slot is the grey missing-sticker silhouette
with its number. That silhouette is the mark.

### Tokens

| Token | Value | Use |
|---|---|---|
| `--page` | `#F2EEE6` | the album page |
| `--sticker` | `#FFFFFF` | sticker border and card face |
| `--ink` | `#141210` | text, rules |
| `--muted` | `#6E6659` | secondary text |
| `--silhouette` | `#C9C2B4` / `#B3AB9C` | the missing sticker ground / figure |
| `--red` | `#D62839` | the one accent: masthead band, the seal button, "need" |
| `--green` | `#178A4C` | a link that held |
| `--gold` | `#E2B53A` | rarity (Deep Cuts track only) |
| club colours | `src/lib/club-colours.ts` | the ground behind a cutout, the ring on a sealed pick |

Spend the boldness in one place: the masthead is a solid red band with white
knockout type, like an album cover, and the silhouette. Everything else is
white stickers on a quiet page.

### Type

- **Big Shoulders Display** 700/800, for the masthead, nameplates, slot
  numbers, scores. Tabular figures. Nameplates in caps because stickers are.
- **Libre Franklin** 400/600 for everything else, sentence case. No
  tracked-out caps labels, no middle-dot meta strings.

Loaded with `next/font/google` (self-hosted at build), not a Google Fonts
link tag.

### Motion

Things stick down. An arriving sticker starts slightly large and presses
flat with a short overshoot. Verdict dies press the same way. Three
durations, `120 / 240 / 420 ms`, one ease family (`cubic-bezier(0.2, 0.9,
0.25, 1)` out, `cubic-bezier(0.4, 0, 0.2, 1)` in-out). No random tilt
anywhere except one deliberate lean on the verdict stamp. No glow, no halo,
no paper jolt. Drag on desktop keeps the integrated spring in `swing.ts`
(the overshoot is right); drop hands over to the press-down.

**Reveal budget:** verdict inside 4 s, everything on screen inside 7 s.
Links resolve one after another at roughly 350 ms; the die presses and the
rule takes its colour. Verdict stamp. Then, on a Deep Cuts board, every
column counts down in parallel and the wall of names who also fitted arrives
straight after. On a completion board the plates show the answer the board
was built around. Reduced motion: the sealed board, arrived at.

## Flow

1. **Tap to place is primary.** Tap an empty sticker, a search sheet opens
   (bottom sheet on phone, side panel on desktop), tap a result, it is
   placed. Tapping a placed sticker offers swap or remove. Drag to swap
   stays on desktop. The shortlist/bench and its Bench/Place buttons go.
2. **The pool is searched, never listed** (unchanged). The search sheet
   shows nothing until a query is typed.
3. **Nothing reveals until the seal** (unchanged). A placed sticker wears a
   neutral ground until sealed.
4. **One seal.** Every slot filled is the whole requirement.

## Layout

Vertical-first. One centred column, 16px gutters, max-width 560 on the
board column. A line board is drawn top to bottom on a phone and left to
right on a desktop; a ring is a 3×3 (eight) or 3×2 (six) loop on both. One
component draws the live board and the sealed board.

```
phone                          desktop
┌──────────────┐               ┌────────────────────────────────────┐
│ ▌CHAIN  #23  │               │ ▌CHAIN  #23                  Today  │
│ Find the two │               │ Find the two who take Messi to     │
│ who take …   │               │ Courtois, through Everton.         │
│  [MESSI]     │               │ [MESSI]─(?)─[2]─(EFC)─[3]─(?)─[COURTOIS] │
│    (?)       │               │                                    │
│  [  2  ]     │               │            [ Seal it ]  0/2        │
│   (EFC)      │               └────────────────────────────────────┘
│  [  3  ]     │
│    (?)       │
│  [COURTOIS]  │
│ [ Seal it ]  │
└──────────────┘
```

## Data: pool off the page

The client gets a compact name index (`id`, `name`, `aliases`) for search,
plus the players on the board. Sealing posts the fill to a route handler
which runs `chainResult` on the server and returns the result. Fame,
spells, fields and the reference solution never reach the browser. This
removes the 8.6 MB payload and closes the standing leak the XI boards have.

## The daily

**The daily is a completion board.** Solve or don't, a streak, a share
grid. Obscurity boards are a second track, "Deep Cuts", in the archive.

- Board of the day: deterministic from the date over the completion set.
- Played state, results and streak in `localStorage`; no backend.
- Share text: `Chain #23` + a 🟩/🟥 per link, never a name.
- Home: today's board (or your result if played), the streak, Deep Cuts,
  the archive, how to play.

### Completion-board generator

Two hand-picked boards cannot feed a daily. `scripts/build-completion.ts`
searches for rings of famous givens and a clue per plate under the same
rule `tests/content/chains.test.ts` already enforces: the reference answer
tops its clued field by fact-fame at 50 or above, the runner-up is under
35, nationality clues from the eleven big footballing nations, an unclued
plate allowed only when at most five answers are in reach. Demonyms are a
hand-written map. Output is committed content; the tests are the gate.

## Stages

1. Foundations: tokens, fonts, the sticker, the board layout, the shell.
   The reveal and the search rail are functional but not yet restyled.
2. Live board and search flow: tap-to-place sheet, swap/remove, pool off
   the page, shortlist removed.
3. Reveal and motion layer: new sealed board on the reveal budget; old
   sheet CSS, pins, stamps, ink deleted.
4. Home, daily, streak, share; the generator and a first batch of boards.
5. Responsive and polish: phone/tablet/desktop pass, focus, reduced
   motion, dead code, HANDOFF update.

Each stage stops for review.
