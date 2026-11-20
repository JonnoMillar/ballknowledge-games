# Brand rebuild: state of play

> Living notes for the site-wide brand and hub redesign. Read before touching
> `design-drafts/brand-concepts/`. Full history (logo rounds, BK Scout, round 3
> art, lobby build, job ids): `handoff-archive.md`, read only if needed.
> Last updated: 2026-11-19, style sheet draft 2 (picks applied, ink in place of navy).

## Status

- **Name:** FootballScouted (locked 2026-11-19, replacing FootyScoutle), one
  word, capital F and S. The idea: the run ends with you scouted at a
  valuation ("valued at £42m"), which can replace the numeric score. Live
  page titles say it ("FootballScouted · Daily football games"). Every domain
  checked is free, none bought. @footballscouted is taken on TikTok and
  Instagram (an active football-scouting account on Instagram); fallbacks
  @playfootballscouted and @footballscoutedhq are free. Jonno chose it
  knowing this.
  Rounds and reasons are in `names.md`.
- **Icon: done.** `img/fs-icon.svg`, a 420 square with no margin, plus PNGs
  (1024/512/180/64/32/16) in `img/fs-icon/`. It is the "thinking scout": heavy
  ink tapered glasses on a yellow tile, cream eye whites, pupils high with
  catchlights, a flat left brow and an arched right brow, corners slightly
  rounded. It was fitted by pixel diff to Jonno's pick (`img/round3/fs-think-pick.png`,
  Higgsfield job `be14180b-307f-4211-b528-d0d657177cdc`, top-right cell):
  0.480% of pixels differ. `icon_diff.py` re-checks and re-exports. The icon
  colours are sampled: #F5AF3E, #19212A, #FBF6EA. Colours locked as they are
  (combo 1, 2026-11-19); #F5AF3E is now the brand yellow, the old sun #F2B24A
  is retired.
- **Style sheet draft 2 (2026-11-19):** `style.html` carries the locked picks:
  FootballScouted, wordmark 4, Valley Sans + Onest, colour system A on ink,
  yellow button/Next chip/Next flag, valuation (£42m) as the ringed result.
  The clipboard sheet is repainted flat in ink over the old art until the
  regeneration. Red, sun, navy and the chip wordmark are gone.
- **Daily run (on main since 2026-11-13)** already reports a valuation
  ("Report valued at £37.0m", one decimal, plus a real transfer of about the
  same fee). Its UI waits for this brand: `Run.tsx`, `run.css` and each
  task's layout get restyled from the `style.html` tokens; `src/lib/run`,
  schedules, routes and task logic stay (`docs/daily-run.md` section 13).
  Brand direction comes from the top session (Website design and branding
  feedback), not daily-run.
- **Logo page:** `logo.html` holds the whole icon exploration, latest first.
- **Direction (2026-11-14):** an illustrated world (the scout's office) with
  a crisp HTML/CSS layer on top. The clipboard is the daily run's object, a
  checklist of today's tasks. Mock: `direction.html` (concept 6 frames).
- Nothing in the hub is built in the Next app yet; all of this is dev-only.

## Brand picks (locked 2026-11-19)

`type.html` now shows only the chosen brand (hub mock, wordmark, icon,
palette, type). The full exploration it replaced is in git at commit 1f54dd7.


- **Fonts:** Valley Sans 900 for headings, wordmark, buttons and tape; Onest
  500/700/800 for body and UI. Both Google Fonts, uncommon (popularity rank
  1586 and 171). How they were found: `font-sweep.html` (Google Fonts
  popularity data, AI-reflex fonts removed, judged on the hub art). Rejected:
  Fredoka and Bricolage (too round), anything AI-default or very common.
- **Wordmark:** treatment 4, "two-tone with brows", the on-ink version is the
  style. "F[the icon's glasses and brows]tball" in yellow #F5AF3E, "Scouted"
  in cream #FBF6EA, on ink or navy. On paper: ochre #9A5B00 plus ink. The
  glasses and brows are the icon's fitted paths: the `#oob` symbol in
  `type.html` (viewBox 25 90 370 245; height .6em x 245/138 so the glasses
  sit at x-height).
- **Icon:** colours unchanged (yellow tile, ink frames, cream lenses).
- **Colour system A:** two primaries, ink #1B2230 (big surfaces: top bar,
  clipboard sheet; Jonno 2026-11-19: the dark he liked was the ink, not
  navy #16305A, which is retired) and cream #FBF6EA (second surface: task rows, paper);
  one rationed attention colour, yellow #F5AF3E, used only for the main
  button, the Next chip and the Next flag. Ink is also the type on cream. Red is
  retired as the action colour. Judge colour for most eyes (Jonno's call),
  but never carry meaning by hue alone.

## Next: style sheet, then the regeneration queue

1. ~~Update `style.html` to the picks~~ done 2026-11-19 (draft 2).
2. **Regeneration queue** (Higgsfield, one variant each, approve the concept
   before generating). Work through it in this order, highest impact first:
   - Clipboard: same wood board and clip, a plain matte ink sheet, nothing
     printed on it. Cream bands and perimeter marks are CSS/SVG on top, so
     they stay crisp and the row count can change without new art.
     Content and marks are picked first on `clipboard.html` (2026-11-20):
     two real states, before (six tasks, yellow Start) and done (ticks,
     valuation ringed, yellow gone to the next game); left-halfway only has
     to hold up. No pips, no Next chip on the clipboard: one yellow thing.
     Mark variants: none, ruler edges, touchline and corner arcs, print crop
     marks, stitched seam. Waiting for Jonno's pick.
   - Style reference image re-locked to the new palette (every later piece is
     generated against it).
   - Office plate, desktop and phone: keep the scout's office but shift the
     balance from orange toward ink and cream, so yellow attention stands
     out (today 8 of the 10 strongest art colours are cork, wood and sun).
   - Then the game item pieces for the plate, as the hub build needs them.
   Inventory (2026-11-19). Regenerate: clipboard `241fbd10` (round3/clipboard.png),
   style ref `b6b4987a` (round3/style-ref.png, has the banned ball), empty
   plate `e909946d` (round3/plate.png), phone frame `0b7bc323`
   (round2/6-phone.png, used for slips and the watermark). Keep as mock
   backdrop until the plate lands: desk `da537930` (round2/6-desk.png).
   Done, no regen: icon and logo grids. Retired, never reuse: lobby bakes and
   cut-outs (`img/gen/`), round 2 concepts 0 to 5, BK binoculars. Separate
   pipeline, not brand art: the Olise grain tests.
   Proposed to Jonno 2026-11-19 (balance 575.5), waiting for his OK.
3. **In-game backgrounds** (taken over from the top session 2026-11-20; queue
   after the style ref, generated against it; one desktop 16:10 each first,
   low, 7 x 0.25 = 1.75 credits; phone crops judged after). Jonno asked for
   "cooler" game backgrounds with more elements and variation. One location
   per game, one style. Detail at the edges, a calm low-detail centre (the
   game UI covers it). Ink and cream balance, golden-cool light top left, no
   strong yellow (the button owns it). Never: people or faces, lettering,
   crests or logos, balls, stamps of any kind. The easter egg is a blank
   pennant, frame or programme in the art that a real `ClubBadge` sits on in
   CSS (badges are never generated).
   - Spoofed: a sports-desk from above, back pages with grey unreadable
     columns and blank photo boxes, a red pencil, correction slips, a phone
     face down. (The old ink pad is cut: it implies a stamp.)
   - Chain: a case wall, string between blank photos, map pins, at the edges.
   - Odd Man Out: a club museum corridor of squad photos, faces too small to
     read, one blank pennant frame.
   - Pitch Pin: the scout's seat high in an empty stand; the pitch below is
     the game area, plain and unmarked in the centre.
   - Season Line: an archive of yearbooks and programmes, a framed table with
     unreadable rows.
   - Pecking Order (the game the docs called The Tunnel, branch "Sorted",
     `games/tunnel`, not on the hub yet): the players' tunnel, tiled walls,
     light at the end.
   - Rondo: a sunny training pitch, cones, mini goals, bibs at the edges, no
     ball.
   Show each behind a real game screen on a preview page before Jonno judges.

## Fold-in from the other hub sessions (read 2026-11-20, not merged)

- **hub-greybox** (`claude/hub-greybox-acfacc`, `layout.html`/`layout.md`,
  2026-11-15): structure for phone and desktop in four states (first visit,
  mid-run, finished, all done); the clipboard is fixed-height, game order
  never changes, only the action button moves. Stale: BK Scout mark (now the
  FootballScouted wordmark), the red action (now yellow), no Pecking Order
  row. Its five open questions for Jonno (log in, labels, a button after
  all done, menu contents, rest days) still stand.
- **hub-zoom** (`claude/hub-zoom-c844a3`, `transition.html`/`transition.md`,
  2026-11-15): hub-object-to-game zoom, three reveals (Fill, Lift, Write),
  under a second, Back replays it in reverse, skip on tap, reduced-motion
  fade; lean is build B (hub stays mounted, intercepting route). Stale: old
  concept 6 art and BK Scout; Write ends on Play "stamped down" (check
  against the stamp rule). Carry over: an SVG grain with a multiply blend on a
  moving card dropped most of the frames, so `style.html`'s `.grained` is for
  still paper only; moving paper uses a small tiled image without a blend.
  Open for Jonno: which reveal, Quick or Calm, then A or B.

## Other pending work

- Mates' 5-second test on the merged direction. Phone check of `style.html`.
- At 16 px the icon is a straight downscale and gets muddy; a hand-hinted
  favicon would be a separate job.
- Before launch: Jonno claims @playfootballscouted or @footballscoutedhq on
  TikTok and Instagram (and checks X); he buys domains if he wants them (paid).

## Rules from Jonno's feedback (keep)

- Cheerful, clean and cosy. Rich contrast. Every prop belongs in the world.
- Physical objects come from generated art. CSS draws only type, boxes, hand
  marks and chrome. The CSS clipboard looked cheap.
- Never use a slanted rubber stamp (a Claude tell); a result is written in
  and ringed in biro. Watch for any tilt that echoes it.
- Never draw a lone pentagon or hexagon as a ball, and keep balls out of
  marks and generated art.
- One attention colour (yellow), used only for the button, Next and its flag.
- Red-green colourblind: never encode meaning by hue alone.
- Higgsfield: one variant or one grid per generation, approve the concept
  first. GPT Image 2.6: 0.25 low / 0.5 medium / 1.5 high. Pass
  `background: "opaque"`.
- Hand-coded SVG marks read as "computer coded" when invented freehand.
  Generate the design, then pixel-fit an SVG to it (as `icon_diff.py` did).

## Gotchas

- GPT Image renders can be transparent RGBA PNGs. The image viewer shows
  transparency as a dark blur that looks like a failed render. Flatten onto
  cream before judging.
- Higgsfield upload PUT needs `-H "If-None-Match: *"`.
- `img/` is mostly gitignored. Only `img/fs-icon.svg` and `img/fs-icon/` are
  committed. Generated images exist only in the checkout that downloaded
  them; recover one with `job_display` on its job id (ids in the archive).
  The icon diff heatmap `img/round3/fs-icon-diff.png` is one of these.
- Preview: `python -m http.server 4321 --directory design-drafts/brand-concepts`
  (or the `brand-concepts` launch config). The app stops idle preview
  servers; restart when a page 404s. A server started from another worktree
  serves that worktree's files.
- Headless Chrome `--window-size` under about 500 px doesn't emulate a phone.
  Use Playwright `browser_resize` 390x800 and compare `scrollWidth` with
  `innerWidth`.
- Never `cd` into another worktree in Bash.

## Open questions for Jonno

- The multiplayer game's name (blocks how it shows in the hub).

## Resume prompt (paste after /clear)

Read `design-drafts/brand-concepts/HANDOFF.md`. The brand picks are locked
(FootballScouted, Valley Sans + Onest, wordmark 4, colour system A). Update
`style.html` to the picks and show it at http://localhost:4321/style.html.
Then inventory the generated art and propose the regeneration queue (clipboard
first), one variant each, and wait for Jonno's OK before spending credits.
