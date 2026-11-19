# Brand rebuild: state of play

> Living notes for the site-wide brand and hub redesign. Read before touching
> `design-drafts/brand-concepts/`. Full history (logo rounds, BK Scout, round 3
> art, lobby build, job ids): `handoff-archive.md`, read only if needed.
> Last updated: 2026-11-19, after the icon was finalised.

## Status

- **Name:** FootyScoutle (locked 2026-11-18), one word, capital F and S. Page
  titles on the live site already say it ("FootyScoutle · Daily football
  games" on the hub, "Game · FootyScoutle" elsewhere). Domains were all free
  on 2026-11-18, none bought. Social handles (@footyscoutle) are not checked.
  Rounds and reasons are in `names.md`.
- **Icon: done.** `img/fs-icon.svg`, a 420 square with no margin, plus PNGs
  (1024/512/180/64/32/16) in `img/fs-icon/`. It is the "thinking scout": heavy
  ink tapered glasses on a yellow tile, cream eye whites, pupils high with
  catchlights, a flat left brow and an arched right brow, corners slightly
  rounded. It was fitted by pixel diff to Jonno's pick (`img/round3/fs-think-pick.png`,
  Higgsfield job `be14180b-307f-4211-b528-d0d657177cdc`, top-right cell):
  0.480% of pixels differ. `icon_diff.py` re-checks and re-exports. The icon
  colours are sampled: #F5AF3E, #19212A, #FBF6EA. Its yellow is a touch off
  the palette's sun #F2B24A (Jonno has not asked to snap it).
- **Style sheet draft 1:** `style.html`. Palette, type, line and grain, layer
  components (generated clipboard with CSS task rows, tape, buttons, phone
  slips, chrome), motion. The icon is on it (hero, sizes, favicon).
- **Logo page:** `logo.html` holds the whole icon exploration, latest first.
- **Direction (2026-11-14):** an illustrated world (the scout's office) with
  a crisp HTML/CSS layer on top. The clipboard is the daily run's object, a
  checklist of today's tasks. Mock: `direction.html` (concept 6 frames).
- Nothing in the hub is built in the Next app yet; all of this is dev-only.

## Next: font, wordmark and colour exploration (agreed 2026-11-19)

Never explored before:
- Fonts: Big Shoulders plus Libre Franklin were inherited from Chain's
  September sticker-album spec.
- Palette: ink, cream and red are the site's existing colours; navy and sun
  were sampled from concept 6 art.
- Wordmark: one version only (a "Footy" chip, tilted -2°, plus "Scoutle").

Build one dev page, `type.html`, in code, free, using Google Fonts. **Judge
every option on the hub, not on a blank sheet** (Jonno's point): lay each over
the office frame from `direction.html`, with the icon beside it.
1. **Fonts:** six to eight heading candidates (condensed, rounded geometric,
   chunky grotesk, slab, and so on), each with a body pairing. Each one sets
   the wordmark, the clipboard header and task rows, and a button. The font
   should feel like one family with the icon's heavy, slightly rounded,
   friendly frames.
2. **Wordmark:** four or five treatments in the leading fonts: one word,
   two-tone split, a chip with **no tilt**, the icon as a lockup, lowercase
   vs caps. Show each where it lives: the hub top bar and a share card.
3. **Colours:** the world palette is mostly fixed, because the office art has
   navy, sun, cork and cream baked in and changing it means regenerating art.
   Test only two or three accent and UI variations on the same mock.

Done when Jonno can compare the options side by side on one page and pick.
Then update `style.html` to the picks. Commit, push, and give the link.

**Built 2026-11-19: `type.html`, waiting for Jonno's picks.** Eight font
pairs on a crop of the office frame at laptop scale (Big Shoulders, Barlow
Condensed, Rubik, Fredoka, Bricolage Grotesque, Archivo Expanded, Bitter,
Unbounded), five wordmark treatments (one word, two-tone, flat chip, icon
lockup, glasses for "oo") with font and case switches, and three accents
(red, sun, biro blue). Rubik is the default lead. Page chrome is system-ui
so no candidate competes. The generated clipboard is clipped to its board
shape there; `style.html` still shows its cream backdrop.

## Other pending work

- Rebake the clipboard with a plain navy header zone (the pitch lines crowd
  the title). One variant, low quality, ask Jonno first.
- Fold one line each into this file from the hub-greybox (`layout.html`,
  `layout.md`) and hub-zoom (`transition.html`, `transition.md`) sessions'
  notes. They live in their own worktrees.
- Mates' 5-second test on the merged direction. Phone check of `style.html`.
- At 16 px the icon is a straight downscale and gets muddy; a hand-hinted
  favicon would be a separate job.
- Before launch: check @footyscoutle on TikTok, Instagram and X; Jonno buys
  domains if he wants them (paid).

## Rules from Jonno's feedback (keep)

- Cheerful, clean and cosy. Rich contrast. Every prop belongs in the world.
- Physical objects come from generated art. CSS draws only type, boxes, hand
  marks and chrome. The CSS clipboard looked cheap.
- Never use a slanted rubber stamp (a Claude tell); a result is written in
  and ringed in biro. Watch for any tilt that echoes it.
- Never draw a lone pentagon or hexagon as a ball, and keep balls out of
  marks and generated art.
- Red is one action only, on paper or ink, never on cork (1.3:1).
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
- Snap the icon yellow to the palette's #F2B24A?

## Resume prompt (paste after /clear)

Read `design-drafts/brand-concepts/HANDOFF.md`. Build `type.html`, the font,
wordmark and colour exploration for FootyScoutle. Judge every option laid
over the hub office frame from `direction.html`, with `img/fs-icon.svg`
beside it:
- six to eight heading fonts with body pairings
- four or five wordmark treatments (no tilted chip)
- two or three accent/UI colour variations within the fixed world palette

Show it at http://localhost:4321/type.html, commit and push. Then wait for
Jonno's picks before changing `style.html`.
