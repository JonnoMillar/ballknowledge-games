# Daily run: research

Written 2026-11-12 for Jonno's daily-run idea (every daily, shortened, played
in one go, one overall result). This is Part 1: what makes a daily run
rewarding and what brings people back. Part 2, the spec built on it, is
`docs/daily-run.md`.

How to read it: every section answers one of Jonno's questions directly
first, then gives the reasoning. **Evidence** is something a source says,
with a link. **Opinion** is my judgement, marked as such. Where a source
could not be read, it says so.

## What I could and could not read

- **Krillion:** the official FAQ (`krillion.io/faq`) is readable; the game
  itself is a JavaScript app, and `how-to-play` and `about` are 404. Tier
  names, points, 7 prompts and 25 s come from a third-party guide. I did not
  play it to see the end screen: the only browser here is Jonno's own Chrome,
  and a play would have used up his Daily Dive. The end screen in this doc
  (curve, "better than X% of today's players", share line, streak, a fact
  about the rarest answers) is Jonno's description from the brief.
- **NYT:** nytimes.com and help.nytimes.com refuse automated fetches. NYT
  facts here come from coverage of the NYT, app store listings, and
  interviews quoted elsewhere. I found **no NYT streak freeze**: searches in
  standard and extended mode turned up nothing, so this doc does not claim one.
- **Immaculate Grid:** the official site returns 403 to fetches; the scoring
  description comes from a sports writer's column.
- **Duolingo:** three of its own blog posts read in full.
- **Academic papers:** abstracts, publisher records and university summaries;
  full texts were not read unless stated.

## After Jonno's answers (2026-11-12)

Jonno read this and decided differently on three points; the spec follows
him. Recorded here so the research and the decisions stay side by side.
- **An exact score is shown** (Q1 recommended none). His reason: comparison
  with mates needs fine margins, and the top and bottom of one band reading
  the same is unfair. That is a fair point the research underweighted: the
  rivalry row in Q4 needs a number to compare. The spec keeps "never N of M"
  by showing the score as a match rating (to confirm) with no "/100".
- **"Top X%" from day one, on our scale's normal distribution** (Q2
  recommended nothing until real data). The spec words it "on our scale"
  until 100 real plays, so it makes no claim about players that is not true.
- **The run is timed; each game alone is not** (Q3 and the playbook say solo
  untimed). The spec uses the clock as a cap that never scores.

---

## The short answers

1. **Scoring intricacy:** three layers and no more. One headline word, one
   mark per task (the share grid), and detail only on tap. No sub-scores on
   the main screen, no visible arithmetic, never "N of M".
2. **Average or curve:** Jonno's "probably yes" is half right. A comparison
   to today's players is the strongest status signal there is, but as the
   *main* result it hurts the bottom half and lies on thin days. Make a
   fixed grade the result; show the curve as a second layer, only once enough
   people have played, only overall (never per task), drawn from the real
   scores (never a fitted bell curve), with a number only for the top half.
3. **How Krillion makes people feel special:** the answer is theirs (open
   recall), the rarity label names it, the share line carries the label, and
   a percentile confirms what people already believe about themselves. Our
   honest version: every claim on the result is checkable against data, and
   the peak is a real find (a deep pick, a spoof spotted, a bullseye), named.
4. **Emotions:** competence, curiosity, ritual and rivalry with mates are the
   ones to build on. Streak fear works, but only with a safety net; it
   poisons the moment it becomes a debt.
5. **Months, not days:** fresh content tied to the real football calendar, a
   personal record that grows (a scouting career), mates, and restraint: the
   ritual must stay small and the same.

---

## Q1. How intricate should the scoring be?

**Answer: one word, one mark per task, detail behind a tap.** That is the
sweet spot between "one number" and "too many sub-scores".

**Evidence from the reference games**

| Game | What the result shows | Layers |
|---|---|---|
| Wordle | Guesses used, and an emoji grid. The grid came from early players in New Zealand typing coloured squares by hand; Wardle added a Share button because it showed "how you did without ruining the game" ([RNZ](https://www.rnz.co.nz/national/programmes/the-weekend/audio/2018826546/josh-wardle-the-power-of-wordle), [The Spinoff](https://thespinoff.co.nz/business/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault), [BuzzFeed News](https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy)). | 2 |
| Connections | No number at all; the grid of four colours is the result. Purple is the hardest group, the wordplay one ([interview with Wyna Liu, quoted](https://mleddy.blogspot.com/2024/11/an-interview-with-wyna-liu.html)). | 1 |
| Immaculate Grid | Two numbers: cells correct, plus a rarity score that is the sum of each cell's pick percentage, lower is better ([Jesse Spector](https://willetspen.substack.com/p/the-dale-sveum-009-club)). | 2, one of them hard to read |
| Framed | Frames used, as a row of squares ([PC Gamer](https://pcgamer.com/this-wordle-game-for-movie-buffs-challenges-you-to-spot-the-film)). | 2 |
| Krillion | A tier per prompt and a running depth (points × 10 m) (guide, [aiidelist](https://aiidelist.com/blog/krillion-game-guide-how-to-play-rare-answers)); then the curve and percentile (Jonno). | 3 |

**Evidence from our own history** (`docs/new-game-build-lessons.md` 2.3):
Chain's obscurity score made a correct chain feel like a loss; Pitch pin's
par ("17 under par") asked the player to decode it; Spoofed's ramp-weighted
points gave 39 outcomes and were replaced by flat 2/1/0. Each time, the fix
was fewer numbers.

**Opinion: the rule for the run.**
- **Layer 1, the verdict:** one word, large, alone. It is what the player
  remembers and repeats.
- **Layer 2, the marks:** one mark per task, three states, each with a
  symbol as well as a lightness (Jonno is colour-blind). This is the share
  grid and the "report card". It explains the verdict without arithmetic.
- **Layer 3, the detail:** on tap, each task's own result in its own game's
  terms (Spoofed's points, the Steps grades, the pin points).
- **Never on the main screen:** the run's 0 to 100 number, per-task
  numbers, "N of M", or any count of tasks right. The number exists in the
  code (it decides the word); the player sees the word.

Why not one number: with six different games, one number hides which task
went well, and a number invites "out of what?", which is "N of M" again.
Why not more: three layers is what the most-shared games use; Immaculate
Grid's second number is the one people need explained.

---

## Q2. Compare with the day's players, a curve, or neither?

**Answer:** compare, but as a second layer, not the result. The grade is
the result. Jonno's claim holds for the players who do well and fails for
the ones who don't, for thin days, and for skewed days, so it needs guards.

### The three options on their merits

| | Raw score | Grade bands (fixed) | Percentile (vs today) |
|---|---|---|---|
| Works on day one, no server | Yes | Yes (set by simulation, as Pitch pin did) | No: needs a store of every result |
| Fair across easy and hard days | No | No (a hard day gives everyone a low grade) | Yes, self-calibrating |
| Says how good that is | No ("73": of what?) | Yes, in words | Yes, in people |
| Feels for the bottom of the curve | A small number | A named band, about the play | "Better than 8%": about the person, ranked against others |
| Thin traffic | Fine | Fine | Noisy, can be wrong by 10 points |
| Skewed or lumpy scores | Fine | Fine | Ties jump: the many on the top score all read the same |
| Status, brag value | Low | Medium | High |

### How each feels at the bottom

**Evidence.** In a field experiment with Zambian health trainees, telling
people their rank lowered performance, most for low-ability trainees, and the
effect lasted the whole course; awards and recognition raised it
([Ashraf, Bandiera and Lee 2014](https://researchonline.lse.ac.uk/id/eprint/58029),
[J-PAL summary](https://www.povertyactionlab.org/sites/default/files/publications/Awards-unbundle_Science_January2014.pdf)).
A semester-long classroom study with badges and a leaderboard found the
gamified students less motivated and less satisfied over time, and with lower
exam scores ([Hanus and Fox 2015](https://doi.org/10.1016/j.compedu.2014.08.019));
other studies find leaderboards raise performance without hurting
motivation, so the literature is mixed. Self-determination theory's view is
that feedback that informs supports motivation and feedback that ranks or
controls undermines it ([Deci, Koestner and Ryan](https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf)).

**Evidence on the top half.** People rate themselves above average on
almost everything, a large and robust effect across 124 papers
([Zell, Strickhouser, Sedikides and Alicke 2020](https://eprints.soton.ac.uk/435685)).
Part of it is that "average" sounds like "mediocre" to people, a
below-median word ([Kim, Kwon and Chiu 2017](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5479883/)).

**Opinion.** So a percentile does two different things. For the top half it
*confirms* a belief they already hold, which feels like proof and is shared.
For the bottom half it *contradicts* that belief with a public number, which
the evidence says makes people try less, and on a daily game trying less
means not coming back. A grade band says "your report was Decent today"; a
percentile says "92% of people beat you". The first is about the play, the
second about the player.

### Thin curves (low-traffic days)

**Evidence (statistics).** A percentile estimated from *n* players is off by
about √(p(1−p)/n). At the median (p = 0.5), one standard error is:

| Plays that day | ± points (1 SE) | ± points (95%) |
|---|---|---|
| 20 | 11 | 22 |
| 30 | 9 | 18 |
| 100 | 5 | 10 |
| 400 | 2.5 | 5 |
| 1,000 | 1.6 | 3 |

At 20 plays one player is 5 points of percentile by themselves; "better than
60%" could honestly be anywhere from 38 to 82. We have no traffic numbers
(no analytics or result store exists), so I cannot say how many days would
clear 100.

**Opinion.** Do not show a percentile under 100 plays. Below that, fall back
to the last seven days pooled (the run is calibrated so days compare), and
say "this week". Below that too, show nothing: no curve, no number. Never
show a curve made of simulated players: that is inventing people.

### Skewed and non-normal distributions

**Opinion, with the maths.** Nothing about a daily game says scores are
normal. An easy day piles everyone at the top; a hard one piles them at the
bottom; a run of six tasks with partly binary results is lumpy. Two
consequences:
- **Never fit or draw a bell curve.** A normal curve over skewed data shows
  a shape that is not there. Draw the real distribution (a smoothed
  histogram of today's scores) and put the player's mark on it. A
  percentile is distribution-free; the curve does not need to be normal.
- **Ties at the top.** If 30% of players hit the top score, a strict
  "ahead of" percentile tells every one of them "ahead of 70%", which reads
  as a loss for a perfect run. Say "Joint best today" for anyone on the top
  score, and use mid-rank for everyone else. A continuous run score (0 to
  100, not a count) keeps ties rare.

### Per game, or only overall?

**Answer: only overall.** Per-task percentiles split already-thin data six
ways (each task curve is as noisy as a day with a sixth of the traffic), add
six sub-scores (against Q1), and hand the bottom of each task its own bad
news. Per task, the comparison that is worth showing is a *fact*, not a
rank: "12% of today's scouts spotted this spoof first time." That is
curiosity, not judgement, and it can be shown once the store has the data.

### What this means for the run

The result is a fixed grade word, from bands set by simulation (as Pitch pin
set its tiers on 31 packs × 200 simulated runs). Under it, once at least 100
people have played, a smoothed curve of today's real scores with the
player's mark. A number ("Ahead of 74% of today's scouts") only for players
in the top half; below that, the curve and mark without a number, plus the
player's own record ("your best this month"). That is not hiding: the mark is
on the curve for anyone to read. It just does not print a sentence designed
to sting.

---

## Q3. How Krillion makes people feel special, and our honest version

**What Krillion does (evidence where marked, the rest is my reading).**

1. **The answer is authored.** Open recall: any valid answer counts, so the
   answer is the player's own choice, not the one right answer found. Our
   playbook already lists this (open recall makes "the answer personal, which
   makes rarity scoring possible").
2. **Rarity is named, not counted.** Tiers with escalating names; the top
   one is chosen by hand for "fun factor": the answer "most satisfying to
   land on" ([Krillion FAQ](https://krillion.io/faq)). Rarity is mostly
   precomputed from a familiarity database of how often a name appears in
   writing, with an LLM and a manual pass for some prompts, not from other
   players' answers (same FAQ). So the label works from day one.
3. **There is a floor.** A famous answer still scores (the guide gives the
   lowest tier 10 points of 100), so nobody gets nothing.
4. **The label travels.** The game's name *is* its brag ("one in a
   krillion"), and the share line carries it. The playbook calls this
   borrowed identity: "the share message is pre-written".
5. **A percentile confirms the belief.** "Better than X% of today's players"
   lands on people already inclined to think they are above average (Zell et
   al., above).
6. **Pressure flatters.** A 25-second clock (guide) makes a rare answer feel
   like quick wit, a creative act, not a memory.
7. **The end shows the others.** A fact about the rarest answers puts the
   player's answer in context: you see what others did not think of.
8. **It is spoiler-free**, so a brag is also an invitation: mates can play
   the same prompts and try to beat it.

The trick, put plainly: Krillion turns "I remembered an obscure word" into
"I think differently", and gives the player a label and a number to prove it
to others.

**Our identity is different: "real ball knowledge, you think like a scout".**
A scout's skill is checkable: knowing players others do not, reading a
career, spotting what does not fit, judging distance and shape. That is good
news: we do not need flattery, because the claim can be true.

**The honest version (opinion, as design rules):**
- **Every claim on the result is checkable against data.** "Sharp find:
  Bogarde at Chelsea" (from the Steps ruler, English views and the stint),
  "spotted first time", "bullseye, 1.4 m". Later, with real pick data: "4% of
  today's scouts named him". No praise that is not tied to something the
  player did.
- **Rarity is real or it is not shown.** Day one uses our data ruler (Steps
  already grades on English views); later, real pick rates. Never a made-up
  percentage, never simulated players on a curve.
- **The bands are calibrated, not tuned to flatter.** Set by simulated play
  (lazy, casual, decent, expert), with the laziest play under the second
  band, as Pitch pin does. A grade that everyone gets means nothing to share.
- **Failure is shown plainly.** A missed task is a missed mark, with the
  truth revealed (the real club under the fake, the real season). Honesty
  about misses is what makes the good marks worth something.
- **The peak is the player's own find, named.** The single best moment of
  their run, said in one line with its fact. That is "you think like a scout"
  shown, not told.
- **No timers** (playbook: solo recall is a long-term memory search; a timer
  measures speed, not depth). We give up Krillion's "quick wit" feeling on
  purpose; our feeling is "I know my football".

---

## Q4. Which emotions bring people back, and which mechanics serve or poison them

**Evidence for the frame.** Self-determination theory: in four studies,
autonomy, competence and relatedness each independently predicted enjoyment
of games and the wish to play again
([Ryan, Rigby and Przybylski 2006](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/),
[Rochester summary](https://sciencedaily.com/releases/2006/12/061226134706.htm)).
Most of the list below maps onto those three needs.

| Yearning | Serves it | Poisons it |
|---|---|---|
| **Competence** (I can do this) | Clear, immediate feedback per task; a floor everyone reaches; partial credit for near misses (Tunnel scores pairs, Pitch pin scores distance). | Unfair boards (Werder Bremen, entry fame 45); timers in solo play; "N of M"; an obscurity score that punishes a right answer. |
| **Mastery** (I am getting better) | A personal record: best grade, grades over time, the archive to practise; a difficulty ramp inside the run. | Scores dominated by luck; no history; a scale that moves every week. |
| **Identity** (I am a scout) | One vocabulary (task names, verdict word), the "find" named on the result, a scouting record that grows. | Joke titles (they grate on repeat, lessons 1.4); grades everyone gets; a label that brands the bottom ("Mascot" on a share card). |
| **Status** (others see it) | The share line; "Ahead of X%" for the top half; "Joint best today". | Public leaderboards that show the bottom; curves inflated by cheats or by simulated players; pay-to-win. |
| **Curiosity** (what was the answer?) | The reveal shows the truth in place (the peel, the line completing, the obvious and deepest answer); rarity facts after the run. | Answers held back behind a share or a login; spoilers in the share line. |
| **Completion** (I finished it) | The dossier's checklist filling in; one result that closes the day. | "Collect them all" grinds; gated content; a run so long it is abandoned half way. |
| **Ritual** (my morning thing) | Same length and the same order every day; a fixed reset; a countdown. | Days of random length; push notifications nagging; changing the format. NYT's head of games has said the most common Wordle request is not to change it (reported by [PC Gamer](https://pcgamer.com/games/puzzle/one-of-wordles-most-requested-features-has-nothing-to-do-with-words); I could read only the headline). |
| **Rivalry with mates** | A spoiler-free share line on the same puzzle; later, a private mini-league or a "beat my run" link. | Global leaderboards for a 16-26 audience (cheats rise to the top); shaming the loser. |
| **Anticipation** (what is tomorrow?) | The countdown; tomorrow's dossier teased (date, maybe a theme). | Fake scarcity; "only today" content that vanishes for good (the archive keeps every day). |
| **Fear of losing a streak** | A streak works: Duolingo learners who reach a 7-day streak are 3.6 times more likely to finish their course, by its own (correlational) figures; letting one lesson extend the streak lifted Day-14 retention 3.3% ([Duolingo, 2022](https://blog.duolingo.com/how-duolingo-streak-builds-habit/), [Duolingo, 2020](https://blog.duolingo.com/improving-the-streak/)). | A broken streak can "feel quite demotivating", and fear of losing one can stop people starting one, so Duolingo added freezes (up to two), which raised daily active learners 0.38% without encouraging more days off (same 2022 post). Habit research: missing one day did not materially affect habit forming; very inconsistent people did not form habits ([Lally et al. 2010](https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit)). Paid repairs and guilt messages turn the streak into a debt. |

**Variable rewards and the ethics line.** Unpredictable rewards are
powerful: the variable-ratio schedule is the one gambling uses. Spending on
loot boxes is linked to problem gambling, though the direction of cause is
not known ([Zendle and Cairns 2018](https://eprints.whiterose.ac.uk/139116),
[University of York](https://york.ac.uk/news-and-events/news/2018/research/researchers-find-link-problem-gambling-loot-boxes)).

**Opinion, the line we draw:** uncertainty about *how well I did* is the
game, and is fine. Uncertainty *cut loose from skill* (random drops, random
card contents, a mystery bonus) is a slot machine, and is out, with or
without money. Steps' case slam is on the right side: the grade is decided
by the pick, and the animation only reveals it.

**The peak-end rule.** People judge an experience mostly by its most intense
moment and how it ends, not by its average or length: in the original study
most people chose to repeat a *longer* painful trial because it ended less
badly ([Kahneman, Fredrickson, Schreiber and Redelmeier 1993](https://ius.uzh.ch/dam/jcr:5ae9adc9-61ec-4174-b37c-4b752f36c23b/Kahnemann%20et%20al.%20-%20When%20More%20Pain%20is%20Preferred%20to%20Less%20(1993).pdf)).

**Opinion, for the run:** design the peak and the end on purpose, and make
sure the end is never the worst moment. The end screen should finish on the
player's best moment of the day (their find), not on their grade or their
worst task. And a run of six tasks will be remembered by one moment, so one
moment must be designed to be memorable.

---

## Q5. What keeps people coming for months?

**Opinion, backed where marked.** Days are won by ritual and a good
puzzle. Months need four more things.

1. **Content that keeps being fresh.** Each task needs a fresh constraint
   daily (playbook: a round without one feels like a repeat). Tie content to
   the football calendar the audience lives in: the transfer window (Spoofed's
   careers refresh), the current season (Pitch pin's weekly goals, Season
   line's finished seasons), tournaments. Every source must refresh by
   itself: no manual upkeep (Jonno's standing rule).
2. **A record that grows: a scouting career.** Grades over time, best
   verdict, finds collected (Steps already fills a card collection), the
   longest streak kept. This is mastery made visible, and it is the
   player's, kept locally (no account needed; login is optional later per
   `docs/roadmap.md`).
3. **Mates.** Relatedness is one of the three needs that predict coming back
   (Ryan et al. 2006). Wordle's growth came through a group chat sharing a
   grid (BuzzFeed News, above). The share line is the first version; a
   private mini-league (same seed, a link) is the second.
4. **Restraint.** The run must stay the same size and shape. A ritual that
   grows each month becomes a chore; the most common request NYT hears about
   Wordle is "don't change it" (PC Gamer, above).

What loses people over months: novelty wearing off with nothing to aim for,
a streak lost with nothing kept (so show best streak beside current), and a
format that creeps longer.

---

## Dark patterns we refuse, and why

Frame: Zagal, Björk and Lewis's "dark game design patterns" (temporal,
monetary and social patterns that work against the player's interest)
([2013](https://research.chalmers.se/en/publication/177148)). The concept is
contested as an ethics method
([Deterding, Stenros and Montola 2020](https://eprints.whiterose.ac.uk/156460/1/DiGRA_2020_paper_189.pdf)),
so below each one is refused for a stated reason, not because a list says so.

| We refuse | Why |
|---|---|
| **Paid or currency streak repair** (Duolingo sells freezes for gems) | Turns a habit into a debt to pay off, and costs money. Our grace day is earned by playing, never bought. |
| **Guilt notifications** ("quitter"-style nudges) | Shame is the opposite of the competence we want; the audience is young. We send no notifications at all for now. |
| **Fake or padded comparisons** (simulated players on a curve, a percentile on 12 plays, a curve fitted to look normal) | It is lying about other people. Thin days show no curve. |
| **Ranking the bottom in public** (leaderboards with every rank, "better than 3%" printed) | Evidence says rank information lowers effort for low performers; it also brands mates on a share card. |
| **Random rewards cut loose from skill** (loot drops, mystery packs, random bonus multipliers) | The gambling schedule. Our rewards are decided by the play. |
| **Content that vanishes for good** ("only today" or you miss it) | Fear of missing out is pressure, not fun. Every day stays in the archive (it just does not count for the streak or the curve). |
| **Confirmshaming the exit** ("Are you sure you want to give up?") | Nobody is trapped (lessons 1.3). Leaving mid-run saves progress silently. |
| **Login walls** to see your result or keep your streak | Friction and data collection for no player benefit. |
| **The answer behind a share** ("share to see the solution") | Curiosity used as a lever; the truth is always shown. |
| **Infinite autoplay** (the next run starting by itself) | One run a day is the ritual; the archive is there if they want more. |
| **Timers in solo tasks** | Not a dark pattern in itself, but pressure that measures speed, not knowledge; playbook rule. |

---

## Evidence vs opinion, in one place

**Evidence (cited above):** the share grid came from players and is
spoiler-free by design; Connections and Wordle get by on one or two layers;
Immaculate Grid's rarity is a sum of pick percentages; Krillion's rarity is
mostly precomputed and its top tier hand-picked for fun; rank feedback lowered
effort for low performers in a field experiment; people believe they are
above average; percentile error at small *n* (arithmetic); Duolingo's streak,
freeze and milestone effects (its own figures, partly correlational); one
missed day does not break habit forming; the peak-end rule; the three
self-determination needs predict replay; loot box spending is linked to
problem gambling.

**Opinion (mine):** the three-layer result; grade first and percentile
second; the top-half-only number; 100 plays as the threshold and the 7-day
fallback; per-task facts not per-task ranks; the honest version of
Krillion's trick; the line on variable rewards; ending on the find; the
months list; the refusals' reasons.

**Not verified:** Krillion's end screen and share line (Jonno's description);
anything said on nytimes.com; Immaculate Grid's empty-cell value; our own
traffic.
