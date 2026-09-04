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

  # Exclude people whose notability is musical rather than footballing.
  # Spec 8.1 trap 3.
  #
  # Julio Iglesias genuinely holds occupation "association football player" —
  # he kept goal for Castilla — so the occupation filter alone does not remove
  # him, and his 87 sitelinks measure singing fame, not football fame.
  #
  # MEASURED: this list must NOT include actor (Q33999). David Beckham holds
  # occupation actor, and excluding it removes him from the pool entirely.
  # Verified against the live endpoint on 2026-09-03. Narrow this list rather
  # than widening it.
  FILTER NOT EXISTS {
    ?player wdt:P106 ?other .
    VALUES ?other {
      wd:Q177220    # singer
      wd:Q639669    # musician
      wd:Q36834     # composer
      wd:Q753110    # songwriter
      wd:Q488205    # singer-songwriter
    }
  }
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

/** Phase 2: full careers for a fixed batch of player ids. */
export function careersQuery(playerQids: readonly string[]): string {
  const values = playerQids.map((q) => `wd:${q}`).join(' ');
  return `
SELECT DISTINCT ?player ?name ?sitelinks ?club ?start ?end ?nation ?position WHERE {
  VALUES ?player { ${values} }
  ?player wikibase:sitelinks ?sitelinks .

  ?player p:P54 ?spell .
  ?spell ps:P54 ?club .
  OPTIONAL { ?spell pq:P580 ?start }
  OPTIONAL { ?spell pq:P582 ?end }

  FILTER NOT EXISTS { ?club wdt:P31/wdt:P279* wd:Q6979593 }

  OPTIONAL { ?player wdt:P27 ?nation }
  OPTIONAL { ?player wdt:P413 ?position }

  OPTIONAL { ?player rdfs:label ?en  FILTER(LANG(?en)  = "en")  }
  OPTIONAL { ?player rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)
  FILTER(BOUND(?name))

  FILTER NOT EXISTS {
    ?player wdt:P106 ?other .
    VALUES ?other { wd:Q177220 wd:Q639669 wd:Q36834 wd:Q753110 wd:Q488205 }
  }
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
