# Game design playbook

What we have learned about why small daily knowledge games work, and how to
turn free data into new ones. Written 2026-10-08 from a brainstorm session.
This is the knowledge base for new game ideas, football or not. Add to it
when a game ships and teaches us something; delete anything proven wrong.

## 1. Why the successful games work

Reference games: Football 501, 38-0, Krillion, Tiki Taka Toe, Wordle,
Connections, Anthropeum.

| Pattern | Why it works |
|---|---|
| Lots of time, often unlimited (solo) | Football knowledge is a long-term memory search. The fun is the tip-of-the-tongue dig; a timer measures speed, not depth. Head-to-head is the exception: there the timer *is* the tension. Rule: solo untimed, versus timed. |
| Borrowed identity (darts, the Invincibles, tic-tac-toe) | Gives three things free: rules with no onboarding, a ready-made brag vocabulary ("180", "38-0", "one in a krillion"), and a known sense of what good looks like. The share message is pre-written. |
| No login, no progress beyond the session | Zero friction, and everyone is level each day. (Deep Cuts' card collection goes against this on purpose; keep it optional and local.) |
| Open recall: "search your whole database" | The prompt is a filter; any member of the set is a valid answer. Many valid answers make the answer personal, which makes rarity scoring possible. Single-answer guessing games (Who Are Ya, Framed) are a different genre: deduction. |
| Niche rewarded, never required | The reward curve needs a floor reachable with famous names and a bonus for obscure ones. In 501 a famous name still takes a chunk off. |
| Mid-tier plays, elite spreads it | Elite players make the screenshots. Per-turn brag moments also let a mid-tier player occasionally hit an elite moment (a lucky 180), which drives sharing volume. |

### What creates appeal

- **A comparison scale.** Distribution charts need a backend and traffic
  (cold start). Fix: derive the scale from the data offline (par, rarity,
  checkout). Works from day one with no server.
- **One end goal** whose number is already famous (38-0). Rare but visibly
  possible.
- **Multiplayer.** Real-time needs infrastructure. Cheap version: async
  challenge link with the board seed in the URL ("beat my score").
- **Per-turn brag events**, always checkable against data, never subjective.
- **Round count.** About 7 rounds, about 5 minutes. Each round needs a fresh
  constraint or it feels like a repeat.

### Often missed

- **Same board for everyone, seeded by date.** Comparison means nothing
  otherwise.
- **Spoiler-free share card** (emoji grid or scorecard). This is the viral
  loop.
- **Autocomplete must search all players**, never only the valid set, or it
  leaks answers.
- **Name matching** (typos, accents, "Son" vs "Son Heung-min") decides
  whether the game feels fair.

## 2. Derived information

Raw facts (a player's country, a club) are lookups: instinctive, no dig,
instantly googleable. Derived criteria combine dimensions, and that is how
a data pull becomes a game with its own rules.

| Derivation | Example |
|---|---|
| Intersection | Played for Everton and Spurs |
| Negative space | 50+ apps for a club, never scored |
| Ratio | More PL assists than goals |
| Cumulative | Career goals summing to a target |
| Temporal | Played PL in three different decades |
| Relational | Teammate of both X and Y (Chain) |

Three wins:

1. **The data field becomes the score unit** (501 subtracts appearances).
2. **Answer-set size is a difficulty knob you can compute.** Generate prompts
   offline, keep ones with roughly 15 to 200 valid answers whose median
   answer is reasonably famous.
3. **Free fame proxy: Wikipedia pageviews.** Gives rarity with no user data
   and filters out zero-appearance academy players.

## 3. The recipe: dataset + verb + filter

Data is not scarce. The scarce part is the **verb**, the one action that
turns a dull dataset into a puzzle, plus a **quality filter** that rejects
bad boards automatically. Contour lines are dull; "which way am I facing?"
on a contour map is a game.

| Verb | Player does | Example |
|---|---|---|
| Place | Pin on a map, timeline or pitch | Anthropeum, TimeGuessr |
| Orient | Which way you are facing | Contour orientation game |
| Estimate | Guess a number | Orders of Magnitude |
| Order | Sort items | Chronological sort games |
| Split | Draw a boundary | draw.city |
| Identify a shape | Name it from an abstract picture | Graphs, Worldle |
| Spot the liar | Find the one fake among real items | (no big hit seen yet) |
| Recall a set | Name members fitting a rule | Football 501, Krillion |
| Chain | Link items one to the next | Chain |

Proof the recipe works: **Anthropeum** (Met Open Access CC0 data + "pin
where and when it was made"), a student project covered by Scientific
American and Smithsonian in July 2026. **draw.city** (US census + "draw the
line that splits the population"). **Graphs** (unlabelled chart + "which
dataset is this?").

### Where the space is open

Crowded: guess-the-place from imagery (Satle, WorldGuessr, Globle) and
Wordle clones (alldle lists 1,287 "-dle" games).

Open: puzzles whose answer must be **computed** from raw data (water flow,
line of sight, orientation, night sky). The compute pipeline is the moat:
anyone can copy a JSON file, few will build a GIS pipeline.

### Don't clone

Taking a successful game's whole mechanic gives no identity of its own.
Borrow patterns and verbs, not whole games.

## 4. Game idea bank

### Football, built on borrowed shells

- **Golf (9 holes).** Each hole is a 501-style subtraction with a fresh
  derived prompt; each name is a stroke, busting costs one. Par computed
  offline (fewest names among famous players, plus slack) gives a
  comparison scale with no backend. Brags: hole-in-one, eagle, "-4". Risk:
  close to 501.
- **6-red snooker** (real format, max 75). Red = easy prompt worth 1, then
  choose a colour, yellow (2) to black (7), each a harder criterion. A miss
  ends the break. Self-chosen risk fits "mid-tier plays, elite spreads it".
- **Penalty shootout.** Five kicks against a friend over an async link,
  then sudden death. Each kick a prompt; the "keeper" is a rarity threshold.
- **Bingo card.** 5x5 grid of derived criteria; brag "one player, four
  squares".
- **Blackjack 21.** Names add their stat toward 21; over busts.
- **Spot the fake transfer.** A real career path with one invented club;
  find it. Uses Chain's club-history data. Fakes must be plausible (same
  era, same league tier). Shipped as **Spoofed** (`games/itk`).
- **Pitch pin.** A famous goal is named; pin where it was struck. Shot
  coordinates from Understat or StatsBomb open data; score is metres off.
  Shipped as **Pitch pin** (`games/pin`).
- **Match from data (side mode).** Progressive reveal to identify a match:
  heatmap, pass map, a shot with xG, then the xG race or date and stadium.
  Score is clues used. Deduction, not recall, so not a flagship. Heatmaps
  within a position look alike. StatsBomb open data has the full 2015/16 PL
  season (the Leicester season, a launch theme); current-season heatmaps
  only come from FotMob/SofaScore (terms of service unclear).

### Football, the next five (2026-10-15)

Picked to use verbs the site does not have yet (Chain and Rondo chain,
Spoofed spots the liar, Pitch pin places). `data/careers.json` already has
every stint's years, league apps and goals; `data/pool.json` has fame.

- **Flight path** (daily, identify a shape). A career drawn as arcs between
  club locations on a map, no names; name the player. Reveal more arcs, then
  the years, per wrong guess. Journeymen make distinctive shapes. Needs
  club coordinates from Wikidata (the club's or its ground's P625), free.
  Filter: the path must be unique in the pool (no other player with the
  same set of club locations) and the player famous enough. The share card
  is the map itself, blank.
- **Season line** (daily, identify a shape). A team's league position week
  by week, as a line; name the team and season. Fans remember seasons as
  stories (the 95/96 collapse, Leicester, the 13/14 slip). Data:
  football-data.co.uk's free results CSVs (English leagues since 1993/94),
  tables computed per matchweek. Filter: a computed drama score (late
  collapses, great escapes, title races) plus club fame. Current seasons
  add themselves.
- **Tunnel** (daily, order). Five players line up in the tunnel; put them
  in order by the day's attribute: age, height, league goals for a club,
  number of clubs. Crouch at the end of the height line is the identity.
  Ages and heights need Wikidata P569 and P2048 (heights are patchy; the
  infobox has them). Filter: pick sets where fame or era misleads, such as
  late bloomers, and keep gaps big enough to be fair. Score: pairs in the
  right order; brag is a perfect line.
- **Over** (pub, one phone, estimate). Price Is Right rules: closest
  without going over. "League goals for Spurs: Defoe + Keane + Kane."
  Everyone calls a number, the phone takes them and reveals. Going over is
  the bust, like 501. Data already in `careers.json`; sums make it a
  derived question, not a lookup. Zero infrastructure, same model as Rondo.
- **Bluff** (party, a phone each). Fibbage rules on true football facts:
  "Before Chelsea, Drogba played for ___". Everyone types a fake, all the
  answers are shown, everyone votes for the truth; points for finding it
  and for fooling mates. Unlike Spoofed, the lies come from your friends.
  Prompts are generated from `careers.json` (an obscure early club before a
  famous one). Needs rooms and realtime across phones: Vercel WebSockets
  with a store, or a free tier such as Supabase Realtime; check limits and
  flag any cost first.

**Jonno's verdicts (2026-10-15):**
- Flight path: binned. Boring, and too close to Spoofed (both are "a
  career path"). Lesson: a new verb on the same content still feels the same.
- Over: binned. It is Football 501 with a different stat. Lesson: swapping
  the data under a known game's rules is a clone, not a new game.
- Season line: maybe, as a reveal. The line starts at one fifth; each wrong
  guess adds a fifth plus a hint; the end shows the final position, the
  season and that year's champion.
- Tunnel: liked, reshaped. Same five players re-ranked across five
  categories, easy to hard (age and height first).
- Bluff: liked, reshaped. Turn-based on one phone: one player plants a lie,
  the other picks it while being stared at. The open question is what to
  lie about; Jonno's first idea is a real lineup with one player swapped.

Reserve: **What year?** A club's XI (names only); slide to the season,
scored in years off. Rosters come from `careers.json` stints, so they are
approximate.

### Physical world (computed answers)

- **Contour orientation** (seen elsewhere; don't clone as-is). Pipeline:
  Copernicus GLO-30 or OS Terrain 50 DEM, `gdal_contour` for the map,
  three.js or Blender render of the view. Quality filter: ray-march a
  360-degree horizon profile from the dot; reject flat sites and wall
  views; reject bearings whose skyline matches another bearing (ambiguous);
  difficulty is the gap between best and runner-up match. Hook idea: named
  hills (Wainwrights, Munros).
- **Raindrop.** Dot on a map: which sea does a raindrop there reach?
  Terrain + free flow routing (pysheds, WhiteboxTools). Near-watershed
  answers are counter-intuitive.
- **Can you see it?** From a summit, which of five landmarks are visible?
  Line of sight from DEM.
- **Night sky.** Rendered sky at unknown place and time; pin where on Earth.
  Free skyfield library + star catalogue.
- **Climate fingerprint.** 12-month temperature and rain chart; name or pin
  the city. Open-Meteo or Meteostat.

### Culture

- **Fake company.** Four real UK names from the free Companies House API,
  one LLM-made fake. Needs plausible fakes and an offensive-name filter.
- **Wikipedia spike.** Pageview chart with yesterday's spike; guess the
  page. Deaths dominate spikes, so it needs a taste filter.
- **Museum ordering.** Art Institute of Chicago, Rijksmuseum, Smithsonian
  open collections; "sort these five objects by age" (Anthropeum already
  owns map pinning).

## 5. Catches

- Licences vary: OpenStreetMap needs attribution (ODbL), Mapillary is
  CC-BY-SA, OpenSky probably restricts commercial use (verify).
- Data about something is not its images: Pokémon stats are fine, sprites
  are Nintendo's; Land Registry prices are open, listing photos are not.
- Transfermarkt and FBref block scrapers (see the toolbox).
