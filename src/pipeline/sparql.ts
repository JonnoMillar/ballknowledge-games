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
 * Retries transient failures with backoff.
 *
 * Two kinds are worth retrying and one is not. Dropped connections are routine
 * on a long batch run — a single ECONNRESET two thirds through a 12k-player
 * fetch would otherwise lose the whole run. Server errors (5xx) are usually the
 * public endpoint shedding load and succeed on a second attempt: the same
 * league query that 502s here has run fine minutes earlier.
 *
 * Client errors (4xx) are ours — a batch too large for the URL, a malformed
 * query — and retrying only repeats them.
 */
export async function runQuery(query: string, attempts = 5): Promise<SparqlResponse> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await runQueryOnce(query);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const status = /^SPARQL (\d+)/.exec(msg)?.[1];
      // 429 is the one 4xx that is not ours: the endpoint's per-minute
      // query-time budget is spent, and it says when it refills.
      if (status && Number(status) < 500 && status !== '429') throw e;   // our fault, do not retry
      lastError = e;
      const after = Number(/retry after (\d+)s/.exec(msg)?.[1]);
      await new Promise((r) => setTimeout(r, after > 0 ? (after + 1) * 1000 : 3000 * (i + 1)));
    }
  }
  throw lastError;
}

/**
 * POST, not GET. A GET puts the whole query in the URL, and a VALUES clause of
 * a few hundred QIDs overflows the endpoint's header limit with a 431 — which
 * looks nothing like a query problem and wastes time to diagnose.
 */
async function runQueryOnce(query: string): Promise<SparqlResponse> {
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
      : res.status === 429
        ? `rate limited, retry after ${Number(res.headers.get('retry-after')) || 60}s`
        : 'query too expensive — bound it more tightly or shrink the batch';
    throw new Error(`SPARQL ${res.status}: ${hint}`);
  }
  return (await res.json()) as SparqlResponse;
}
