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
