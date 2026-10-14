# Step chain — state of play

**Updated 2026-10-14.** Branch `feat/step-chain` (cut from `main` at 3c2660e),
worktree `.claude/worktrees/kind-tharp-12c680`. Site-wide notes: root
`HANDOFF.md`. Spec (the decision record): `games/step/SPEC.md`.

**Status:** spec written, waiting on Jonno's calls (run length, grade words,
miss rule, run grade). Nothing built. Do not merge to `main` until Jonno has
played it.

**Feasibility measured 2026-10-14** (scratch script, not committed): with
Deep Cuts' given rule (fame 70+, 2–6 clubs) and its club pool (biggest 60 in
followed leagues, 35 clubs), 1,643 PLAYER–CLUB steps have 25+ answers, 12+
checkable (fame 30+) and a famous way in (top answer fame 60+). Median field
37. Widening the club pool to 100 gives 2,178 steps over 61 clubs.

**Found while reading:** Deep Cuts' grade ruler (`factFame` via `sidesOf`)
only weighs the given-player link: the prescribed-club side has no player in
the puzzle slots, so the club stint never counts. This mode should weigh both.
