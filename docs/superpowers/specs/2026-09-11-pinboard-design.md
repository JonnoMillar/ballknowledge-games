# The pinboard — design spec

**Date:** 2026-09-11
**Status:** Approved, building
**Scope:** the chain route (`components/Chain.tsx`, `components/LockIn.tsx`,
the mounted print in `components/PlayerCard.tsx`, and the `.sheet` theme in
`app/globals.css`)

## The problem

Two things read wrong on the live sheet.

1. **The cutouts float.** TheSportsDB cutouts are transparent PNGs and the
   plate behind them is flat `#e6ded0` — near enough the mount and the paper
   that the player appears to stand on parchment. There is also a gap between
   the player's feet and the bottom of the frame.
2. **The world contradicts itself.** The surface was a desk; the sheet was
   pinned; a bulldog clip held it. A clip does not hold paper to a desk, and
   pins do not go into one.

## The decision

The sheet is **pinned to a cork board**. Everything on the page is an object
on that board, drawn in one language: clean, flat-illustrated — the language
the CSS sheet, the SVG pins and the red string already speak. The player
photos stay photographic because they *are* photographs; a real print on a
drawn board is fine, a drawn clip on a real wall was not.

### Assets (generated on Higgsfield, one-off, shipped static)

| File | What | Source |
|---|---|---|
| `public/board/cork.webp` | The board. Fine, even, illustrated cork speckle; no marks, no frame. | nano_banana_pro, 16:9, 1k |
| `public/board/muslin.webp` | Hand-painted studio muslin in sand, ochre and olive — the classic team-photo backdrop. Goes behind every cutout. | nano_banana_pro, 4:5, 1k |

Props for the board's edges (programme corner, ticket stub, tactics scrap,
whistle, sticker strip, pencil) are a **follow-on**: generated as a sheet,
background-removed, cut apart, placed with CSS so they crop deliberately at
the viewport edge on every screen size. Not in this build.

### Changes

**The board.** `.sheet` paints `cork.webp` with `cover`, under a light
desaturating wash (both renders came out more caramel than tan) and a soft
vignette. The fractal-noise grain layer goes: the board is illustrated and
grain reads as dirt on it.

**The sheet.** No clip. A gold pin in each top corner, slightly askew. The two
blank sheets beneath stay — a pin through a stack of paper is what a board
looks like — and the shadow under the stack deepens, because the sheet now
stands off a wall rather than lying on a desk. `Clip.tsx` is deleted.

**The prints.** Behind a cutout (`fit: 'contain'`) the plate is `muslin.webp`
rather than a flat colour, cropped tight (~125%) with the floor at the frame's
bottom edge. Each card takes a different horizontal crop, hashed from the
player id the way `tiltFor` hashes the tilt, so neighbours read as different
frames from the same session. The cutout is anchored `50% 100%` so the player
stands on the frame's bottom edge, and casts a small contact shadow. Press
photos (`fit: 'cover'`) are unchanged. Empty plates stay flat: a plate becomes
a photo when a player lands, not before.

The same rule applies wherever a mounted print appears — the chain row, the
shortlist, the drag overlay and the sealed sheet — and the rules are
**unscoped** (not under `.sheet`), because dnd-kit's DragOverlay portals the
dragged card to `document.body`.

**The shortlist.** Prints pinned to the board beside the sheet, each with its
own gold pin, on the board's own surface rather than a tinted tray. The label
and the empty-state instruction move onto a small index card pinned to the
board; the four dashed slips go — a dashed box is a UI control, not an object.

**The sealed sheet.** Same corner pins, same board, no clip.

## Out of scope

Props at the edges (above). The Recall XI board, which keeps its dark theme.
The search rail, which stays a card index standing beside the board.

## Verification

Typecheck and tests pass; browser check of the live sheet (empty, with a
pulled print, with a print dropped on a plate, dragging) and the sealed sheet,
at 1440×900 and a narrow width.
