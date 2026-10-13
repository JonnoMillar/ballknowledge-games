# Project instructions (Football Chemistry Squad Game)

One Next.js site, many games. Start here: read `HANDOFF.md` (the site and the
games index), then the `HANDOFF.md` of the game you are working on.

## Layout

- A new game lives in `games/<name>/`: `lib/`, `components/`, `tests/`,
  `server.ts`, `data/`, its CSS and its own `HANDOFF.md`. Its route,
  `app/<name>/page.tsx` (and `app/api/<name>/`), is a thin shell that imports
  from there. `games/rondo` and `games/pin` are the pattern.
- Shared code stays where it is: `src/lib` (daily, progress, club colours),
  `components/` (ClubBadge, Sticker), `data/` (the player pool). A game may
  import shared code; shared code never imports a game; games never import
  each other. Something two games need moves to `src/` first.
- Chain (`/`, `/play`, `/deep`) predates this and lives in the root
  `src/lib/chain`, `components/`. Leave it unless a task moves it.

## Branches and drafts

- `main` is the trunk. Each game in progress is its own branch in its own git
  worktree (`.claude/worktrees/`), cut from `main`.
- On a game branch, write notes only in `games/<name>/HANDOFF.md`. Do not edit
  the root `HANDOFF.md` or this file there; the root gets one line in its
  games index when the game merges. This is what stops two drafts colliding.
- To pick up shared changes, merge `main` into the game branch. When the game
  is verified, merge it into `main`.
- At each stage gate: update the game's HANDOFF.md, commit, check in with
  Jonno, suggest /clear.

## Committing

Auto-commit after any verified, working change, without asking first. A
completed fix, feature, or doc update goes straight to a commit once it's
been checked (tests, typecheck, or a browser check as appropriate) — no need
to ask "should I commit this?" first.

Merging a verified branch into `main` and pushing `main` to `origin` (a push
deploys the site) also need no asking, once typecheck, `npm test` and, for
anything that changes pages, the prod build are clean. If `origin/main` has
moved, merge it in, re-run the checks, then push. Report what shipped
afterwards. (Jonno, 2026-10-13: the old ask-before-every-push rule was pure
friction; it was a precaution from when no remote existed.)

This does not extend to:
- **Force-pushes** (`--force`, `--force-with-lease`), and deleting remote
  branches — always ask.
- **Force-anything, resets, or history rewrites** — always ask.
- **Anything flagged as broken, unverified, or partial** — commit only work
  that actually works. If something is left incomplete or a concern is
  flagged to the user, say so plainly and don't commit it as if it were done.

Still show `git status`/diff before committing anything that looks like it
might have picked up a stray file.
