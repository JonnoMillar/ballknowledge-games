const ENDPOINT = 'https://query.wikidata.org/sparql';

/** Wikidata rejects requests without a User-Agent. Spec 8.3. */
const USER_AGENT = 'RecallXI/0.1 (https://github.com/recall-xi)';

export interface SparqlBinding {
  [key: string]: { value: string; type: string } | undefined;
}

export interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

export async function runQuery(query: string): Promise<SparqlResponse> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    // 502 usually means the query timed out. Unbounded CONTAINS filters over
    // labels are the common cause — always bound by club. Spec 8.3.
    throw new Error(`SPARQL ${res.status}: bound the query more tightly`);
  }
  return (await res.json()) as SparqlResponse;
}
