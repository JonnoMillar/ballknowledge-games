const ENDPOINT = 'https://query.wikidata.org/sparql';

/** Wikidata rejects requests without a User-Agent. Spec 8.3. */
const USER_AGENT = 'RecallXI/0.1 (https://github.com/recall-xi)';

export interface SparqlBinding {
  [key: string]: { value: string; type: string } | undefined;
}

export interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

/**
 * POST, not GET. A GET puts the whole query in the URL, and a VALUES clause of
 * a few hundred QIDs overflows the endpoint's header limit with a 431 — which
 * looks nothing like a query problem and wastes time to diagnose.
 */
export async function runQuery(query: string): Promise<SparqlResponse> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ query }).toString(),
  });

  if (!res.ok) {
    // 500/502/504 mean the query timed out server-side. The usual causes are an
    // unbounded label scan or a property path running over too many rows —
    // bound the query or shrink the batch. Spec 8.3.
    const hint = res.status === 431 || res.status === 414
      ? 'request too large — reduce the batch size'
      : 'query too expensive — bound it more tightly or shrink the batch';
    throw new Error(`SPARQL ${res.status}: ${hint}`);
  }
  return (await res.json()) as SparqlResponse;
}
