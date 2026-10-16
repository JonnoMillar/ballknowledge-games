# Game build lessons

Everything Jonno has corrected, rejected or approved while we built Chain,
Rondo, Slugger, Pitch pin, Spoofed, Steps, Odd Man Out, Sorted and Season
line, merged into one guide. The aim: a first draft that already follows
these, so a playtest finds taste and tuning problems, not the same mistakes
again. Compiled 2026-10-16 from every HANDOFF, spec, playbook, memory note
and the toolbox (see "Where this came from" at the end).

How to use it: read `docs/game-design-playbook.md` to pick a game (verbs,
the idea bank, Jonno's verdicts), then this to build it, then the root
`HANDOFF.md` for the site, then your game's own `HANDOFF.md`. Run the
checklist at the end before showing Jonno anything.

**How firm each rule is.** An untagged rule is firm: Jonno said it, or it has
held across more than one game. **(provisional)** means one game has it and
Jonno has not reviewed it; follow it, but expect it to move. **(conflict)**
means two parts of our own history disagree; it is listed in "Open" and
needs his ruling. Most games are not in their final form, so the maturity
map says which game each rule was learned on.

## Maturity map

| Game | State | What is still open |
|---|---|---|
| Chain (`/chain`) | Live. The most settled: identity, scoring, motion. | Daily boards uncurated for a British audience. |
| Spoofed (`games/itk`) | Live, five playtest rounds, rules frozen. | Icon (centre circle, see icons). |
| Steps (`games/step`) | Live inside Chain's hub. | Grade calibration is global fame, not British; "Steps" vs "Step". |
| Pitch pin (`games/pin`) | Merged. Front page on the kit. | Jonno's verdict on the front page; icon; StatsBomb licence. |
| Rondo (`games/rondo`) | Live, front page on the kit. | Jonno's verdict on the live demo. |
| Odd Man Out (`games/bluff`) | Merged, two playtest rounds, mole icon on the hub (direction approved, not final art). | Lives, `MIN_MEDIAN_FAME`, whether the name and headline change. |
| Sorted (`games/tunnel`, branch only) | Playable draft, not on the hub. | Hub tile, archive, portraits. Name chosen. |
| Season line (`games/season-line`) | Merged to `main` 2026-10-16, three playtests, not on the hub. | Name, hub icon, credits line, `EPOCH` reset at launch. |
| Slugger | Off the hub ("not good enough"), route still works. | Parked. |
| Recall XI | Parked. | Parked. |
| Deep Cuts | Archived 2026-10-14, collection stays. | Parked. |

---

# Part 1. UI and UX

## 1.1 One world

- **The site is one world.** Jonno's verdict on the first hub: "doesn't feel
  like one world". A game's front page uses the shared kit in
  `app/globals.css` ("GAME FRONT PAGES"): a hero on the game's own ground
  colour (`ground` in `src/games.ts`) with its miniature, one red button,
  paper cards beneath. Spoofed's front page was the model he liked: today
  across the top, cards beneath, a big archive card.
- **The identity is the sticker album.** Cream page (`#F2EEE6`), white
  stickers, ink text, one red (`#D62839`). Big Shoulders Display for
  masthead, nameplates and numbers; Libre Franklin for the rest. Each game
  adds one ground colour, not a new look.
- **No dark mode as the default** and **no terminal styling** (Chain
  identity rebuild, standing). A dark thing is fine only when it is a real
  object, such as a scoreboard.
- **Light comes from one place.** Flat icons on a flat page looked cheap
  beside realistic art, so the art is cut out and the tiles are lit. The
  same idea killed the cork-board look: a drawn clip on a real wall, pins in
  a desk. Objects in one scene must not contradict each other.
- **Show the product, not copy about it.** The first Chain home page was "too
  plain and boring: blank background and lines of text". The fix was drawing
  the board itself on the page. A front page shows a picture of the real
  game, not a paragraph.
- **A front page has states, designed up front.** Never played, today not
  started, part played, done. The done state shows the result, a countdown
  and no red button. The hub's big tile suggests the first game with a daily
  not done today (`markDone` in `src/lib/today.ts`, keyed by the day's own
  date so an archive day never counts as today).

## 1.2 Layout: one screen on a laptop

- **Every screen shows all its information and every action without
  scrolling at 1366x768.** Phones may scroll; laptops do not. Applied so far
  to Odd Man Out, Pitch pin and Season line; the older games have not been
  audited (Spoofed's Share was below the fold at 1100x800).
- Two columns from 900px up: board left, head and controls right. Stacked on
  a phone. About 1100px wide at most, never stretched to the edges. Waiting,
  cover and result cards stay narrow (about 560px), centred.
- Budget for the chrome: masthead 64px, footer 66px outside `.app`, so the
  app is `min-height: calc(100vh - 66px)` or the footer alone scrolls.
- Size the board from the viewport (`calc(100dvh - Npx)` with a max), never a
  fixed `min-height`. Pitch pin sizes its pitch by height so Throw is never
  below the fold; Season line tightens spacing under 700px high.
- Anything that can grow (search results, lists) scrolls inside its own box.
  Finished boards drop their empty rows.
- **Prove it with numbers.** `document.documentElement.scrollHeight` equals
  `innerHeight` in every phase of the game. Pane screenshots of an emulated
  viewport are cropped and cannot judge a layout.
- Show things only when they are relevant: suggestions appear after the
  position is tapped, for that position only. No hub of every option "just
  in case".

## 1.3 Buttons, red and navigation

- **One red button per screen**, the one action. Red is rationed to the brand
  and that action. A secondary way out is a plain button of the same shape in
  the paper colour, never an underlined link, and never the words "Abandon"
  or "New game".
- **Nobody is ever trapped.** The back chevron (`components/Back.tsx`) is
  first in every masthead, in the same spot. Mid-game it is the way out; a
  finished game ends with "Back to main menu".
- Lives are hearts in the game's own colour, not red. Misses are grey with a
  cross (Sorted does this). Red stays for the brand and the button.
  **(conflict)** Spoofed's miss mark, Pitch pin's "Deadly" tier and Season
  line's down arrow are red.
- **Marks carry a symbol as well as a colour: Jonno is colour-blind.** Solid
  green with a white tick, solid yellow with a white tick, solid red with a
  white cross. He rejected numbers on marks (a "2" reads as "got it on the
  second go") and double ticks.
- Toggles are switches that slide, not On/Off segmented buttons.
- Anything the player can pick (pitch cards, suggestions) is the same white
  card everywhere.
- Hover lift on red buttons only on hover-capable devices, with a pointer
  cursor (a `<button>` needs it set).

## 1.4 Words

- **As little text as possible.** No walls of copy, no blurbs. One idea per
  line.
- **Titles are one or two words, with no jokes or quote lines.** Tier, rank,
  grade and honour names are seen over and over. Put the humour in the art
  or the reveal. Applies to share lines too.
- **Do not rename shared things from vague feedback.** Jonno reverted
  Plastic...Anorak within minutes. If feedback could mean rename or
  recalibrate, do the clear part and offer options for the rename. A request
  to "change the title" may be the headline or the game's name: change the
  smaller, say which, ask about the other.
- Reserved words: do not reuse Krillion's vocabulary (deep cut, schooler,
  plankton, dive, "one in a ..."). Rejected rank names: Casual as a rank,
  Season ticket, Flawless.
- Mini titles are an eyebrow (a short rule and small caps, `bf-eyebrow`), not
  a rounded pill.
- **Help text is one short sentence on a white card in dark ink, behind an
  (i).** Bare white text on a coloured ground is read as decoration and
  ignored.
- **Words do not roleplay.** No "pass" or "bib" talk in Rondo's rules: three
  plain rules, and the pictures carry the rest.
- Copy on goal pages is gender-neutral (Pitch pin: no he, his, him).
- Never put a position word, foot, flag or number in a clue that could give
  the answer away (Pitch pin's banned-word list, tested).

## 1.5 Real assets and art

- **Real crests and real flags only.** `ClubBadge` (Wikipedia crests via
  `data/clubs.json`) and `public/flags` (flag-icons, MIT, licence copied,
  credits line added). Never hand-draw a badge or a flag: Jonno said they
  "look crap", and I drew flags twice before being told. Search the repo and
  open-licence packages first; gap-fill from Wikimedia Commons (Yugoslavia).
  Demos use real examples with clubs the viewer is comfortable with
  (Ronaldo for Spoofed), never invented crests.
- **Credits.** Every asset source gets a line on `/credits` (data, crests,
  flags, StatsBomb logo, Higgsfield textures).
- **Portraits must be in-era.** A third of Commons photos were taken after
  retirement. A resolved "none" shows the silhouette, never a pundit in a
  suit. TheSportsDB cutouts are development-only (their terms); production
  shows Commons photos. Each game that shows faces needs its own
  `fetch:portraits` target (`--itk` exists; Steps and Sorted still need
  theirs), and the faces must not give the answer away.
- **Nothing is a clue unless it is meant to be.** Odd Man Out cards carry
  only a name: no flag, number, portrait or captain mark, because the fake has
  none. The same for fonts, order and spacing.
- **Reject list for art, so we stop re-learning it:** outer glows, sparkles,
  foil and "rarity glow", a shine crossing a photo, a shine that never rests,
  drawn SVG facet patterns, retro cartoon die-cut stickers, muddy print
  texture, stamps ("cheap and crappy"), tacky right-or-wrong animations ("I'll
  be angry"). Photographic textures from Higgsfield passed.
- **For any art set:** propose two or three distinct directions with one
  sample each, always generated with a reference image (the unreferenced
  Recraft test was "terrible planning"), before generating the set.

## 1.6 Hub icons (the miniatures)

The direction is settled: a cut-out tabletop miniature on a lit, coloured
tile, one object on a felt grass disc (Jonno picked style C of three,
2026-10-13). Names and the exact objects are not final; the direction is.
Current shelf: Chain, a red and a cream link; Spoofed, a shirt and tag;
Pin, a pin and a ball; Rondo, cones and a ball; Steps, four metal plates.
Odd Man Out has a first candidate, a felt mole on a molehill (one
generation, 2026-10-16, not cut out or chosen).

1. **Draw the title.** Where the title is not a drawable object, draw the
   image the game's own copy keeps using ("Can you find the mole?"). The icon
   is for recognition and telling games apart; the tile carries the name and
   the front page explains the rules.
2. **One object, nothing else.** No UI, scores, text, crests, flags or faces
   (models render them badly, and we do not hand-draw them).
3. **Different from every other icon** on three counts: silhouette (tall,
   flat or round), colour (the tile's ground plus the object) and prop
   family. Props already used: links, shirt, tag, pin, ball (twice), cones,
   plates. A third ball would be a last resort.
4. **Colour follows the tile ground.** The object sits in the ground's hue
   family with one contrast accent. No red objects: red is the brand and
   the action.
5. **Pitch lines are real.** Any white marking must be something you could
   stand on at a ground: a straight touchline or halfway line, or a whole
   centre circle with the halfway line through it, a penalty spot, a box
   edge, a corner arc with its flag. Never a circle with a short line
   poking out, never a corner shape floating mid-disc. (Jonno, 2026-10-16:
   Spoofed's circle with one line coming out and Pin's corner line "would not
   be found on a pitch".) The safe default is one straight line, or none.
6. **Keep the prompt short.** One sentence for the object, one for the line,
   "Nothing else", and the reference image attached. Long prompts are what
   produced the stray circle. The mole came right on the first try with:
   "Same style as the reference image: a tabletop miniature on a round felt
   grass disc, soft studio light, plain background. A small needle-felted
   grey-brown mole pops up out of a mound of dark soil in the middle of the
   disc. One straight white pitch line runs across the grass, as a touchline
   or halfway line would. Nothing else."
7. **Test before keeping:** greyscale or blurred it must still be that game,
   it must hold at 120px on the tile and 480px as the lobby hero (they morph
   into each other), and put it beside the whole shelf with the names
   covered: if you hesitate between two, regenerate.
8. **Mechanics.** Reference is `docs/hub-icon-reference.png` (the Chain
   sample, the full tile before cut-out). Upload with `media_upload`, `curl
   PUT`, `media_confirm`. Model `gpt_image_2_5`; its reference role maps to
   `image_references`. Then `remove_background` (four at once on the pro
   plan; a generation's job id works as `media_id`), then crop every icon
   with one fixed box, 150,150,854,854 of 1024, so every disc is the same
   size. About 0.5 to 1 credit an image. **The credits are Jonno's dad's:
   never spend them without a yes for that exact batch.** Show the
   generation to Jonno before cutting it out.
9. Redo candidates if Jonno agrees: Spoofed (centre circle with a tail) and
   Pin (a corner line that is not on a pitch).

## 1.7 Motion

- **No teleports.** Every click-driven change glides from before to after:
  something in both states moves and resizes, new things arrive, removed
  things leave, the layout makes room. Jonno's example: Rondo's "+ One more"
  adding a name row. Treat motion as part of done.
- **Menu and page moves are slow and staged.** Jonno's verdicts, in order:
  "rushed", "a flashbang", "still quick", "menus are big slow decisions".
  Standard: equal.design's "5 rules for motion". Hub to a front page runs in
  three stages, one at a time: clear the table (300ms, ease-in), grow the
  bare card (800ms, ease-in-out; the coloured ground is its own layer so the
  card moves without its text), then fill in (from 1100ms: tag, headline word
  by word, the rest, then cards). Never two motions at once.
- Ease-in-out for things that change shape, ease-out for arrivals, ease-in
  for exits, never linear. Nothing under about 150ms; small in-page moves
  about 320ms. Stagger about 100ms.
- Native View Transitions API, no library. A hub tile and its hero share
  `view-transition-name: game-<id>` (and `-mini`). In a page, wrap a state
  change in `smooth()` (`src/lib/motion.ts`); `.vt` elements glide, arrive
  and leave. Firefox gets the plain cut.
- **Page-load entrances must be off under `.vt-landed`** (never removed), or
  they replay half a second after landing (the "blink" bug). A page that
  arrives by a morph gets `.vt-arrived`.
- A coming-back hub must be server-rendered with the true state (the `hub`
  cookie, `syncHub()`), or it rearranges after load. On a return, tiles only
  fade; they do not slide.
- **Respect `prefers-reduced-motion`, and make an animation's resting state
  its final state**, so reduced motion shows the result.
- **Win and loss get a short animation** (a heart pops, drains, floats up; a
  sealed link takes its colour). **Never a stamp, a shake or a slam on
  right-or-wrong** (Spoofed: no stamps; Chain: stamp gone). Slam is only for
  Steps' pack-opening reveal, which came from Jonno's feedback after he played it.
- Check mid-transition frames, not only the end state.

## 1.8 Interaction

- **Tap to place is primary; drag is the extra.** Give every draggable a tap
  alternative. Dragging uses pointer events, not HTML5 drag, so a finger
  works: start after about 8px, keep a tap working, swallow the click a drag
  leaves behind (`games/bluff/components/useCardDrag.ts`).
- **The pool is searched, never listed.** The search shows nothing until a
  name is typed; no suggestions, no recents. It searches every player,
  never only the valid set, or it leaks answers.
- On a phone the thumb hides about 8 metres of a pitch: Pitch pin rides the
  pin above the thumb with a magnifier. Check every precision control for
  thumb cover.
- The player's progress lives in `localStorage` under a versioned key
  (`step.progress.v2`); a reload resumes at the first open step; a finished
  day reopens on the result. Bump the key when the shape changes.
- A screen that waits on a server needs a designed waiting state (Spoofed,
  Sorted and Season line are all empty until the day loads).

## 1.9 Demos, explanations and the end screen

- **Explain with a picture of the real thing**, one short line per step: a
  mini phone playing one step (Odd Man Out), a real career with a real fake
  (Spoofed), real stickers (Rondo). Not a paragraph.
- **No self-playing loops, progress bars or autoplay** (Odd Man Out, round
  2). They "stress" the player and a demo cannot be paused. A demo stays on
  the step chosen, plays once, and replays when that step is tapped.
  **(conflict)** Rondo (10s loop), Pitch pin (8s loop), Spoofed (7s) and
  Season line (live loop) all ship looping demos Jonno has not ruled on.
- **The reveal shows the truth visually.** Turn the card over to the real
  one and keep the fake in sight on a tab; peel a fake off its corner to the
  real club underneath; do not write "it was X".
- **End screen: "you got this, then you see the others".** Your result large
  and alone first, then the rest fades in. One end-screen card per game, one
  red button, Share beside it. The share card is spoiler-free: a grid of
  marks and a pre-written line, no names.
- Ranks and grades: one site-wide scale of five words (Basic, Decent, Solid,
  Sharp, Elite), one to two words each, shown as "Ball knowledge: Sharp" with
  no number. The art per rank carries the flavour. No pack-and-peel (you
  already know how you did).
- **A grades key is reachable from anywhere** in any game that grades.
- Good ideas from one game are carried to the others. Ask whether each new
  idea belongs on the shared kit before building it locally.

## 1.10 UI checklist (before showing Jonno a screen)

1. Fits one laptop screen at 1366x768, no scroll, in every phase; numbers.
2. Real crests and flags; no drawn ones; nothing that gives the answer away.
3. One red button; other actions plain; back chevron present.
4. Marks have a symbol as well as a colour.
5. Text cut to the bone; titles one or two words; help text on a card.
6. No autoplay or looping motion; demo uses real examples.
7. Every screen change glides, staged, nothing at once; reduced motion shows
   the end state; no stamp, shake or slam.
8. Phone width checked with the mobile preset (and one wide width).
9. Front page has all four states; the hub tile has a miniature that passes
   section 1.6.
10. Link to play it (localhost or live) given unasked.

---

# Part 2. Game mechanics

## 2.1 Choosing and shaping a game

- **Recipe: dataset + verb + quality filter.** The scarce parts are the verb
  and the filter that rejects bad boards automatically. Verbs we already
  own: recall a set and chain (Chain, Rondo), spot the liar (Spoofed, Odd Man
  Out), place (Pitch pin), order (Sorted), identify a shape (Season line),
  estimate/graded depth (Steps). `docs/game-design-playbook.md` has the table
  and the idea bank.
- **A new verb on the same content still feels the same** (Flight path
  binned: "a career path", too close to Spoofed). **Swapping the data under a
  known game's rules is a clone** (Over binned: Football 501 with a different
  stat). Borrow patterns, not whole games. Check every idea against the
  shelf for overlap.
- **Borrowed identity gives you onboarding for free** (darts, 501, baseball,
  Fibbage). A familiar frame also supplies the brag vocabulary and the share
  line.
- **Think like a fan, not a data sorter.** Enjoyment is its own axis,
  separate from difficulty. The best moment is a real stop that shocks
  ("Brentford got me") beside a believable fake. Infer the why behind a
  verdict (fame, era, unreadable clubs, a good bluff) and offer fan ideas.
- **Test a mechanic by playing it, then tune named constants.** Every
  tunable number is a named constant and appears in the HANDOFF (`LIVES`,
  `MAX_LOSSES_PER_ROUND`, `HELP_COUNT`, `RULES`, `STEPS`), so a playtest
  changes one number, not the design.

## 2.2 The core loop

- **One rule, one question, one answer.** Chain's daily is "can you find a
  solution", with held-or-not as the only rule.
- **Every turn is a decision.** Rondo's pass is also an attack; Slugger's
  pitch is a gamble weighed against the bases. A choice with no cost is not a
  choice.
- **Decisions need visible stakes.** Slugger's first draft graded hits
  invisibly (the batter could not aim for a double) and the big club was never
  worth throwing. Tell the player what each option is worth before they
  commit.
- **Retries remove the bet.** One shot per step in Steps: with a retry the
  safe play is "try deep, fall back on the obvious", so depth costs nothing.
- **Hints must cost something.** Free hints kill the game. Default to fewer.
  Draw hints once per round and key them to a group (all defenders share the
  same two), so tapping around leaks nothing more. Test generosity by
  playing: three per position was "too generous", a keeper with several was
  "overkill easy".
- **Length.** A solo daily is about five minutes (five to seven rounds). A
  pub game is ten to fifteen minutes with a rematch one tap away. A move
  that needs four taps a swing (Slugger's first draft) is twenty minutes.
  Auto-advance a result rather than asking for a Next tap where nothing needs
  deciding.
- **Time.** Solo is untimed: football recall is a long-term memory search and
  a timer measures speed, not depth. Head-to-head is timed: there it is the
  tension (Rondo's 30s shot clock).
- **One phone, many players:** the phone is the referee, not the game. Cover
  screen, pass the phone, roles rotate past anyone out, rematch, no rooms
  (parked: real-time needs infrastructure and a cost check first).

## 2.3 Scoring and grading

- **No obscurity score on a daily.** A correct chain scored 21/21 "least
  obscure" felt like a loss; the tier version (Banker, Good shout, Deep cut)
  was rejected too. Obscurity lives only where digging is the point (Deep
  Cuts, Steps) and the reward is a graded card, never a number.
- **Never show "Nth of M".** It feels unrewarding. Show the grade word only.
- **Grade the fact, not the player.** `fame(X) x weight(X's spell at C)`:
  Kane at Leicester is deep, Kane at Spurs is not (spell-weighted obscurity,
  still current in Steps). Both ends of a link count.
- **One scale site-wide.** Five grades (Basic, Decent, Solid, Sharp, Elite);
  two scales on the same ruler confuse. Cards keep the best grade per
  player; only the first seal of a board collects.
- **A scale beats par.** Pitch pin dropped par: "17 under par" asked the
  player to decode it and said nothing about how good it was. Five tiers on
  0 to 100, same scale for every pack, with "N off <next tier>".
- **Benchmark the scale by simulation.** Pitch pin ran 31 packs x 200
  simulated runs for random, lazy, casual, decent, good and expert play to
  set the tiers. The pack score rounds **down** so a lazy strategy never
  reaches the next tier. Every game needs a "what does the laziest play score"
  number, and a fairness test that rejects boards the lazy play does well on.
- **Flat points over ramp-weighted** (Spoofed: 2, 1, 0 per career gives 0 to
  10); a pack or run grade is the floor of the average, so a top run is a
  feat and a top card the trophy.
- **A near-miss should still score.** Sorted scores pairs in the right order
  per category, not exact positions.
- **A bullseye is a data-limited size.** Pitch pin's is 2m because the
  sources disagree by up to 3m. Never reward noise.
- **Share line:** pre-written, spoiler-free (no names, no positions), one
  glyph per step, plus the real day number.
- **Compare against a fixed scale and the player's own record** until there is
  a server store ("vs everyone" is a later spec, shown only once a pack has
  enough plays).

## 2.4 Difficulty and fairness

- **A hard board must still be gettable.** Hard means a few famous ways in,
  not none. Werder Bremen (entry fame 45) was "no one's getting any of
  those"; Schalke (60) replaced it. Grade a board by ENTRY: the fame of the
  less famous of the best pair.
- **Fun is not difficulty.** Ease 9 to 10 scored fun 2 to 3; ease 3 to 5
  scored fun 6 to 7. Flavour (journeyman, loan army, cult hero, club theme) is
  a separate axis. A day is a difficulty ramp plus a mix of flavours.
- **Fame for a British audience is English Wikipedia views, not Wikidata
  sitelinks.** Sitelinks let in Doyle, Mucha and Adam ("who even is he?").
  A club is "known" by country plus views (Spoofed's rule), not by views
  alone (Pachuca and Vissel Kobe look like Blackpool). Steps still grades on
  sitelinks: open.
- **Era matters.** No old careers for recall games (first stop 2000 or
  later, still playing 2015 or later): "history, not memory". The pool starts
  at careers from 1992, which also limits any lineup game to 1995 on.
- **Fakes must be believable and not a tell.** Fit the era (at least four
  pool players started there within two years), fit the path (real moves
  between the neighbours), never a giant, never bigger than the career's
  median club, never between two marquee moves, never a spell fans
  remember, never the spell the photo was taken in.
- **A fixed rule is a tell.** Mix swap and insert unannounced; short careers
  get an insert 60% of the time, never always. Use a different kind of fake
  each round. "Predictable if you spam it."
- **Show what a fan expects to see:** loan returns and loan parents (a career
  that hides a Chelsea return is wrong), the display name from the
  Wikipedia title (Marc Guiu, not "Marc Guiu Paz").
- **Steps apart:** answers shown in one step must not answer another step the
  same day; the reveal of one round must not hand over the next (Sorted:
  consecutive lines differ by 3 to 7 pairs of the ten).
- **Look for deducible structure.** Up/down arrows on 26 seasons allow a
  binary search in about five guesses (Season line, open). A hint that
  narrows by halves is a rule to design out, not tune.
- **Famous matters for a fake.** A planted fake must come from the pool of
  the right era; a 1988 final has no pool player to plant (Odd Man Out).
- **Lives and rounds:** three lives each, two wrong taps a round, several
  rounds, roles alternating. Provisional until Jonno has tuned it.

## 2.5 Content and data

- **Gate 1 of every game is a data check, with real data, free.** Prove the
  pool supports the rule before any UI (Odd Man Out measured how many XIs
  had 10 of 11 starters in the pool; Tunnel measured birth dates and
  heights; Season line replayed real tables against known seasons).
- **Free sources first.** Wikidata, Wikipedia infoboxes, football-data.co.uk,
  StatsBomb open data, Understat. Flag any cost before adding it.
- **Licences are a design input.** StatsBomb bars redistribution and
  commercial use and needs its logo; Transfermarkt bans scraping (the CC0
  dataset is a scrape, so it is unusable); TheSportsDB cutouts are
  development-only; Wikipedia crests are non-free (risk accepted, not
  cleared). Record the decision and the credit.
- **Never let the answer reach the browser.** The server judges; a client
  gets givens only. `loadBoard` strips the reference solution; the seal and
  pick routes judge. Run `scripts/leak-check.ts` on static pages. A
  deepest-answer reveal waits for the end of the run.
- **Data traps that produce silently wrong data** (tested in
  `tests/pipeline/traps.test.ts`): the `mul` label fallback, `wdt:` truthy
  truncation (use `p:`/`ps:`), national teams in `P54`. Never exclude
  occupation `actor` (it removes Beckham). After any pool rebuild run
  `review:names` and `review:labels` (vandalised labels).
- **Wikidata is incomplete for about a third of careers.** Fill from
  infoboxes; keep both sources in a union. Names with no alias are
  unsearchable by common name (the biggest known gap).
- **Coverage is a test, not a hope.** Every team in the data has a crest or a
  flag file; every goal obeys the rules; every board passes `problems()`.
- **Hand lists need a guard.** Club colours (about 100) and the Slugger deck
  are hand-made and held to the pool by tests.
- **Parse by header, not position,** and keep the old raw file next to the new.

## 2.6 Dailies, schedules and automation

- **No recurring manual upkeep.** Jonno will not type nominations or run a
  weekly script by hand. Content that must refresh needs an automated
  source and a scheduler. If no automatable source exists, say so and
  propose one that is.
- **A committed schedule topped up by a cron**, not a pure function of the
  date: past days freeze when rules change; reuse needs history; upcoming
  days can be read; a broken cron leaves 14+ days in hand. Generate to 28
  ahead when fewer than 14 remain; seed each day from its date; read only
  committed files; the cron runs the tests before it commits.
- **Day 1 is 2026-09-19 for every daily** (`EPOCH`), so archives start full
  and numbers match across games. Never change it once anyone has played:
  it renumbers everyone's history. (Season line's `EPOCH` is a draft date to
  reset at launch.)
- One play a day. An archive day plays once, and shares like the daily. The
  schedule is server-only: it holds the answers.
- **Workflows only fire from `main`.** A cron written on a branch does
  nothing until merge.
- **Vercel traces only what it can see.** A file read with `readFile` at
  runtime must be in `outputFileTracingIncludes`, with a test, or production
  500s while `next start` works. After any push that adds one, hit the
  deployed API.
- Careers and views are snapshots. Refresh them in the cron before the
  January window goes stale (before February 2027).
- A day's values are frozen in the schedule so a data refresh never changes
  a day someone has played.

## 2.7 What each game's first draft got wrong (so the next does not)

| Game | First draft | Fix |
|---|---|---|
| Chain | Obscurity score made a correct chain feel like a loss; home page was text. | Held-or-not only; the daily is a clued completion board; Deep Cuts keeps depth as cards. |
| Slugger | Grade invisible, big club never worth throwing, twenty minutes. | The pitch states its worth; fastball is the safe single; one swing a batter; auto-advance. Still cut from the hub. |
| Spoofed | v4 swapped only, repeated fake kinds, fame by sitelinks, old careers, giant fakes. | Mixed swap and insert, a kind per round, views by country, era rule, guards. |
| Steps | Retry would remove the bet; grade words went British (reverted). | One shot, five grades site-wide, floor of average. |
| Pitch pin | Throw below the fold on a laptop; par decoded badly; a dull library. | Points on a five-tier scale; laptop two-column; a hub with one suggested pack. |
| Odd Man Out | Three suggestions per position; drawn flags; hub of options; autoplay demo; scroll on a laptop. | Fewer hints keyed per group; real flags; only relevant cards; tap to replay; one screen. |
| Season line | Proposal: hide the season arrows until the team is locked; chart axis ran the whole season. | Arrows on every guess from the first; the axis ends at the last game shown; a bonus slot. |
| Sorted | Final category undecided (air miles, market value). | Number of clubs; market value ruled out on licence and upkeep. |

## 2.8 Verification

- Pure helpers get tests (vitest does not render JSX); components get a
  browser check. Typecheck, `npm test` and a prod build are clean before a
  merge to `main` and a push. Stop the dev server before the prod build (they
  share `.next`); use `NEXT_DIST_DIR=.next-prod`, then `git checkout
  tsconfig.json`.
- Passing tests is not correct at a data boundary: check the real source and
  the deployed endpoint.
- Playwright for visuals; the browser pane's screenshots crop and time out.
  Scripted clicks race the view transition: poll with `until()` before the
  next step. Freeze animations with `getAnimations()` and `currentTime`.
- Say plainly what was only measured, not looked at.

---

# Part 3. Process with Jonno

- **Process by judgement.** No Superpowers ritual. Write a spec only when it
  records a decision he must make; build inline otherwise; stop for him
  where his judgement matters (content, design, before merge). No per-task
  subagents.
- **Stage gates for a new game:** (1) data check, (2) a playable draft, (3)
  review of generated days. At each gate update the game's HANDOFF, commit,
  check in, give the URL, suggest `/clear`.
- **Say what is happening when work runs long.** Silence read as stuck.
- **Auto-commit verified work;** merge to `main` and push once typecheck,
  `npm test` and the prod build are clean. Always ask before force-push,
  reset or history rewrite. Never commit work flagged broken or partial.
- **Always give the link to play** after any change, unasked; make sure the
  server is actually running first.
- Design direction is approved before implementation code for anything
  visual; stage reviews stop after each stage.
- Push back when Jonno is wrong and say why; judge reviewer feedback on the
  merits.
- A game branch writes only its own `games/<name>/HANDOFF.md`; the root
  file gets one index line when the game merges.
- Heredocs with apostrophes break the Bash tool: write files with the Write
  tool.

---

# Open: needs Jonno's ruling

1. **Looping demos.** Odd Man Out bans self-playing loops; Rondo, Pitch pin,
   Spoofed and Season line have them. Convert them all to tap-to-play, or
   keep loops on the games he already accepted?
2. **Red inside games.** Spoofed's miss, Pitch pin's Deadly tier and Season
   line's down arrow are red, against "red is the brand and the one action".
   Which colour for a result, and does the tier scale change?
3. **Laptop no-scroll on the older games.** Chain, Rondo, Spoofed and Steps
   have not been audited at 1366x768.
4. **Icons.** Redo Spoofed and Pin under the new pitch-line rule? Mole
   candidate for Odd Man Out: keep the direction?
5. **"Steps" vs "Step"** (hub word against the game's masthead).
6. **Odd Man Out's name and headline** ("Can you find the mole?"): the hub
   tile and masthead are still Odd Man Out.
7. **Untracked `AGENTS.md`** (a differing copy of `CLAUDE.md`) appears in
   every worktree. Keep or delete?

---

# Where this came from, and what is stale

Read for this guide: `CLAUDE.md`, `HANDOFF.md`, `README.md`,
`project-brief.md`, `docs/game-design-playbook.md`, the old
`docs/new-game-build-lessons.md`, every spec and plan under
`docs/superpowers/`, `games/{bluff,itk,pin,rondo,step}`, the two unmerged
drafts `games/tunnel/HANDOFF.md` (branch `claude/brave-heisenberg-ba64b8`) and
`games/season-line/HANDOFF.md` (branch `claude/intelligent-cannon-7f05ea`),
the 13 memory notes and `toolbox.md`.

| Document | Verdict |
|---|---|
| `docs/game-design-playbook.md` | Current. Keep as the idea bank and verdict log. |
| `games/*/HANDOFF.md` (7) | Current, each for its own game. The source of the rules above. |
| `docs/superpowers/specs/2026-09-19-sticker-album-identity-design.md` | Current for tokens, fonts, flow. Its 120/240/420ms motion is superseded by the staged 800ms menu moves (1.7). |
| `...2026-09-11-spell-weighted-obscurity-design.md` | Current (Steps uses it). |
| `...2026-10-10-pitch-pin-hub-design.md` | Current. Wins over the two earlier Pitch pin specs. |
| `...2026-10-08-pitch-pin-design.md`, `...2026-10-09-pitch-pin-library-design.md` | Partly superseded (par and the daily are gone); data, coordinates and licences still hold. |
| `...2026-10-12-itk-daily-design.md` | Folded into `games/itk/HANDOFF.md`; the schedule pattern is the template. |
| `...2026-09-20-slugger-design.md` | Game is off the hub; the first-draft lessons are kept in 2.7. |
| `...2026-09-11-pinboard-design.md` | Stale. The cork-board look was replaced by the sticker album. Only its "one coherent world" lesson survives. |
| `...2026-09-11-lock-in-reveal-design.md` | Stale. Twine, stamps and the Pointless column were replaced by the ink-seam reveal ("stamp is gone, cheap"). |
| `...2026-09-03-recall-xi-design.md`, `docs/superpowers/plans/*` (4), `coverage-findings.md`, `specs/queries/` | Historical: Recall XI is parked and the plans are executed task lists. The data traps they found are kept in the root `HANDOFF.md` and 2.5. |
| `project-brief.md` | Self-declared origin document. Historical. |
| Root `HANDOFF.md` | Current for the site and the games index; much of the Chain half (Slugger, XI, "Next up") is stale. Not edited on a game branch. |
| `README.md` | Public readme; does not list the newer games. |

Nothing was deleted. If Jonno agrees, the stale rows can move to
`docs/archive/` in one commit.
