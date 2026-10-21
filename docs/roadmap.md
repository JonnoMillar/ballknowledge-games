# Roadmap: personal project to polished product

Jonno's list of 2026-10-19, triaged. Update as items land.

**Audience: 16-26** (Jonno, 2026-10-21). Players under 30 don't know pre-2010
careers; pick, test and grade with recent players. Applies to every item below.

## Done (on main)
- Chain: vertical link rules centred (were 1px right of the rail).
- Puzzle brief cut to the ring and one rule line.
- Steps end screen: View collection button.
- Grades key: one worked example, played for Arsenal (Henry, Ljungberg,
  Clichy, Chamakh, Stepanovs), held to the real rule by a test.
- One button system site-wide (`.lobby-play`, `.lobby-quiet`, `.lobby-small`,
  `--btn-*` tokens) and one How to play card on every front page.
- Steps grading on English Wikipedia views; feedback round 1 applied.
- Missing players (Pedri, Iwobi, Tyrique George, Mkhitaryan, Ronaldinho and
  1,193 more); Chain's schedule pinned so past days never change.
- Steps grades for a 16-26 audience (era fade, club reach, modern givens):
  47 of Jonno's 59 round verdicts land, none more than one grade off.
- Site is https://ballknowledge-games.vercel.app (Vercel project renamed
  `ballknowledge-games`); football-chain.vercel.app 308-redirects. Auto-deploy
  after the rename is untested until the next push to main.

## In progress
- Player photos: docs/photo-pipeline.md. Round 2 done; phase 2 (cutouts for
  893 players, kit card, credits) runs on branch `claude/photo-pipeline-1d882c`
  in its own session, not merged. Next gate: Jonno's approval round on the
  ~395 fame-60+ cutouts, then merge.

## Needs Jonno, small
- Rondo opening players: a keep/cut round over ~290 starters (no data rule
  separates Gyan from Rosický, Mertesacker, Gary Cahill). Bias it to players
  a 16-26 audience knows; Steps' audience ruler (games/step) may cut most of it.
- Odd Man Out solo mode (the model picks the odd man out; daily + archive):
  a short spec for his yes/no.
- Spoofed's AI rank art clashes: proposal is the site's grade cases instead.
- "The steps card outline fo…": his message was cut off; ask what he meant.
- Demos: they loop until a rule is tapped (combines his lessons doc's two
  rules); confirm or switch to never autoplay.

## Big decisions, in dependency order (each unblocks the next)
1. Names: the site ("Football games" in the masthead), Rondo (his ideas:
   "Keep it up", "One touch"; the game is closer to hot potato), Chain, others.
2. Brand kit for the hub: logo, palette, type, icon style.
3. Our own icon set (archive icon etc.) and the game icons (Chain, Spoofed,
   Pitch pin, Rondo are not final).
4. Background and top banner: subtle quality upgrade (Higgsfield).
5. Spoofed rank art, once the brand exists.

## Independent, later
- Optional login: worth it after the polish, optional, free tier. Value:
  streaks, collection, high scores and favourites on any device. Until then,
  keep new progress code behind one store module so it can sync later.
