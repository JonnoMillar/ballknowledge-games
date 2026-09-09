# Recall XI — project brief

> **This is the origin document — the decisions made before anything was built.
> It is kept as a record and is no longer the state of play; see `HANDOFF.md`
> for that.** Two things below have since been overtaken: obscurity scoring is
> not a parked idea, it is the whole game, and Wikidata sitelink counts are the
> fame proxy rather than Wikipedia pageviews. The IP stance also moved — club
> crests are now used.

## Concept
A squad-recall puzzle game. Player sees a formation with a couple of names
confirmed. Coloured chemistry links between positions hint at whether the
hidden neighbour shares a club, nation, or league. Player fills in the rest
of the XI from memory and deduction.

## Decided so far
- **No FIFA/FUT card art.** Own stylised visual system instead, avoids the
  IP issue entirely rather than relying on tolerance. Leaning toward a
  Panini-sticker-album aesthetic rather than anything card-shaped.
- **Chemistry engine: hybrid.** Adjacency-based coloured links for the
  visible clue (simple to build, easy to read), but track real whole-squad
  chemistry underneath and reveal a number once a player's guessed.
- **Squad sourcing: curated first.** Hand-build puzzles for launch.
  Procedural generation from a tagged player pool is a v2 idea, not v1,
  same for user-submitted squads (bigger scope: accounts, moderation).
- **Data: no live API needed.** Nothing here needs real-time scores or
  stats, just stable facts (name, club, nation, league, position) for a
  curated pool of players. A frozen static JSON file is enough, avoids
  every free-tier API's rate limits and gaps.
- **Stack: static, client-side.** Next.js on Vercel, no backend required
  unless/until user-submitted squads happen.

## Parked idea: obscurity scoring
A mode where hitting the chemistry target isn't enough, you're rewarded for
solving it with the least famous valid player (e.g. Mariano over Benzema or
Mbappé for a Real Madrid striker link). No existing football fame/popularity
ranking is usable off the shelf, closest is Goalden View, which is a
commercial B2B platform, Premier League only, no public API. Best DIY proxy:
Wikipedia pageviews, free API, covers squad-filler-level players, an
established stand-in for "how known is this person" in real research.

## Reference prototype
A working single-file React prototype (`recall-xi.jsx`, never committed to this
repo and since superseded by `components/`): 4-3-3
pitch, SVG chemistry-link lines, click-to-guess flow, simplified
adjacency-only chemistry, hardcoded placeholder squad. Good starting
reference for the pitch/link rendering approach, not the final data model
or chemistry logic (see hybrid engine above).
