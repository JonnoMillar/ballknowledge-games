/**
 * Exclude people whose fame is for something other than football.
 * Spec 8.1 trap 3.
 *
 * Julio Iglesias genuinely holds occupation "association football player" —
 * he kept goal for Castilla — and his 87 sitelinks measure singing fame, not
 * football fame. Remco Evenepoel (cyclist, PSV youth), Patrik Eliáš (ice
 * hockey), Chad Johnson (NFL, a trial at Boca Raton FC) and Juri Knorr
 * (handball) are the same case from other sports.
 *
 * But a bare occupation exclusion also removed footballers who sing:
 * Ronaldinho (musician), Cantona, Dante, Balbo, Polster, Bilić. And Alex
 * Iwobi, whose item carried "musician" from 2025-11-19 until someone removed
 * it on 2026-09-10, six days after the pool was fetched.
 *
 * So one of these occupations only excludes a player with no recorded
 * appearance (P1350) for an association football club (Q476028) that is not
 * a national team. The club type matters: P54 is any sports team, and Shane
 * Williams' 129 appearances are for rugby sides. MEASURED on the live
 * endpoint on 2026-10-19: every singing footballer in the pool has one
 * (Yano 13, the rest 18 or more); Iglesias and the five athletes above have
 * none, and no other player in the pool loses his place.
 *
 * MEASURED: this list must NOT include actor (Q33999). David Beckham holds
 * occupation actor, and excluding it removes him from the pool entirely.
 * Verified against the live endpoint on 2026-09-03.
 *
 * Two routes apply it. clubRosterQuery filters inline. The pool build reads
 * it as a side file (famousElsewhereQuery -> data/raw/_elsewhere.json,
 * applied in build-pool) the way it reads gender, so changing the rule does
 * not mean re-pulling every career, and the cached careers do not drift.
 */
const FAMOUS_ELSEWHERE = `
    ?player wdt:P106 ?other .
    VALUES ?other {
      wd:Q177220    # singer
      wd:Q639669    # musician
      wd:Q36834     # composer
      wd:Q753110    # songwriter
      wd:Q488205    # singer-songwriter
      wd:Q2309784   # sport cyclist
      wd:Q11774891  # ice hockey player
      wd:Q19204627  # American football player
      wd:Q12840545  # handball player
      wd:Q14089670  # rugby union player
      wd:Q14373094  # rugby league player
      wd:Q3665646   # basketball player
      wd:Q10833314  # tennis player
      wd:Q10871364  # baseball player
      wd:Q11303721  # golfer
    }
    FILTER NOT EXISTS {
      ?player p:P54 ?pro .
      ?pro ps:P54 ?proClub ; pq:P1350 ?proApps .
      FILTER(?proApps > 0)
      ?proClub wdt:P31/wdt:P279* wd:Q476028 .
      FILTER NOT EXISTS { ?proClub wdt:P31/wdt:P279* wd:Q6979593 }
    }`;
const FAMOUS_FOR_FOOTBALL = `FILTER NOT EXISTS {${FAMOUS_ELSEWHERE}
  }`;

/** The players in a batch whose fame is for something else. See FAMOUS_ELSEWHERE. */
export function famousElsewhereQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT DISTINCT ?player WHERE {
  VALUES ?player { ${values} }${FAMOUS_ELSEWHERE}
}`.trim();
}

/**
 * Every club spell for every player who ever appeared for `clubQid`.
 *
 * Three non-obvious rules are load-bearing, and breaking any of them produces a
 * plausible-looking file that is silently wrong. See spec 8.1.
 *
 *   1. p:/ps: traversal, never wdt: — wdt: returns best-rank only.
 *   2. COALESCE(en, mul) — names have migrated to the mul language code.
 *   3. Occupation filter — excludes book editions and video-game characters.
 */
export function clubRosterQuery(clubQid: string): string {
  return `
SELECT DISTINCT ?player ?name ?sitelinks ?club ?start ?end ?nation ?position WHERE {
  ?player p:P54 ?anchor .
  ?anchor ps:P54 wd:${clubQid} .
  ?player wdt:P106 wd:Q937857 .
  ?player wikibase:sitelinks ?sitelinks .

  ?player p:P54 ?spell .
  ?spell ps:P54 ?club .
  OPTIONAL { ?spell pq:P580 ?start }
  OPTIONAL { ?spell pq:P582 ?end }

  # P54 includes NATIONAL TEAMS, not just clubs. Left in, every Moroccan
  # international would "share a club" with every other Moroccan, manufacturing
  # green links out of pure nationality and double-counting the nation
  # dimension of the link table.
  #
  # MEASURED: a positive filter on Q476028 (association football club) does NOT
  # work — Wikidata classifies the Morocco senior team as one. Excluding
  # Q6979593 (national association football team) is what actually discriminates.
  # Verified against the live endpoint on 2026-09-03.
  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q6979593 }

  OPTIONAL { ?player wdt:P27 ?nation }
  OPTIONAL { ?player wdt:P413 ?position }

  OPTIONAL { ?player rdfs:label ?en  FILTER(LANG(?en)  = "en")  }
  OPTIONAL { ?player rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)
  FILTER(BOUND(?name))

  # Exclude people famous for something other than football.
  # Spec 8.1 trap 3. See FAMOUS_FOR_FOOTBALL.
  ${FAMOUS_FOR_FOOTBALL}
}`.trim();
}

/** Club to league, needed for the league dimension of the link table. */
export function clubLeagueQuery(clubQids: readonly string[]): string {
  const values = clubQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?club ?league WHERE {
  VALUES ?club { ${values} }
  OPTIONAL { ?club wdt:P118 ?league }
}`.trim();
}

/**
 * Phase 1 of the pool build: just the eligible player ids and their fame.
 *
 * Deliberately does NOT expand careers. Sitelink-banding the full career query
 * times out (504 at 65s even for a single 5-wide band) because the club-type
 * property path has to run over every spell of every candidate. Fetching the
 * id list first, then careers in fixed batches keyed by id, keeps every request
 * small and bounded.
 */
export function eligiblePlayersQuery(minSitelinks: number, eraFrom: number): string {
  return `
SELECT DISTINCT ?player ?sitelinks WHERE {
  ?player wdt:P106 wd:Q937857 ;
          wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= ${minSitelinks})
  ?player p:P54 ?spell .
  ?spell pq:P580 ?start .
  FILTER(YEAR(?start) >= ${eraFrom})
}`.trim();
}

/**
 * Phase 1b: footballers above the fame floor with no dated club spell at all.
 *
 * Phase 1 finds players through a dated P54 spell, so a player whose
 * Wikidata item has no clubs, or clubs with no dates, is never seen.
 * Tyrique George (Chelsea, 25 sitelinks) has no P54 statement. MEASURED on
 * 2026-10-19: 1,431 footballers at 20+ sitelinks with an English article and
 * no dated spell. Their era is then read from the enwiki infobox
 * (data/careers.json); the ones whose careers end before the era drop out in
 * applyPoolFilters. Runs ~50s on the public endpoint.
 */
export function undatedPlayersQuery(minSitelinks: number): string {
  return `
SELECT DISTINCT ?player WHERE {
  ?player wdt:P106 wd:Q937857 ;
          wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= ${minSitelinks})
  ?article schema:about ?player ;
           schema:isPartOf <https://en.wikipedia.org/> .
  FILTER NOT EXISTS { ?player p:P54 ?spell . ?spell pq:P580 ?start }
}`.trim();
}

/** Phase 2: full careers for a fixed batch of player ids. */
export function careersQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT DISTINCT ?player ?name ?sitelinks ?club ?start ?end ?nation ?position WHERE {
  VALUES ?player { ${values} }
  ?player wikibase:sitelinks ?sitelinks .

  # OPTIONAL: a player Wikidata records no club for (Tyrique George has no
  # P54 at all) still comes back with a name, nation and position, and gets
  # his clubs from the enwiki infobox. See undatedPlayersQuery.
  OPTIONAL {
    ?player p:P54 ?spell .
    ?spell ps:P54 ?club .
    OPTIONAL { ?spell pq:P580 ?start }
    OPTIONAL { ?spell pq:P582 ?end }
    FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q6979593 }
  }

  OPTIONAL { ?player wdt:P27 ?nation }
  OPTIONAL { ?player wdt:P413 ?position }

  OPTIONAL { ?player rdfs:label ?en  FILTER(LANG(?en)  = "en")  }
  OPTIONAL { ?player rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)
  FILTER(BOUND(?name))

}`.trim();
}

/**
 * Sex or gender (P21) for a batch of players.
 *
 * Fetched separately rather than joined into careersQuery so that adding it did
 * not require re-pulling every career. The pool contains women's football —
 * Marta, Alex Morgan, Sam Kerr and Ada Hegerberg were all present — and mixing
 * men's and women's players into one XI is not what "Recall XI" means.
 */
export function genderQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?player ?gender WHERE {
  VALUES ?player { ${values} }
  OPTIONAL { ?player wdt:P21 ?gender }
}`.trim();
}

/**
 * Sporting nationality (P1532, "country for sport") for a batch of players.
 *
 * P27 is legal citizenship; P1532 is who you actually represent, which is what
 * football chemistry means. Two consequences, both measured on 2026-09-04:
 *
 *  - P27 collapses England, Scotland, Wales and Northern Ireland into
 *    "United Kingdom" (Q145) — 788 players in the pool. That makes an English
 *    and a Scottish player register a nation match, which is wrong in football
 *    terms and wrong for the link table. P1532 separates them correctly
 *    (England 245, Scotland 54, Wales 29, N. Ireland 14 in a 400 sample).
 *  - It also fixes the general case: a player born in one country and capped by
 *    another reads as the country they represent.
 *
 * 88% coverage on UK nationals; fall back to P27 where absent.
 */
export function sportNationQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?player ?sport WHERE {
  VALUES ?player { ${values} }
  ?player wdt:P1532 ?sport .
}`.trim();
}

/**
 * National teams a player has actually represented, with the team's country and
 * whether it is a youth side.
 *
 * P1532 alone is not enough. Dual-nationality players carry BOTH countries on
 * it with no ordering, so taking the first value is a coin flip — Achraf Hakimi
 * came out Spanish and Hakim Ziyech Dutch, when both represent Morocco.
 *
 * Senior caps are what decide it. Youth caps do not bind: Ziyech played
 * Netherlands at U19, U20 and U21 before choosing Morocco, and he is far from
 * unusual. So this pulls every national team with its country, and the caller
 * prefers a senior side over a youth one.
 *
 * Note the p:/ps: traversal. `wdt:P54` returns best-rank only and for Hakimi
 * yields nothing but PSG — the national teams disappear entirely.
 */
export function nationalTeamQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?player ?country ?type ?apps ?start WHERE {
  VALUES ?player { ${values} }
  ?player p:P54 ?st . ?st ps:P54 ?team .
  ?team wdt:P31 ?type .
  ?type wdt:P279* wd:Q6979593 .
  OPTIONAL { ?st pq:P1350 ?apps }
  OPTIONAL { ?st pq:P580 ?start }
  # The team's own country-for-sport, NOT P17. England's national team has
  # P17 = United Kingdom and P1532 = England; using P17 re-collapses the home
  # nations into the UK, which is the exact bug P1532 was adopted to fix.
  OPTIONAL { ?team wdt:P1532 ?sportCountry }
  OPTIONAL { ?team wdt:P17 ?legalCountry }
  BIND(COALESCE(?sportCountry, ?legalCountry) AS ?country)
  FILTER(BOUND(?country))
}`.trim();
}

/**
 * Wikimedia Commons image (P18) for a batch of players.
 *
 * Commons files are CC BY / CC BY-SA / public domain, so they are usable with
 * attribution. Measured coverage across the pool: 100% of the top 500 by fame,
 * 84% mid, 35% of deep cuts — so seeded players reliably have a face and the
 * obscure ones often do not.
 */
export function imageQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?player ?img WHERE {
  VALUES ?player { ${values} }
  ?player wdt:P18 ?img .
}`.trim();
}

/**
 * Club name and badge for a batch of club ids.
 *
 * P154 (logo image) is where most clubs keep their crest, but a good number of
 * European clubs record it as P94 (coat of arms) instead — the crest genuinely
 * IS their coat of arms — so both are pulled and the caller prefers P154.
 *
 * Labels take the same COALESCE(en, mul) treatment as players: names have been
 * migrating to the `mul` language code and an `en`-only query silently returns
 * bare QIDs for the ones that have moved.
 */
export function clubQuery(clubQids: readonly string[]): string {
  const values = clubQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?club ?name ?logo ?arms WHERE {
  VALUES ?club { ${values} }
  OPTIONAL { ?club wdt:P154 ?logo }
  OPTIONAL { ?club wdt:P94 ?arms }

  OPTIONAL { ?club rdfs:label ?en  FILTER(LANG(?en)  = "en")  }
  OPTIONAL { ?club rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)
}`.trim();
}

/**
 * Appearances per club spell (P1350, "number of matches played/races/starts")
 * with the spell's dates, for a batch of players.
 *
 * Pulled as a side file rather than folded into careersQuery, so adding it
 * did not mean re-pulling every career. Measured on a random 300 from the
 * pool on 2026-09-11: 80% of club spells carry a count, 87% carry both dates.
 * The dates are the fallback where the count is missing.
 *
 * Same national-team exclusion as careersQuery: caps are not club spells.
 */
export function clubAppsQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT ?player ?club ?apps ?start ?end WHERE {
  VALUES ?player { ${values} }
  ?player p:P54 ?spell . ?spell ps:P54 ?club .
  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q6979593 }
  OPTIONAL { ?spell pq:P1350 ?apps }
  OPTIONAL { ?spell pq:P580 ?start }
  OPTIONAL { ?spell pq:P582 ?end }
}`.trim();
}
