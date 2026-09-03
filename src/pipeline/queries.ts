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

  OPTIONAL { ?player wdt:P27 ?nation }
  OPTIONAL { ?player wdt:P413 ?position }

  OPTIONAL { ?player rdfs:label ?en  FILTER(LANG(?en)  = "en")  }
  OPTIONAL { ?player rdfs:label ?mul FILTER(LANG(?mul) = "mul") }
  BIND(COALESCE(?en, ?mul) AS ?name)
  FILTER(BOUND(?name))
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
