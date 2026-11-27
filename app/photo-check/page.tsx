import { existsSync, readFileSync } from 'node:fs';
import { notFound } from 'next/navigation';
import PhotoCheck, { type CheckItem, type CheckStats } from '../../components/PhotoCheck';

export const metadata = { title: 'Photo check' };
export const dynamic = 'force-dynamic';

const DIR = '.scratch/photo-all';
const BATCH = 100;
const json = <T,>(file: string, fallback: T): T => (existsSync(`${DIR}/${file}`) ? (JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as T) : fallback);

/**
 * The next batch of cutouts to check, and the counts. Plain synchronous reads inside one function:
 * awaiting thousands of file reads in the component made React's dev stream record every one
 * ("Maximum call stack size exceeded", 100 s a load).
 */
function nextBatch(focus?: string): { items: CheckItem[]; stats: CheckStats; cut: number; screened: number } {
  const screen = json<{ cut: number; items: Record<string, { suspect: number; tags: string[]; why: Record<string, string> }>; blurry?: Record<string, number[]> }>('screen.json', { cut: 0.5, items: {} });
  const all = json<{ id: string; name: string; club?: string }[]>('players.json', []);
  // ?focus=1: only the players in upcoming games (focus.json, soonest first), all in one page. ?focus=<name>: focus-<name>.json
  // (gaps: the best-known players with no checked photo, scripts/photos/ops/gap_batch.py).
  const want = focus ? json<string[]>(focus === '1' ? 'focus.json' : `focus-${focus.replace(/[^a-z0-9-]/gi, '')}.json`, []) : null;
  const byId = new Map(all.map((p) => [p.id, p]));
  const players = want ? want.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) : all;
  const marks = json<{ wrong: string[]; flagged: string[] }>('marks.json', { wrong: [], flagged: [] });
  const approved = new Set(json<string[]>('approved.json', []));
  const bad = new Set([...marks.wrong, ...marks.flagged]);
  // A player he has decided on /photo-pick or /photo-choose (an alternative, or the kit card) needs no check here.
  const decided = Object.keys(json<Record<string, unknown>>('choices.json', {}));
  const skip = new Set([...approved, ...bad, ...decided]);
  const items: CheckItem[] = [];
  let left = 0;
  let kit = 0;
  players.forEach((p, i) => {
    if (skip.has(p.id)) return;
    const st = json<{ ok: boolean; results?: { file: string; year: number; chosen?: boolean }[] } | null>(`out/${p.id}.json`, null);
    if (!st) return;
    if (!st.ok || (screen.blurry?.[p.id]?.includes(0) && !st.results?.[0]?.chosen)) { kit++; return; }   // a blurry upscale is never shown: the pipeline cuts the next one
    left++;
    const sc = screen.items[p.id];   // not screened yet: counts as a suspect, so it is looked at
    if (focus || items.length < BATCH) items.push({ id: p.id, name: p.name, rank: (want ? all.indexOf(p) : i) + 1, club: p.club, cutout: true, file: st.results?.[0]?.file.replace(/^File:/, ''), year: st.results?.[0]?.year, suspect: sc ? sc.suspect : screen.cut, suggest: sc?.tags, why: sc?.why });
  });
  items.sort((a, b) => (b.suspect ?? 0) - (a.suspect ?? 0) || a.rank - b.rank);   // suspects first, likely fine last
  return { items, stats: { approved: approved.size, wrong: bad.size, left, kit }, cut: screen.cut, screened: Object.keys(screen.items).length };
}

/**
 * Dev only: the next batch of 100 cutouts to check, most viewed first, across every player the
 * pipeline has finished (docs/photo-pipeline.md). Only checked photos ship: approving a batch
 * ("Approve the rest") records every card in it that was not marked wrong. Cards already approved or
 * marked wrong in an earlier batch are skipped; players with no cutout are not shown (kit card).
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { items, stats, cut, screened } = nextBatch((await searchParams).focus);
  return <PhotoCheck items={items} stats={stats} cut={cut} screened={screened} />;
}
