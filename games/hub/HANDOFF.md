# Hub (`/hub`): the scout's office

Live 2026-11-24 at `/hub`; `/` is still Chain's hub. The swap to `/` is a later decision.

A faithful port of `design-drafts/brand-concepts/hub.html` (v2, Jonno's arranged layout, Rondo
parked). The draft's own HANDOFF (sections Hub MVP, v2, Arrange tools) says what each part is.

- `app/hub/page.tsx`: thin shell. `Hub.tsx`: the client component (camera, parallax, dust canvas,
  countdown, the clipboard). `hub.css`: every class is `hx-` prefixed (global CSS).
- Art: `public/hub/office/` (low 1k drafts, copied unchanged, plain `<img>` so nothing is
  re-encoded). A new plate drops in by replacing the files; positions are % of the plate.
- Wired to the real run: rows and ticks from `RUN_TASKS` + `allRuns()` (`src/lib/run`), Start or
  Continue goes to `/run`, the filed state shows `money(reportValue(score))` and links to the
  report, streak from `streakOf`. The stopwatch counts to local midnight. Re-read on back/focus and at midnight.
- Board items link to their routes. Pecking Order has no route on main, so it is shown unlinked.
- Default camera is the draft's `FRAME`. Dev toolbar (Arrange, zoom, Copy layout) and `?done` are dropped.
- Fonts: Onest via `next/font/google`. Valley Sans is not in this Next version's font list, so
  its Google stylesheet is linked from the page.

**Phone is a stopgap**, not a design: under 700 px wide the camera frames the clipboard and the
five games are plain links in a strip below. The board items are out of frame there.
