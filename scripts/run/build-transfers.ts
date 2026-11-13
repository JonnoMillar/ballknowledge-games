/**
 * data/transfers.json: every priced permanent move on English Wikipedia's
 * "List of English football transfers" pages from summer 2010 on, matched
 * to the pool by Wikipedia title, with the player's English views. The run's
 * report sets one beside its value (src/lib/transfers.ts dealFor).
 *
 *   npm run transfers
 *
 * Run by .github/workflows/transfers.yml after each window shuts (early
 * February and early September), so it needs no hand upkeep. Wikipedia
 * rate-limits bursts (429): a pause between pages, and retries.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseTransfers, type Deal } from '../../src/lib/transfers';

const OUT = 'data/transfers.json';
const AGENT = 'BallKnowledgeGames/0.1 (transfer fees for a football quiz)';
const PAUSE_MS = 3_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Every window whose page should exist by `now`: summer YYYY once September is here, winter YYYY–YY once February is. */
export function windows(now: Date): string[] {
  const out: string[] = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  for (let year = 2010; year <= y; year++) {
    if (year > 2010 && (year < y || m >= 2)) out.push(`winter ${year - 1}–${String(year).slice(2)}`);
    if (year < y || m >= 9) out.push(`summer ${year}`);
  }
  return out;
}

async function wikitext(page: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': AGENT }, signal: AbortSignal.timeout(60_000) });
    if (res.status === 429 || res.status >= 500) { await sleep(PAUSE_MS * 2 ** (attempt + 1)); continue; }
    const j = (await res.json()) as { parse?: { wikitext: string }; error?: { code: string } };
    if (j.error?.code === 'missingtitle') return null;
    if (!j.parse) throw new Error(`${page}: ${JSON.stringify(j.error)}`);
    return j.parse.wikitext;
  }
  throw new Error(`${page}: still refused after retries`);
}

const norm = (t: string) => t.replace(/_/g, ' ').trim().toLowerCase();
const titles = JSON.parse(readFileSync('data/enwiki-titles.json', 'utf8')) as Record<string, string | null>;
const views = JSON.parse(readFileSync('data/player-views.json', 'utf8')) as Record<string, number>;
const byTitle = new Map(Object.entries(titles).flatMap(([q, t]) => (t ? [[norm(t), q] as const] : [])));

const deals: Deal[] = [];
let rows = 0;
for (const w of windows(new Date())) {
  const page = `List of English football transfers ${w}`;
  const text = await wikitext(page);
  if (text === null) { console.warn(`${page}: no page yet`); continue; }
  const got = parseTransfers(text);
  // A page that loads but yields nothing means the table format changed: fail, so the cron goes red.
  if (got.length === 0) throw new Error(`${page}: no priced moves read`);
  rows += got.length;
  for (const r of got) {
    const qid = byTitle.get(norm(r.title));
    if (qid && views[qid] !== undefined) deals.push({ player: r.player, qid, from: r.from, to: r.to, fee: r.fee, date: r.date, views: views[qid]! });
  }
  console.log(`${w}: ${got.length} priced, ${deals.length} matched so far`);
  await sleep(PAUSE_MS);
}

deals.sort((a, b) => a.date.localeCompare(b.date) || a.player.localeCompare(b.player));
writeFileSync(OUT, `[\n${deals.map((d) => JSON.stringify(d)).join(',\n')}\n]\n`);
console.log(`${rows} priced moves, ${deals.length} matched to the pool, written to ${OUT}`);
