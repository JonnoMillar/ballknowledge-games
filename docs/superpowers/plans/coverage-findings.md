# Coverage findings — the Task 11 gate

**Date:** 2026-09-03
**Pool:** 700 players from four clubs of deliberately varied profile.
**Verdict: PASS**, with two scale caveats and four bugs found and fixed.

Spec §16 put a gate here because Real Madrid — the club every §11 figure was
measured against — is the best-documented club on earth. This task tested clubs
outside that comfort zone.

## Clubs tested

| Club | QID | Why |
|---|---|---|
| Real Madrid | `Q8682` | The known best case, as a control |
| Southampton | `Q18732` | Mid-table Premier League |
| Crystal Palace | `Q19467` | Mid-table Premier League |
| Feyenoord | `Q134241` | Outside the top five leagues |

## The three gate questions

### 1. Does every club have players in the deep band, or only Real Madrid?

**Every club.** Deep cuts (≤30 sitelinks) per club: Real Madrid 70, Crystal
Palace 69, Feyenoord 67, Southampton 62. The band is if anything *more* populated
outside the elite club.

| Club | n | min | p25 | med | p75 | max | deep ≤30 | famous ≥80 |
|---|---|---|---|---|---|---|---|---|
| Real Madrid | 269 | 20 | 30 | 45 | 61 | 213 | 70 | 26 |
| Southampton | 147 | 20 | 26 | 32 | 43 | 94 | 62 | 2 |
| Feyenoord | 140 | 20 | 24 | 32 | 43 | 97 | 67 | 1 |
| Crystal Palace | 163 | 20 | 25 | 33 | 41 | 72 | 69 | 0 |

### 2. Are the deep cuts recognisable, or academy filler?

**Recognisable — this is the strongest result.** The tails read as exactly the
cult figures the scoring is meant to reward:

- **Southampton:** Andy Townsend, Kerry Dixon, Jimmy Case, Egil Østenstad, Antti
  Niemi, Eyal Berkovic, Bradley Wright-Phillips
- **Crystal Palace:** Clinton Morrison, Paul Dickov, Shaun Derry, Aki Riihilahti,
  Shefki Kuqi, Jobi McAnuff
- **Feyenoord:** Peter van Vossen, George Boateng, Calvin Stengs, Giorgi
  Demetradze, József Kiprich
- **Real Madrid:** David Cobeño, Antonio Núñez, Peter Dubovský, Albano Bizzarri

These are "oh yeah, *him*" names, not the unknowable academy players that spec
§11.4 found at floor 0. **The fame floor of 20 does the job it was designed to
do**, and §6.3 is validated against real data rather than inference.

### 3. Does the fame floor need to differ per league?

**Not at this sample.** A floor of 20 produces a healthy, recognisable tail for
all four clubs, elite and non-elite alike. Mildly surprising — spec §7.3 expected
per-league tuning to be necessary.

Keep it tunable per spec §14, but **20 is a viable global default** and per-league
overrides are not needed yet. Revisit when adding a league with materially
thinner coverage than the Eredivisie.

## Bugs this gate caught

All four were silent. Every one produced a plausible-looking pool.

**1. The position map was largely fiction.** Written from memory, seven of ten
QIDs pointed at unrelated entities — `Q2005335` ("defender") is *Cyphon hofferi*,
a beetle; "attacking midfielder" was a starfish; "striker" was a drug.
**42% of all players were being discarded** for having no recognisable position.
Fixed with endpoint-verified QIDs: unclassified fell to **2.4%**, and the pool
grew from **416 to 700 players (+68%)**.

**2. National teams were being treated as clubs.** `P54` covers national team
membership, so every Moroccan international "shared a club" with every other
Moroccan — manufacturing green links out of pure nationality and double-counting
the nation dimension of the link table. **21% of all rows** were national-team
appearances.

Note for anyone revisiting this: the obvious positive filter does **not** work.
Wikidata classifies the Morocco senior team as an association football club
(`Q476028`). Excluding `Q6979593` (national association football team) is what
actually discriminates.

**3. The contamination test passed for the wrong reason.** Julio Iglesias was
absent from the pool only because he has no spell dates, so the era filter
dropped him. The notability protection did not exist at all, and a modern
non-footballer with dated spells would have passed straight through.

**4. The first notability fix removed David Beckham.** He holds occupation
`actor` on Wikidata. The exclusion list is now narrowed to music occupations,
with a regression test guarding Beckham's presence.

## Live data-quality evidence

`Q3779221` is currently named **"Guido Carrillo EL GOAT"** in Wikidata.

That is live vandalism sitting in the pool right now, and it is concrete proof
that spec §8.2's snapshot-and-review discipline is a real requirement rather than
a theoretical precaution. **Boards must never be built against a live query.**

A name-sanity check belongs in the pipeline before board authoring at scale.

## Real-boundary spot check (spec §12)

Sampled players verified correct against Wikidata: Klaas-Jan Huntelaar
(Ajax/Schalke/Milan/Real Madrid), Achraf Hakimi (Dortmund/Inter/PSG/Real Madrid),
Gabriel Heinze (PSG/Man Utd/Real Madrid). Club histories are accurate.

## Caveats carried forward

**Scale.** 700 players from four clubs is roughly 175 per club — enough to
validate the engine, nowhere near enough for real boards. Reaching the spec's
1,000–5,000 estimate needs roughly 20–30 clubs. The pipeline handles this;
it is a matter of running it.

**Fame range compresses outside elite clubs.** Real Madrid spans 20–213 with a
median of 45; Crystal Palace spans 20–72 with a median of 33. Non-elite clubs have
markedly less dynamic range.

This is *handled by design* rather than being a problem: §6.2 scores obscurity
against the slot's own answer set, so a compressed range normalises automatically.
Worth watching once real boards exist — a board drawn entirely from non-elite
clubs may produce a flatter score spread than one mixing tiers.

## Verdict

**PASS.** Deep cuts exist at every club, they are recognisable names, and the
fame floor of 20 works across tiers without per-league tuning.

Proceed to Task 12 (board authoring). Before authoring at scale, expand the pool
to 20–30 clubs and add a name-sanity check to the pipeline.
