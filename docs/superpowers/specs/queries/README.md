# Verification queries — Recall XI

Run against `https://query.wikidata.org/sparql` with:

    curl -s -G "https://query.wikidata.org/sparql" \
      --data-urlencode query@<file>.rq \
      -H "Accept: application/sparql-results+json" \
      -H "User-Agent: RecallXI-research/0.1 (contact)"

| File | Proves |
|---|---|
| `00-naive-query-BROKEN.rq` | The obvious query. Silently drops 60/832 players including Beckham and Mbappé. Kept as a regression fixture. |
| `01-pool-roster-CORRECT.rq` | Same intent, with `mul` label fallback and `p:`/`ps:` traversal. Returns 832. |
| `02-era-and-date-coverage.rq` | Debut decade vs sitelinks (era bias), and `P580` coverage. |
| `03-qualifier-coverage.rq` | `P1350` appearances 77%, `P580` dates 92%. |
| `04-mul-label-trap-proof.rq` | Beckham/Mbappé/Ramos/Aragonés have no `en` label, only `mul`. |
| `05-wdt-truncation-proof.rq` | Mbappé: 7 clubs via `p:`/`ps:`, 1 via `wdt:`. |

Diffing `00` against `01` is the clearest demonstration of why the pipeline
rules in §8.1 exist. Both should be kept as pipeline regression tests.
