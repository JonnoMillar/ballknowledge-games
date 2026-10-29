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
  after the rename verified on f621d17 (2026-10-21).
- Rondo openers for a 16-26 audience: 292 to 193 (`audienceKnows` in
  games/rondo/server.ts, Steps' faded English views; careers ended before
  2016 need the 1.5M given bar). Era fade shared in src/lib/fame/era.ts.
- Steps' era fade dates retired players by their real last season
  (`lastPlayed`; an undated spell read as current for 1,072 of them). Verdicts
  unchanged at 47 of 59; 3 of 116 upcoming deepest answers moved.

## In progress
- Player photos: docs/photo-pipeline.md. Round 2 done; phase 2 (cutouts for
  893 players, kit card, credits) runs on branch `claude/photo-pipeline-1d882c`
  in its own session, not merged. Rescoped 2026-10-29 (niche cards are the
  prize): every pool player with a usable photo (~9,000), most viewed first;
  Jonno checks the top 500, the rest ship on the ranking with extra automatic
  rejects and a dev-only "wrong photo" flag. Grade material behind every
  player (grey before a grade), no club-colour ground; kit card for no photo,
  with a new silhouette (his pick from options).

## Needs Jonno, small
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
