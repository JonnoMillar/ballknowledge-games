# Recall XI — design spec

**Date:** 2026-09-03
**Status:** Approved design, ready for implementation planning
**Supersedes:** `project-brief.md` where they conflict (noted inline)

---

## 1. Concept

A football squad puzzle. The player is shown a formation with two or three
positions already filled. Coloured chemistry links between positions show which
attributes a hidden neighbour must share — club, nation, or league. The player
fills the remaining slots.

Two layers decide the outcome:

- **Chemistry is the gate.** Reach 100 squad chemistry or the board is unsolved.
- **Obscurity is the score.** Many XIs satisfy a board. The less well-known the
  players you used, the better you did.

Filling every slot with Mbappé is a valid solve and a poor one.

## 2. What this game is for

Players play to **prove they know football and show it to other people**. That
framing is load-bearing and it constrains the scoring design directly — see
§6.3. A score is only worth having if the person you show it to can recognise
that it was hard.

## 3. Decisions settled

| # | Decision | Note |
|---|---|---|
| 1 | Constraint puzzle, not squad recall | Any XI satisfying the board is valid |
| 2 | FIFA pre-23 link table | The recognisable part; kept verbatim |
| 3 | Our own chemistry formula, published | FIFA's internals are undocumented and opaque |
| 4 | Progressive web clue regime | Links reveal as neighbours are solved |
| 5 | Career / all-time club history | "Ever played for", no overlap requirement in v1 |
| 6 | Library first, ~25–40 hand-built boards | Daily + generator is v2 |
| 7 | Autocomplete over the full pool | Never over a per-puzzle answer list |
| 8 | Wikidata as the data source | Free; also supplies the fame signal |
| 9 | Fame = Wikidata sitelink count | Verified sane; see §7.2 |
| 10 | Pool has an explicit, declared boundary | Era bound **and** fame floor |
| 11 | Every submission costs, valid or not | Prevents brute-forcing the autocomplete |
| 12 | Links show type, not value | Green means "strong link", not "both at Real Madrid" |
| 13 | No loyalty bonus, no manager bonus | FUT-economy artifacts with no meaning here |
| 14 | Coarse position gate, no graded penalty | Changed from earlier draft; see §5.3 |

### Departures from `project-brief.md`

- **Obscurity scoring is core, not parked.** It is the scoring mechanic.
- **The data file is not small.** Open-ended validation needs a real player
  database (thousands of rows), not 11 players per puzzle.
- **"No backend" has an expiry date.** v1 ships fully static. Pick-rate
  collection (§7.4) is the first thing that requires a server.
- **Position modifier dropped as a graded penalty.** Wikidata position data is
  too coarse to support it.

---

## 4. Core loop

1. Board loads: formation, 11 slots, 2–3 seeded players.
2. Links touching a solved slot are visible and coloured. All others are greyed.
3. Player selects an empty slot and searches the pool by name.
4. On submit, the candidate is validated against every link connecting that slot
   to an **already-solved** neighbour.
   - Valid → placed. Its links to still-empty neighbours light up.
   - Invalid → rejected. The failing link is named; the required value is not.
5. Repeat until 11 slots are filled or submissions run out.

### 4.1 Why no placement can fail for an invisible reason

**A link is inert until one of its two ends is solved.** A placement is therefore
only ever checked against links to solved neighbours, and every such link is
visible by rule 2. This is the property that makes the progressive reveal fair,
and it must be preserved by any future change.

### 4.2 Submissions

- Budget: **15 submissions for an 11-slot board** (initial value, tune against
  real boards).
- **Every submission is consumed, valid or invalid.** Placing is a commitment.
- Un-placing is allowed but does not refund a submission.

This is the anti-brute-force mechanic. Without it, optimal play is to try every
autocomplete entry until the most obscure valid player is found, which makes the
obscurity score meaningless. It is also the intended source of tension: *you know
Benzema works, you think Mariano might, you have four attempts left.*

### 4.3 Failure states

- **Out of submissions with slots unfilled** → board unsolved, partial score
  shown.
- **Stranded** (a slot with no valid answer remaining) → detected and surfaced
  immediately rather than left to burn submissions. The player may un-place to
  recover, at no refund.

---

## 5. Chemistry engine

### 5.1 Link table

Adopted from FIFA pre-23 unchanged. This is the mechanic players recognise.

| Shared between two adjacent players | Link | Points |
|---|---|---|
| Nothing | Red (dead) | 0 |
| Nation only, **or** league only | Orange (weak) | 1 |
| Same club, **or** nation + league | **Green (strong)** | 2 |
| Same club **and** same nation | Light green (hyper) | 2 |

Hyper links render distinctly to preserve the FIFA visual language but score the
same as green. This keeps the arithmetic hand-computable.

Under the v1 career model (§7.1), "same club" means **both players appear in each
other's club set at any point in their careers**. Time overlap is not required.

### 5.2 Player and squad chemistry

```
playerChem = round(10 * linkPointsEarned / (2 * linkCount))    // 0..10
squadChem  = sum(playerChem for all 11)                        // 0..110, uncapped
```

**Range is 0–110 and the gate is 100.** Chemistry is deliberately *not* capped at
the gate value — capping there would make the slack unexpressable and force every
solved board to display an identical number. The 10-point headroom means a board
can be solved with one imperfect link somewhere, which is how FUT actually felt,
and a solve at 108 legibly beats a solve at 100.

**Partial boards.** `linkCount` is the slot's **total** adjacency count in the
formation, fixed regardless of how much of the board is solved. `linkPointsEarned`
counts only links where **both** ends are filled. An unresolved link therefore
scores 0 and drags the number down until it is completed, so chemistry climbs as
the board fills. This matches FUT behaviour and keeps the displayed number
meaningful mid-solve rather than misleadingly high.

**The formula must stay hand-computable.** A deduction puzzle whose scoring the
player cannot reason about is guesswork. Any future change is subject to this
constraint.

### 5.3 Position handling

Slots carry a coarse position class: **GK / DEF / MID / FWD**. A candidate must
match the slot's class. That is a hard gate, not a graded penalty.

**Why the graded penalty was dropped:** Wikidata's `P413` is too coarse to
support it. Mbappé's entire position record is a single value (`Q280658`,
forward). Grading "natural vs related vs unrelated" requires positional detail
Wikidata does not reliably carry. A coarse gate is data-supportable and prevents
absurdities like a goalkeeper at striker; a graded penalty would be invented
precision.

`positions[]` stays in the schema. Reintroducing a graded penalty later needs a
better position source, not a schema change.

---

## 6. Scoring

### 6.1 Two tiers

- **Gate:** `squadChem >= 100`. Below that, the board is unsolved.
- **Score:** total obscurity of the eleven players used.

A huge solution space is a feature, not a defect. It is what makes the obscurity
score meaningful — like Scrabble, where many words are legal and only some are
worth playing.

### 6.2 Obscurity score

For each placed player, score against the **fame distribution of that slot's
valid answer set**, not a global scale. The valid set is enumerated at build time
(§9.2), so this is free.

Scoring locally rather than globally cancels most era bias, because it compares
Real Madrid strikers to Real Madrid strikers. It also means the fame metric only
needs to be **ordinally correct within a comparable group**, which is a far
weaker requirement than global calibration and much more achievable.

Boards ship with medal thresholds calibrated against the enumerated score
distribution, plus a percentile on the result screen.

### 6.3 The floor, and why it exists

**Measured finding (§11.4): pure lowest-fame-wins selects unknowable players.**
With the pool bounded to 1992+, the most obscure valid Real Madrid answers are
academy and reserve players who never made a senior appearance — 0 to 5
sitelinks, names no football fan has encountered.

This directly attacks §2. Bragging requires the audience to recognise the answer.
*"I got Mariano Díaz"* lands. *"I got Ghulam Hazrat Niazi"* lands as nothing —
the person you are showing cannot tell whether it was brilliant recall or a
random click.

**The fix is a pool floor, not a scoring curve.** Exclude the unknowables from
the pool entirely, and "lower fame is better" becomes safe again — no
inverted-U curve, no rule that needs explaining. The pool boundary does the
scoring work.

---

## 7. Data

### 7.1 Era and club model

- **Career / all-time club sets.** A player carries every club they played for.
- **"Ever played for" — no time overlap required in v1.**
- **Spell dates are ingested anyway.** They are extra columns on the same query
  at near-zero marginal cost, and 92% of spells carry them (§11.5). This keeps
  overlap mode a switch to flip rather than a pipeline re-run.

Accepted consequence: Beckham and Ronaldo link green via Real Madrid despite
never being teammates. This will draw complaints. It is a deliberate trade, not
an oversight.

### 7.2 Fame signal

**Primary: Wikidata sitelink count** — the number of language Wikipedias with an
article on that player. It arrives free in the same SPARQL pull, needs no extra
requests, and is stable (it does not spike on transfers).

Verified sane (§11.2). Top of the Real Madrid pool by sitelinks:
Ronaldo 213, Zidane 144, Beckham 138, Mbappé 133, R9 124, Modrić 112,
Benzema 107. That is a football fan's ordering.

**Refinement (later): Wikimedia Pageviews API.** Free, no key. Use a 24-month
**median**, never a mean — it is noisy and spikes on transfers, deaths and
scandals.

**Eventual replacement: our own pick rates.** Every completed board is 11 data
points on which players people actually reach for under constraint. This
converges on the same measure Goalless pays a survey panel for (§10), is
football-fan specific, and is free. Requires a backend (§7.4).

**Hand overrides.** For the 25–40 curated boards, fame values may be manually
corrected. Cheap, and it fixes ranking errors exactly where they are most
visible.

`fame` is one swappable field carrying its `source`. The v1 metric choice is
therefore not load-bearing — which is the correct way to handle a number that
cannot be validated up front.

### 7.3 Pool construction

The pool boundary is **declared in the UI**, not implicit. A rejection must read
as a stated rule, not a bug.

Three filters, in order:

1. **Occupation** is association football player, and the entity is a human.
   Filters out the contamination found in §11.3 — book editions, an EA Sports FC
   24 character item, and Julio Iglesias, who kept goal for Castilla and ranks
   20th by fame.
2. **Era bound: a spell starting 1992 or later.** Removes the pre-war tail that
   would otherwise dominate obscurity scoring (§11.4).
3. **Fame floor: minimum sitelink count.** Initial value **20**, and it is a
   **per-league tunable parameter, not a global constant.**

`P1350` (appearances) is a secondary signal where present, but at 77% coverage it
cannot be the gate — it would wrongly exclude nearly a quarter of legitimate
players.

Because autocomplete only ever offers in-pool players, **false rejection of a
correct answer is structurally impossible.** The failure mode converts from
"you are wrong" to "not in this pool".

### 7.4 Backend boundary

v1 ships fully static: Next.js on Vercel, committed JSON, no server.

The first thing that changes this is **pick-rate collection** — an append-only
endpoint, no accounts, no PII, comfortably within Vercel's free tier. Daily mode
and leaderboards would also require it. Not in v1 scope; called out so it is a
planned step rather than a surprise.

---

## 8. Data pipeline

Offline Node script. Queries Wikidata, writes normalised JSON, commits the
output. Not part of the app bundle. **Never queried at runtime.**

### 8.1 Three traps that produce silently wrong data

All three were hit during verification. **None of them throws an error** — each
produces a plausible-looking file that is wrong.

**Trap 1 — the `mul` label migration.**
Wikidata has moved personal names to the `mul` (multilingual) language code
instead of duplicating them per language. The standard label service with
`wikibase:language "en"` does **not** fall back to `mul` and returns a bare QID.

Measured: **60 of 832 Real Madrid players (7%) disappear**, including David
Beckham, Kylian Mbappé, Sergio Ramos and Luis Aragonés — four of the top twenty
by fame.

Fix: `BIND(COALESCE(?en, ?mul) AS ?name)`, querying both explicitly.

**Trap 2 — `wdt:` truthy truncation.**
`wdt:P54` returns only best-rank statements. A player whose current club is
marked `preferred` loses their entire earlier career.

Measured: Mbappé returns **7 clubs via `p:`/`ps:`, and 1 club via `wdt:`.**

For an "ever played for" game this is fatal. Fix: always traverse
`p:P54 / ps:P54`. Never use `wdt:P54`.

**Trap 3 — non-footballer contamination.**
Entity search for a player name returns book editions, a video-game character
item, and people notable for other things. Fix: filter on human + occupation, and
never resolve players by label matching alone.

### 8.2 Snapshot discipline

Wikidata is community-edited and changes underneath you. A good-faith restructure
or a vandalism edit can silently flip link colours on shipped boards.

- Pin a dated snapshot. Commit it.
- Re-run deliberately, diff the output, review the diff.
- Shipped boards are re-validated against any new snapshot before it is adopted.

### 8.3 Verified query shape

Working, tested against the live endpoint:

```sparql
SELECT DISTINCT ?player ?name ?sitelinks WHERE {
  ?player p:P54 ?st . ?st ps:P54 wd:Q8682 .     # p:/ps: — never wdt:
  ?player wikibase:sitelinks ?sitelinks .
  OPTIONAL { ?player rdfs:label ?en  FILTER(LANG(?en)="en")  }
  OPTIONAL { ?player rdfs:label ?mul FILTER(LANG(?mul)="mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)             # mul fallback — mandatory
  FILTER(BOUND(?name))
}
```

Endpoint requires a `User-Agent` header. Unbounded `CONTAINS` filters over labels
time out with HTTP 502 — always bound the query by club or another indexed term.

---

## 9. Architecture

### 9.1 Modules

| Unit | Purpose | Depends on |
|---|---|---|
| `data/pipeline` | SPARQL → normalised JSON. Offline, committed output. | Wikidata |
| `lib/chemistry` | `linkStrength`, `playerChemistry`, `squadChemistry`. Pure, zero deps. | nothing |
| `lib/puzzle` | Board schema, `isValidPlacement`, solvability, solution enumeration. | `lib/chemistry` |
| `lib/fame` | Fame lookup and slot-relative obscurity scoring. | pool data |
| `lib/search` | Autocomplete index. Diacritic-folded, alias-aware. | pool data |
| `components/Pitch` | SVG formation and link rendering. | `lib/puzzle` |
| `components/SlotInput` | Search and submit UI. | `lib/search` |
| `content/puzzles/*.json` | Hand-authored boards. | — |
| `app/` | Next.js routes: library index, board page. | all |

`lib/chemistry` is the heart and must stay pure and dependency-free. Formations
live in data, not code, so adding one later costs nothing.

### 9.2 Two tools that are not optional

**Authoring page** (dev-only route). Hand-building 30 boards blind is miserable
and error-prone. Pays for itself by the third board.

Critically, it must **print the full derived valid answer set for each slot** for
human review — *"47 valid answers, here they are"* — so a missing player is
caught before the board ships. This is the review step that substitutes for the
hand-enumeration that competing games rely on.

**Solution counter.** For a given board, enumerate valid XIs. This is:

- the difficulty instrument — tens of thousands of solutions means a fame
  lottery, single digits means trial and error;
- the source of the fame distribution used for scoring (§6.2);
- the source of medal thresholds and percentiles;
- **most of the v2 generator, built early.**

### 9.3 Data model

```
player {
  id            // Wikidata QID
  name
  aliases[]     // populated from day one — see below
  nation
  positions[]   // coarse class derived from P413
  clubs: [ { clubId, leagueId, from, to } ]   // dates ingested, unused in v1
  fame:   { value, source }                   // swappable by design
}
club   { id, name, leagueId }
league { id, name, countryId }
```

A build step flattens each player to `clubIds` / `leagueIds` / `nation` sets. The
link function is then pure set intersection — no date logic, trivially fast.

**`aliases[]` is populated in v1 even though it is only used by search.**
Ødegaard, Haaland, Son Heung-min, Rodri / Rodrigo Hernández, Vini Jr. Retrofitting
it later means re-touching every record. Sources: `mul` label, `en` label, and
`P1449` (nickname).

---

## 10. Competitive position

`playfootball.games` runs **Goalless** and **Fan Favourites** on a shared engine.
Both survey 100 football fans and score answers by how many named them — Goalless
rewards rarity (a football *Pointless*), Fan Favourites rewards popularity.

**Obscurity scoring is therefore not the novel part of Recall XI.** There is a
live, well-executed game built on it. Recall XI's differentiation is the layer
above: obscurity scored **inside a chemistry-constrained XI**, where the link web
decides which players are even eligible.

What we take from them is method, not data. Their survey results are their work
product.

What their approach cannot do, and ours can: their answer sets are 6–31 items,
hand-enumerated per question. That does not scale to thousands of players across
hundreds of slot contexts. Ours derives answer sets from the database — which
scales, at the cost of needing the review step in §9.2.

---

## 11. Verification performed

All figures measured against live Wikidata on 2026-09-03, Real Madrid cohort
(`wd:Q8682`).

**11.1 Pool depth — pass.** 832 players with resolvable names and full club
histories. Deep enough.

**11.2 Fame ordering — pass.** Corrected top 10 by sitelinks: Ronaldo 213,
Zidane 144, Beckham 138, Mbappé 133, R9 124, Modrić 112, Benzema 107, Özil 105,
Casillas 100, Kaká 99. Sitelinks are a sound fame proxy.

The brief's example holds: **Mariano Díaz 45, Benzema 107, Mbappé 133.**

**11.3 Pipeline traps — three found.** See §8.1. The `mul` trap alone dropped 7%
of the pool including four of the top twenty.

**11.4 Era bias — confirmed, roughly 3×.** Median sitelinks by debut decade:
1900s–30s ≈ 10, 1970s–80s ≈ 25, 2010s ≈ 28, 2020s ≈ 38. Unbounded, the most
obscure valid answer is always a pre-war player.

Bounding to 1992+ shifts the problem rather than solving it: the tail becomes
academy and reserve players at 0–5 sitelinks who never played a senior game.
This is what motivates the fame floor (§6.3).

Floor modelling on the 1992+ Real Madrid cohort (393 players):

| Floor | Kept | Most obscure retained |
|---|---|---|
| ≥ 0 | 393 | Jose Martinez Lopez (0) — unknowable |
| ≥ 10 | 332 | Sherman Cárdenas (10) — marginal |
| ≥ 20 | 212 | David Cobeño (20) — a real squad player |

**11.5 Qualifier coverage.** `P580` start dates on **92%** of spells — overlap
mode is genuinely viable later. `P1350` appearances on **77%** — usable as a
secondary signal, not as a gate.

**11.6 Scope caveat.** Real Madrid is the best-documented club in the world.
**Every number above is a best case.** Coverage for a mid-table Ligue 1 or
Eredivisie side will be worse, which is precisely why the fame floor is a
per-league parameter.

---

## 12. Testing

- **`lib/chemistry`** — table-driven unit tests over the full link matrix. Pure
  functions, cheap, high value.
- **`lib/puzzle`** — every shipped board must have its reference solution
  validate and a solution count above zero, enforced at build.
- **Pipeline regression tests** — assert against the three traps directly:
  Mbappé resolves to a name, Mbappé has more than one club, Julio Iglesias is not
  in the pool. These are the failures that pass silently otherwise.
- **Real-boundary spot check** — sample N players and diff club, nation and
  league against Wikipedia. Unit tests will happily pass while the data is wrong.
  This is the check that matters most and it cannot be automated away.

---

## 13. Out of scope for v1

Accounts · user-submitted squads · daily mode · procedural generation ·
leaderboards · pageview-based fame · pick-rate collection · overlap-required
links · graded position penalty · manager bonus · loyalty bonus · chemistry
styles · multiple formations (data-driven, but ship one).

---

## 14. Tunable parameters

Stated defaults, expected to move against real boards. Not open questions.

| Parameter | Initial | Tune against |
|---|---|---|
| Submission budget | 15 per 11-slot board | Completion and abandon rates |
| Chemistry gate | 100, on an uncapped 0–110 scale | Solve rates |
| Fame floor | 20 sitelinks, per-league | Whether the obscure tail is recognisable |
| Era bound | 1992+ | Pool size and tail quality |
| Links per slot | 2–4 | Solution counts; the primary difficulty dial |
| Launch board count | 25–40 | Play length |

---

## 15. Known risks and limitations

**Risks**

- **Coverage outside elite clubs is unmeasured.** §11.6. The single largest
  remaining unknown. Measure before authoring boards at scale.
- **"Ever played for" may be too loose.** Boards could be trivially satisfiable
  even at chemistry 100. Ingested spell dates are the escape hatch.
- **Pick-rate metric degrades itself.** Once obscurity is scored by rarity of
  picking, players learn who is worth picking and pick them more. Freeze
  snapshots rather than scoring against a live rolling metric.
- **The v2 generator is harder than it looks.** Solvable, tightly linked, and a
  good obscurity spread is a three-way constraint. Do not budget it as a small
  follow-up.
- **Content burn rate.** 25–40 boards is a few hours of play. There is no
  retention story until the generator lands.

**Limitations, accepted**

- **A static client-side game ships its own answers.** Anyone can read the valid
  answer set from a network request. Unavoidable without a backend.
- **No ground truth for fame exists.** The ordering is validated by eye, forever.
- **One global fame ranking will feel wrong to someone.** A Premier League fan
  and a Serie A fan have different obscurity maps.
- **Some links will read as wrong to knowledgeable players.** Beckham–Ronaldo
  green via Real Madrid is defensible and will still draw complaints.
- **Lower-league and pre-2000s coverage will never be complete.** The pool
  boundary is permanent, not a v1 shortcut.
- **This excludes casual fans.** It is a hardcore football-knowledge game and the
  audience is narrower than the original brief implies.

---

## 16. Build order

Sequenced so the riskiest unknowns are answered before anything expensive is
built.

1. **Pipeline + pool for two or three clubs beyond Real Madrid**, at least one
   outside the top five leagues. Answers §11.6, the largest remaining unknown.
2. **`lib/chemistry` + solution counter.** Pure, testable, no UI.
3. **Three hand-made boards.** Check solution counts and the obscurity spread.
   Play them on paper.
4. **Authoring page**, including the answer-set review output.
5. **Pitch rendering and the play loop.**
6. **Remaining boards, scoring, share.**

Steps 1–3 are the go / no-go. If the obscurity spread outside Real Madrid is thin,
the fame floor and era bound need rethinking before any UI exists.

---

## Appendix: reproducing the verification

Queries in `docs/superpowers/specs/queries/`. All require:

```
-H "User-Agent: RecallXI-research/0.1 (contact)"
-H "Accept: application/sparql-results+json"
```

against `https://query.wikidata.org/sparql`.

Key entity IDs: Real Madrid CF `Q8682` · association football player `Q937857` ·
Kylian Mbappé `Q21621995` · David Beckham `Q10520`.

Properties: `P54` member of sports team · `P580` start time · `P582` end time ·
`P1350` number of matches played · `P413` position · `P27` nationality ·
`P1449` nickname.
