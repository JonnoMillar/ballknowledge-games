# Lessons for building a new game

What went wrong or got corrected while building Odd Man Out (2026-10-15/16),
plus the rules Jonno has set elsewhere, so the next game starts from them.
`docs/game-design-playbook.md` is about choosing a game; this is about
building one. Read both, then the root `HANDOFF.md`.

## Layout

- **One screen on a laptop.** Every screen should show all the information
  and every action for that moment without scrolling on a laptop (test at
  1366x768). Phones scroll if they must; laptops do not.
  - Put the board and the controls side by side from 900px up (a two-column
    grid: board left, head and controls right), stacked on a phone. Odd Man
    Out: `.bf-stage` in `games/bluff/bluff.css`.
  - Size the board from the viewport: `height: calc(100dvh - Npx)` with a
    max, not a fixed `min-height`.
  - Budget for the site chrome. The masthead is 64px and the footer (outside
    `.app`) is 66px, so the app needs `min-height: calc(100vh - 66px)` or the
    footer alone creates a scroll.
  - Anything that can grow (search results, lists) scrolls inside its own
    box with a `max-height`; the page never grows.
  - Use more of a wide screen (about 1100px) but never stretch to the edges.
    Waiting, cover and result cards stay narrow (about 560px), centred.
  - Prove it with numbers, not a look: `document.documentElement.scrollHeight`
    must equal `innerHeight` at 1366x768 in every phase of the game.
- **Show things only when they are relevant.** Suggestions appear after the
  position is tapped, for that position only. Never a hub of every option
  "just in case".

## Look and feel

- **Real assets only.** Club crests are `ClubBadge` (Wikipedia crests from
  `data/clubs.json`). Flags are real SVGs in `public/flags` (flag-icons, MIT,
  copied with its licence; add a credits line). Never hand-draw a badge or a
  flag: it "looks crap" (Jonno). I drew flags twice before being told. Search
  the repo and the open-licence packages first. Gap-fill from Wikimedia
  Commons (Yugoslavia).
- **Mini titles are not pills.** Use a short rule and small caps (`bf-eyebrow`),
  not a rounded tag.
- **Red is rationed** to the brand and the one action per screen. Lives are
  hearts in the game's own colour, not red.
- **One red button per screen.** A secondary way out is a plain button of the
  same shape in the paper colour (`bf-menu`), never an underlined text link,
  and never "Abandon" or "New game" wording. The masthead Back is the exit
  mid-game; "Back to main menu" ends a finished game.
- **Toggles are switches** that slide, not On/Off segmented buttons.
- **Help text is short and legible.** One sentence, on a white card in dark
  ink, behind an (i). Bare white text on a coloured ground is read as
  decoration and ignored.
- **Cards look the same everywhere.** Anything the player can pick (pitch
  cards, suggestions) is the same white card.
- **Show the context on both sides.** A scoreline carries the crest or flag
  of each team; the board carries the home team's on a prominent spot.
- **Nothing is a clue unless it is meant to be.** Cards carry only the name,
  so the fake has no flag or number to give it away.
- **Reveals show the truth, visually.** Turn the card over to the real one and
  keep the fake in sight (a tab), instead of a sentence saying who it was.
  Keep tabs inside the board at the edges.
- **Every click-driven change glides** (`smooth()`); nothing teleports. Loss
  and gain get a short animation (a heart pops, drains, floats up).
- **Respect `prefers-reduced-motion`**, and make the resting state of an
  animation the final state so reduced motion still shows the result.

## Difficulty and hints

- Test a hint's generosity by playing it. Three suggestions per position was
  "too generous" and a keeper with several was "overkill easy". Tune with
  named constants (`HELP_COUNT`, `LIVES`, `MAX_LOSSES_PER_ROUND`) so a
  playtest change is one number.
- Draw hints once per round and key them to a group (all defenders share the
  same two), not per slot, so tapping around does not leak more.
- Hints that are "free" kill the game. Default to fewer.

## Interaction

- **Drag and drop uses pointer events**, not HTML5 drag, so a finger works.
  Start dragging after about 8px, keep a tap working, and ignore the click a
  drag leaves behind (`games/bluff/components/useCardDrag.ts`).
- Give every draggable a tap alternative.

## Demos and explanations

- **No self-playing loops, progress bars or autoplay.** They "stress" the
  player and steal attention; a demo cannot be paused. A demo stays on the
  step chosen, plays once, replays when the step is tapped again.
- Explain with a picture of the real thing (a mini phone playing one step),
  one short line per step.

## Copy and naming

- A request to "change the title" may mean the page headline or the game's
  name. Change the smaller one, say which, and ask about the other. Do not
  rename site-wide things from vague feedback (memory: ask-before-renaming).
- Tier, rank and honour names are one or two words.

## Process mistakes (mine)

- **Silence.** Long builds with no status line. Say in a few words what is
  happening when work runs long.
- **Claimed a layout without looking.** The browser pane's screenshot of an
  emulated viewport is cropped, so a layout cannot be judged from it. Use the
  mobile preset for phone visuals and `getBoundingClientRect()` numbers for a
  laptop; say plainly what was only measured.
- **Scripted clicks race the view transition.** `smooth()` delays the DOM
  update, so a script that clicks and checks at once reads stale state. Poll
  with an `until()` helper before the next step.
- **`smooth()` leaves an unhandled "Transition was skipped" rejection** that
  shows the Next dev overlay as "1 Issue". Harmless; fix in
  `src/lib/motion.ts` (`t.finished.catch`) when a shared change is allowed.
- **Heredocs with apostrophes break the Bash tool.** Write files with the
  Write tool, or put a script in a file and run it.
- **vitest does not render JSX** (no React in scope). Test pure helpers
  (`hasFlag`, `teamMark`), not components.
- **A prod build shares `.next` with the dev server.** Stop the dev server
  first, then `npm run build`.
- **Check data coverage with a test.** `tests/team.test.ts` proves every team
  in the data has a crest or a flag file; a new data build can break that.
- Merge `main` into the game branch before merging back. Typecheck, `npm
  test` and a prod build must be clean before pushing `main`.
- Game branches write only to their own `games/<name>/HANDOFF.md`; the root
  file gets one index line on merge.

## Checklist before showing Jonno a screen

1. Fits one laptop screen at 1366x768, no scroll, in every phase.
2. Real crests and flags, no drawn ones.
3. One red button; secondary actions are plain buttons.
4. Hints appear only when relevant and are not generous.
5. Help text is short and on a card.
6. No autoplay, no looping motion.
7. Every screen change glides; reduced motion shows the end state.
8. Phone width checked with the mobile preset.
9. Constants for every tunable number, named in the HANDOFF.
10. Link given to play it (localhost or live), unasked.
