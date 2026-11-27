# Brand handoff archive

> Do not read unless asked. Full history of the brand rebuild up to
> 2026-11-19 (logo rounds, BK Scout, round 3 art, lobby build details,
> generated job ids). The live file is `HANDOFF.md`.


## Status

Mates' feedback (Nov 2026): the pictures, the name and URL, some icons, and the
whole look ("no brand identity, first thing Claude made") are weak. We are
building a world for the hub, the way Krillion has its ocean. The direction in
prototype is the **scout's office**: a cork board on a training-ground office
wall, each game a pinned object, and clicking an object zooms into that game.
A working mock exists at `lobby.html`. Nothing is on the live site yet; all of
this is dev-only design work.

## Direction (Jonno, 2026-11-14)

**Illustrated world, with a real HTML/CSS layer on top.** Round 2 shortlist:
6 (stylised scout's office; Jonno liked its phone column) and 2 (academy
analyst's office; calm, clean-cut shapes). Cut: 1 portakabin (gloomy, "not
trying to remind people of terrible pitch conditions"; the world should be
clean and cosy), 3 bedroom, 5 dressing room ("doesn't make sense"). Kept from
5: **the clipboard as the run's object**, a checklist of what to do today.

- Why illustration long term: one style stretches to every game screen, icon,
  share card and rank art; CSS, SVG and real badges match flat art, where they
  clash with photo-real; motion is cheap; it hides AI tells; flat images load
  light on phones. It also fits the grain player portraits already approved.
- **This lifts the 2026-11-12 "nothing drawn in code" rule**, which held only
  because code clashed with a photo-real room. Now: the art is the world, and
  the crisp layer (run clipboard, labels, buttons, done states, chrome) is
  HTML/CSS. Jonno: the layer itself brings the contrast and variety the art
  lacks.
- Mock: `direction.html` (localhost:4321/direction.html), 6's frames with the
  CSS clipboard and labels on top, desktop and phone. No new art.
- **Name locked (Jonno, 2026-11-18): FootyScoutle**, one word, capital F
  and S. BK Scout was dropped the same day ("isn't a game, doesn't sound like
  football"). It keeps the scout's office world and the clipboard. All
  domains free on 2026-11-18, none bought (footyscoutle.com/.gg/.app/.io/
  .co.uk/.games); social handles not checked yet. Near-namesake: Scoutle, a
  2022 VALORANT guessing game. Live: page titles ("FootyScoutle · Daily
  football games" on the hub, "Game · FootyScoutle" elsewhere); style.html
  and logo.html renamed. The mark is open again: binoculars as a standalone
  mark, not a B. Rounds and reasons in `names.md`.
- **Icon grid (2026-11-18, 0.5 credits):** job `aaeb8bc3-4b81-402f-93dd-156346f6e189`,
  `img/round3/fs-icon-grid.png`, top of `logo.html`. Four concepts: the OO
  (two lenses and a bridge; risks reading as a dumbbell), scout eyes (the
  glasses shape Jonno liked in grid 776cab55, tightened, pupils glancing up
  right; most ownable, but drawn too small and thin on a cream tile), lens
  on the pitch (generic, the line breaks oddly at the dot), viewfinder
  (clean but a camera-app cliché). Edge rule: crisp geometry with small
  tight radii, circles only for lenses and pupils, flat ends.
  Jonno: all weak. Lens and viewfinder dropped (too universal, could be
  anything); the OO doesn't say binoculars; scout eyes looks computer-coded,
  but he likes "someone with glasses looking up in thought".
- **Icon grid 2 (2026-11-18, 0.5 credits):** job `0a3fedce-52a3-49ec-bd7e-bb56ceb9f85e`,
  `img/round3/fs-icon-grid-2.png`. Binoculars now read instantly (stepped
  eyepieces, hinge with a focus wheel); the navy one with yellow lenses and
  glints is the stronger. Thinking glasses with one raised brow (navy) work
  as a character. Filled lenses read as sunglasses and the angled brows as
  worried: cut.
- **Thinking glasses, one generation at a time (2026-11-18).** Jonno: drop
  binoculars (the generator only makes the stock glyph); thinking glasses
  only; round dot pupils look cheap. Brief: asymmetric brows (low furrow
  left, high arch right), tall pupils (taller than wide, like classic
  cartoon eyes) cropped by the lens tops, squint lid on the furrowed side,
  no mouth or hand (the hand is the 🤔 emoji's signature).
  Gen 1: job `6275e574-943c-4f8b-94c7-47c37db75f7c`, `img/round3/fs-think-1.png`.
  The expression lands (reads sceptical, "you what?") and holds at 32 px.
  Misses: no clear sideways glance, no visible squint, left brow clips into
  the frame, mixed corner radii, bridge thinner than the frame.
  Jonno: reads suspicious, not thinking; thinking looks up. Draw drafts in
  code first, then Higgsfield.
- **Thinking SVG drafts A to F (2026-11-18)** on `logo.html` (symbols
  `th-a`…`th-f`, built by a scratchpad script; edit the symbols directly
  now). Rules: pupils in an upper corner, just clear of the frame (touching
  read as hanging teeth); brows only rise, never angle down; one stroke
  weight (6.5 on 100) for frame, bridge and brows; every corner set by the
  same round join. A: up-left, left brow raised. B: up-right, right raised.
  C: up-right, both raised, right higher. D: straight up, both arched.
  E: B with bigger pupils. F: B with round pupils, for comparison.
  Jonno: all read as sideways, not up. Cause: wide, short lenses give a
  pupil lots of sideways travel and little upward travel.
- **Looking-up drafts G to J (2026-11-18)**, symbols `th-g`…`th-j`, above
  A to F. G: pupils top centre with empty lens below. H: taller lenses.
  I: eye whites with the pupil at their top (the clearest "up"). J: taller
  lenses plus eye whites (cartoonish, nearer surprised).
  Jonno: still not nailing it; give Higgsfield freedom, rule only
  "thinking, not suspicious".
- **Free-rein grid (2026-11-18, 0.5 credits):** job `563c7696-daca-4051-92a3-cb87809ba9b9`,
  `img/round3/fs-think-grid.png`, no reference. All four read as thinking.
  What makes "up" work: eye whites with the pupil high, a catchlight, and
  relaxed arched brows, one higher. Navy: round frames plus a thought bubble
  (clearest, but the bubble is a cliché and dies small). Yellow: heavy ink
  rectangular frames plus spark lines (most app-store pop; the lines read as
  an "aha"). Outline tile with an ellipsis: weak tile. Ink with cloud and
  sparks: busy.
  Jonno: use the old frame shape; the eyes are about right; nothing extra
  (no clouds or thoughts); the brows aren't settled.
- **Brows-only grid (2026-11-18, 0.5 credits):** job `be14180b-307f-4211-b528-d0d657177cdc`,
  `img/round3/fs-think-brows.png`. Yellow tile, heavy ink tapered frames,
  cream eye whites, pupils high with catchlights. Both arched with the right
  higher reads most naturally as thinking. A flat bar reads mechanical, like
  a minus sign. Both even reads calm, a bit blank. A tilted straight bar
  reads sceptical again: cut.
  **Jonno picked the top right (flat left brow, arched right).** Cropped as
  `img/round3/fs-think-pick.png`, shown at 128 to 16 at the top of
  `logo.html`. Keep it as it is; the next step is a clean final version of
  this exact icon, not a new design.
- **Final icon (2026-11-19):** `img/fs-icon.svg` (420 square, no margin) and
  PNGs at 1024/512/180/64/32/16 in `img/fs-icon/` (both un-ignored in
  `.gitignore`). Shapes fitted to `fs-think-pick.png` by pixel diff in Chrome,
  then tidied: mirrored lenses, one 22-unit stroke (frame, bridge, brows),
  whole/half-unit grid, colours sampled (#F5AF3E, #19212A, #FBF6EA).
  **0.48% of pixels differ** from the original (untied fit 0.36%); heatmap at
  the top of `logo.html`. `icon_diff.py` re-checks it and re-exports the PNGs.
  At 16 px it is mush (a straight downscale): a hand-hinted favicon would be a
  separate job.
  2026-11-19: brow corners rounded slightly (radius 4 on 420), as in the
  original (Jonno spotted the sharp ones); diff 0.480%, PNGs re-exported.
  On `style.html` section 1 (hero, sizes, page favicon), replacing the FS
  scout's-pass placeholder.
- *Superseded:* **Name (Jonno, 2026-11-15): Ball Knowledge Scout, said and written short
  as BK Scout** (as FM is Football Manager). Full name explains the role and
  carries the "ball knowledge" meme; BK Scout is the handle, watermark and
  mark; `bkscout` in URLs and handles. Domains free on 2026-11-15, not bought:
  ballknowledgescout.com, bkscout.gg/.app/.io/.co.uk (bkscout.com taken).
  Live so far: page titles only ("Ball Knowledge Scout" on the hub,
  "Game · BK Scout" elsewhere). Rounds and reasons in `names.md`.
- **Style sheet draft 1 (2026-11-15):** `style.html`
  (localhost:4321/style.html). BK Scout wordmark and scout's-pass mark, layer
  palette (ink, paper, navy, sun; red only for the one action, only on paper
  or ink: red on cork is 1.3:1), Big Shoulders plus Libre Franklin, art rules
  for every generation, CSS grain and down-right shadows, label tape states,
  the run's clipboard (fresh, in progress, filed stamp), buttons, phone paper
  slips, chrome, motion tokens. Art finding: concept 6 is 8 of 10 orange
  tones, so rebakes should add cool accents in the scene.
- **Style sheet feedback (Jonno, 2026-11-16):** the CSS clipboard looks cheap
  and tacky: generate the clipboard (board, clip, blank sheet) and keep only
  type, boxes and hand marks in CSS. The slanted "FILED" rubber stamp is a
  dead giveaway of Claude-made design: never use it; finishing now writes the
  result in and rings it in biro. Hover and tick needed more feedback: now a
  row wash, the name leaning in, a ghost tick, a box press, biro tick, hand
  strike and progress pips. Logo is open for discussion; BK on the pass is
  not decided.
- **Round 3 art (2026-11-16, 3 images at 0.25 = 0.75 credits; balance
  581.5 before):** files in `img/round3/` (gitignored). Clipboard
  `241fbd10-cf6c-46fe-bc1d-90f19e46bcb6`: walnut board, steel clip, a navy
  cutting-mat sheet (Jonno's idea: crisp colours, clean matte), grid and ruler
  ticks, half-pitch header, six cream bands that take the task rows. Now live
  in `style.html`. Next rebake: keep the header zone plainer (pitch lines
  fight the title). Style reference `b6b4987a-7811-4fc3-9a9d-7483645bd242`
  (binoculars, navy pennant, stopwatch, enamel mug, plain ball). Empty plate
  `e909946d-0030-466b-8c79-e3cd7a367f8e` (bare board, cooler sky, navy and
  white pennants); the cork is still very orange.
- **Feedback on round 3 (Jonno, 2026-11-16):** the generated football in the
  style reference looks bad (wrong panel pattern): keep balls out of generated
  art or draw them as vector. The clipboard header was cramped by the pitch
  lines: the streak moved into the eyebrow and Continue is one full-width
  button; the next clipboard rebake should leave the header zone plain navy.
- **Logo options (2026-11-16):** `logo.html` (localhost:4321/logo.html), five
  SVG marks at 128/64/32/16 px, app icon, on ink and with the wordmark:
  A binoculars with a pentagon ball in each lens, B the same with full ball
  spokes, C ball in one lens and a glint in the other, D analyst glasses with
  a ball reflected in one lens, E glasses with a ball in each lens. Rules:
  one stroke weight, two colours, basic shapes, the ball reduced to one
  pentagon. Jonno's worry: a complex concept will not shrink; judge at 32 and
  16 px. Not decided; BK on the pass in `style.html` is a placeholder.
- **Generated logo grid (2026-11-16, 0.25 credits):** job
  `776cab55-a2f9-455b-bd4b-af52919a9ab1`, `img/round3/logo-grid.png`, shown
  on `logo.html`. Solid-body binoculars read better than the outlined SVG
  ones; the reflected ball in the glasses is too small to survive 32 px.
- **Logo round 2 (Jonno, 2026-11-16):** never a lone pentagon or hexagon as a
  football (saved to memory); leave the ball out, the name carries it. Marks
  must share the wordmark's style: squared, condensed, heavy, flat ends. He
  liked the generated glasses shape, cleaner and less soft. Two generations
  for a font-matched grid (`f1b84d17…`, `0b23885e…`, 0.5 credits) both came
  back dark and blurred, unusable. `logo.html` now holds SVG round 2: F
  squared glasses (one lens solid, glint bar), G binoculars with a radar
  lens, H binoculars with a glint, I the wordmark's B on its side, J the BK
  chip. The pentagon options and grid are off the page.
- **Logo K, BK with the B as binoculars (2026-11-16):** top of `logo.html`.
  Binoculars held upright: bowls are the barrels with round lens counters,
  two tabs on the stem are the eyepieces, a bar set in the notch is the
  hinge; K drawn to the same stem and cap height. Falls back to a plain bold
  BK at 32 and 16 px. Favicon is the B alone. Awaiting Jonno's verdict.
- **Logo K verdict (Jonno, 2026-11-16): "horrendous"**, spacing all over,
  barely binoculars; he wants Higgsfield, with the BK Scout wordmark as
  reference (media `9b52a5ae-e008-44f9-b429-0975a8aacb49`). Correction: the
  "dark blur failures" were not failures. Those renders are transparent
  PNGs and the viewer showed the transparency as black; flattened, all
  three are fine (`*-flat.png`). Pass `background: opaque`. Latest:
  `b9fd9323-dc04-46eb-bfad-a41302de3610` (medium, 0.5), barrels tapering
  from small eyepieces on the left to the two lenses that form the B's
  bowls (Jonno's idea): reads as binoculars and as BK. Top of `logo.html`;
  next is a clean vector redraw if Jonno picks it. Revision `2b04f973-1029-4dfd-9d53-0c02e7c7466d` (medium, 0.5): stubby barrels flush on a straight stem, reads as a B first, binoculars only as a hint; B nearly touches the K. Grid `b9682288-644c-4f73-96a1-b34fe0b18eb6` (medium, 0.5): stroke-matched, lenses flattened into the stem (reads as a T, fails), carved negative space (clear B), middle ground (best balance so far).
- **Next for a fresh session:** Jonno's pick from `logo.html`; then rebake
  the clipboard with a plain header (one variant, low, ask first); fold in the
  layout and transition sessions' notes when they finish; then type-in-scene
  and a phone check of `style.html`.
- **Split across sessions (2026-11-15):** this session owns the style sheet
  and this file. Grey-box hub layout (`layout.html`, `layout.md`) and the
  no-blink zoom into a game (`transition.html`, `transition.md`) run in their
  own sessions and worktrees; fold one line for each here when they finish.
- Order Jonno set: settle the design direction, then the hub name (it shapes
  game names and how each game is shown in the hub).
- Risk to manage: keeping many generated pieces in one style needs a locked
  style reference (palette, line, grain) before item generation.

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
- **Bible v2 (2026-11-12):** board holds only playable things, 8 slots in three
  columns: daily run dossier in the centre (new idea: all dailies shortened,
  one overall result, then individual dailies), Spoofed, Chain, Odd Man Out,
  Pitch Pin, The Tunnel, Season Line, Rondo (bib below the frame). Collection
  moves to a card binder on the shelf. Room adds a crumpled shirt (generated
  per player: a crumpled name cannot be laid on), static Brighton and
  Fenerbahçe pennants, a Jabulani without maker or tournament marks,
  binoculars on the sill, a pass on the window handle. Cut: sticky note,
  fixture list, train ticket, calendar, Olise print. Everything clickable sits
  inside the area shown from 16:10 to 1920x900 (x 5 to 95%, y 0 to 83%).
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
- Round 2 (`round2.html`, files in `img/round2/`, 2026-11-13, 10 images at 0.25 = 2.5 credits): portakabin desk `cbd402cb-7d95-412b-a038-8f4204044d9d` phone `c8078cac-2ea0-49ab-8353-bf22aaca59fd`; academy desk `d299d06d-616a-4df6-8222-e088538a0538` phone `81eba370-9a62-472d-99d4-2bc79a0e4e04`; bedroom desk `79c5b697-0c27-4e71-8115-8bfb38247683` phone `f124d9a1-23d9-466b-8b7e-1ddbe5c9be8e`; dressing room desk `3249f300-3f26-4805-9195-d04dcea99fc5` phone `d82334ce-4aab-4121-83ec-3aa79f9ac86b`; stylised office desk `da537930-88ee-438b-996a-60c257c618f7` phone `0b7bc323-cee0-4350-a7fc-465b6dd3199f`. `0-desk.png` is a copy of `img/gen/grade-cool/baked.png`.
Rebuild pieces: `python -X utf8 design-drafts/brand-concepts/cutout.py day`
(and `sunny`), then `grade.py`. `build.py` (concepts board effects) reads the
photo pipeline's scratch in the `photo-pipeline-1d882c` worktree.

## Next

0. **Direction (2026-11-14):** illustrated plus CSS layer (above). Name: FootyScoutle (locked 2026-11-18; BK Scout dropped). Next: a style sheet (palette, type, line and grain, layer components) and grey-box layout. The 5-second test runs on the merged direction, not on separate concepts.
0a. **Round 2 (2026-11-13):** `brief.md` (visitors, phone first, how concepts are judged); five concepts generated (car cut by Jonno), compared on `round2.html` (localhost:4321/round2.html). Next: Jonno's shortlist of 2 or 3, then the mates' 5-second test. The bible sign-off waits for the chosen concept.
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

- Blocking for the logo: the multiplayer game's name. (Site name locked
  2026-11-18: **FootyScoutle**; see `names.md`.)
- Non-blocking: the Olise print's job on the board; whether the pub idea
  returns later (as the room around the board?).

## Hazards at handoff

- The `brand-concepts` preview server may still be running; safe to stop.
  Restart with `preview_start` name `brand-concepts`.
- Generated images exist only in this folder's `img/` (see job ids above).
