# Brand rebuild: state of play

> Living notes for the site-wide brand and lobby redesign. Read this before
> touching anything in `design-drafts/brand-concepts/`.
> Last updated: 2026-11-12, after the daylight lobby variant.

## Status

Mates' feedback (Nov 2026): the pictures, the name and URL, some icons, and the
whole look ("no brand identity, first thing Claude made") are weak. We are
building a world for the hub, the way Krillion has its ocean. The direction in
prototype is the **scout's office**: a cork board on a training-ground office
wall, each game a pinned object, and clicking an object zooms into that game.
A working mock exists at `lobby.html`. Nothing is on the live site yet; all of
this is dev-only design work.

## Verified state (2026-11-12)

- Preview: `.claude/launch.json` config `brand-concepts` serves this folder on
  port 4321 (`python -m http.server`). Pages:
  - `http://localhost:4321/` — concepts board (11 directions on real cutouts).
  - `http://localhost:4321/scout.html` — first night-time mock (rejected look).
  - `http://localhost:4321/lobby.html` — current lobby. Light switcher bottom
    right: Daylight (default), Golden, Golden cool. Checked in the browser at
    1440x810 and 1440x700: all images load, hover lift works, click zooms to a
    game page, title visible.
- Higgsfield spend for this work: 2.0 credits (8 images at 0.25, low quality),
  confirmed in `transactions`. Balance about 598; resets 11 Dec, unused wiped.
- Commits: 37a84ef (board), 4a31759 (scout), 4a1ed82 (lobby), 95f5c8e (grades),
  39411b1 (daylight + title crop fix).

## How the lobby is built (and why)

1. **Bake:** one generation draws the room with every game item pinned, so the
   items share the room's light. Separately generated items never matched.
2. **Plate:** an edit of that same image removes every item, leaving an empty
   board with the same camera and light (desk area differs by 3.7/255).
3. **Cut-outs:** `cutout.py <prefix>` masks each item as "not cork" using a
   colour model learned from bare cork in the baked frame, gated by the
   baked-vs-plate difference. Writes `img/gen/<prefix>/baked.png` and
   `items/<name>.png` + `<name>-patch.png` (full-frame RGBA, stack at 0,0).
4. **Page:** at rest it shows the baked frame untouched (string, shadows
   intact). Hover shows the bare-cork patch and lifts the cut-out with a CSS
   shadow. Click scales the scene into the item and opens a game panel.
5. **Labels and chrome are real type, never generated:** label-maker tape per
   game (red tape only on the suggested game, so red stays rationed), title
   painted on the wall with `mix-blend-mode: multiply` so the sun crosses it,
   plain Log in / Menu buttons top right.
6. `grade.py` applies one per-pixel grade to a frame and all its pieces, so
   graded pieces still match. Jonno found every grade "washed"; relighting by
   edit (Daylight) is the better tool than grading.

## Decisions made, and why

- **Scout's office over the pub, kit room and paper stadium** for the first
  prototype: Jonno liked the pinboard and pub most; the board is naturally
  layered, takes our illustrations "without fuss", and each pinned object can
  grow into its game page. The pub stays an idea for later.
- **Every object must belong in the world.** Coasters on a scout's board made
  no sense (Jonno). Current map: Spoofed = clipping stamped FAKE, Chain = two
  Polaroids with red string, Odd Man Out = team photo with a face circled,
  Pitch pin = match report with a pitch diagram, Season line = league-table
  cutting, multiplayer game = session plan + bib, Olise print = "Your
  collection" (placeholder role).
- **Cheerful, not gloomy.** Night/rain read as depressing; players outside
  looked like mannequins. Now: daylight, empty sunny pitch, no people.
- **Golden light was too orange** (killed contrast between paper, grass, kit).
- **Golden cool is the light (2026-11-12).** Daylight read "too white" and lost
  the feeling of being in the room. Rebakes should aim for Golden cool natively.
- **Bar for the hub (Jonno, 2026-11-12):** every detail deliberate and
  readable; nobody should be able to say "that doesn't make sense", "that looks
  off" or "that's AI". Wants easter eggs and small wins (spotting a badge),
  nudges to niche players, and a click-to-game zoom where the camera never
  blinks. Ideas raised: a shirt over the chair with today's niche player that
  lifts into a factfile (grain portrait + club stats from `data/pool.json`
  spells), club badges on the pennants (Brighton, Fenerbahçe), and a live,
  moving string for Chain that other games can reuse.
- **No objects drawn in code (Jonno, 2026-11-12).** Code-drawn string or props
  will not match the scene and look cheap. Everything visible in the room is
  generated in the room's light. Real type stays only where already accepted
  (title, label tape, chrome) until Jonno judges a type-in-scene test.
- **Scene bible:** `bible.html` lists all 23 objects with job, content, click,
  why it belongs, and what is wrong now, plus the open calls. It is the spec for
  designing each item. Binoculars go on the window sill (Jonno).
- **Chain item is the weakest:** generated faces, and the baked string is cut
  by the masks on hover. Fix: cut out both Polaroids and the string as one
  piece; motion, if any, comes from a generated video loop, not code.
- **Grain illustrations** (inspo R0022): photo reference + style prompt in GPT
  Image 2.6 works (the source post says GPT Image 2). Jonno prefers test A's
  rich colour and contrast over the flatter B. Test subject is Olise (not Sané).
- **Photos for real use come from Creative Commons** (`img/cc/credits.json`,
  CC BY / BY-SA: credit, and share-alike for BY-SA). Jonno's picks: D (Norway
  v Italy 2025, running), F (Mbappé arms out; his hand is cut off in the
  source, so extend it when illustrating), G (Messi arms out). Press photos
  were used once for private practice only.
- **Made-up players in kit colours, not real club kits** (crests and sponsors
  are trademarks). Real kits only if Jonno accepts that.
- **Concepts board verdicts:** liked Fly-poster, Chalk tactics, Kit fabric,
  Torn strip (face cover), Sticker album. The rest rejected.
- Higgsfield: GPT Image 2.6 costs 0.25 low / 0.5 medium / 1.5 high. One
  variant at a time, approval before each generation (see memory).

## Gotchas

- Higgsfield upload PUT needs `-H "If-None-Match: *"` (it is a signed header).
- `generate_image` with `get_cost: true` still draws a widget; tell Jonno it
  was only a price check.
- Edits redraw sun stripes slightly, so brightness or chroma differences drag
  cork into masks; the cork colour model is what works.
- Halftone on cutouts needs per-image contrast normalisation (`build.py`
  `lum_norm`) or dark skin goes solid and light skin blank.
- `file://` previews render as a static snapshot without relative images: use
  the `brand-concepts` launch config.
- The lobby plate anchors to the top and crops the desk on wide windows, or the
  title gets cut off.
- Commons API rate-limits (429) quickly: sleep about 3 s between queries.
- Never `cd` into another worktree in Bash; it moves the session's directory.

## Generated images (gitignored, local only)

`img/` is gitignored (Commons-derived photos). To recover a generated image,
`job_display` the Higgsfield job id:
- Olise grain test A `b93a41fe-2b20-4848-ac41-2d65ea4551cc`, B `755ecf06-3061-43d1-8889-7f280d252d44`
- Night key frame `00719d0f-a9fe-4007-8582-b28c749c431d`, clipping `cfa89e57-48b6-433d-a635-c6efa7b6674d`
- Golden baked `07f92207-f773-455c-bdce-0fdba0101206`, golden empty `2d000011-e170-498e-b581-18065586a080`
- Daylight baked `74ecf664-308e-44ca-ab63-5f2864d232b4`, daylight empty `db165c85-771a-4a28-9ebd-39a47b375d6d`
Rebuild pieces: `python -X utf8 design-drafts/brand-concepts/cutout.py day`
(and `sunny`), then `grade.py`. `build.py` (concepts board effects) reads the
photo pipeline's scratch in the `photo-pipeline-1d882c` worktree.

## Next

1. Jonno's sign-off on `bible.html` (objects, and the four open calls).
2. **Single-item control test** on the Spoofed clipping, about 0.75 credits:
   design the item alone until approved; bake it in using it as a reference
   image; if the bake drifts, transfer the baked lighting onto the approved
   item locally. Acceptance: the final cut-out shows the approved design, lit
   by the room, with no seam on hover.
3. Then: design each item individually, rebake at high quality, phone layout,
   per-game zoom transitions, and only then port into the Next app (shared hub
   code under `src/`, not a game folder).

## Open questions for Jonno

- Blocking for logo and title: the site name ("Ball Knowledge" is a working
  name) and the multiplayer game's name.
- Non-blocking: the Olise print's job on the board; whether the pub idea
  returns later (as the room around the board?).

## Hazards at handoff

- The `brand-concepts` preview server may still be running; safe to stop.
  Restart with `preview_start` name `brand-concepts`.
- Generated images exist only in this folder's `img/` (see job ids above).
