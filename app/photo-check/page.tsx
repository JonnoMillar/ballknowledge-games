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
function nextBatch(focus: boolean): { items: CheckItem[]; stats: CheckStats } {
  const all = json<{ id: string; name: string; club?: string }[]>('players.json', []);
  // ?focus=1: only the players in upcoming games (focus.json, soonest first), all in one page.
  const want = focus ? json<string[]>('focus.json', []) : null;
  const byId = new Map(all.map((p) => [p.id, p]));
  const players = want ? want.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) : all;
  const marks = json<{ wrong: string[]; flagged: string[] }>('marks.json', { wrong: [], flagged: [] });
  const approved = new Set(json<string[]>('approved.json', []));
  const bad = new Set([...marks.wrong, ...marks.flagged]);
  const skip = new Set([...approved, ...bad]);
  const items: CheckItem[] = [];
  let left = 0;
  let kit = 0;
  players.forEach((p, i) => {
    if (skip.has(p.id)) return;
    const st = json<{ ok: boolean; results?: { file: string; year: number }[] } | null>(`out/${p.id}.json`, null);
    if (!st) return;
    if (!st.ok) { kit++; return; }
    left++;
    if (focus || items.length < BATCH) items.push({ id: p.id, name: p.name, rank: (want ? all.indexOf(p) : i) + 1, club: p.club, cutout: true, file: st.results?.[0]?.file.replace(/^File:/, ''), year: st.results?.[0]?.year });
  });
  return { items, stats: { approved: approved.size, wrong: bad.size, left, kit } };
}

/**
 * Dev only: the next batch of 100 cutouts to check, most viewed first, across every player the
 * pipeline has finished (docs/photo-pipeline.md). Only checked photos ship: approving a batch
 * ("Approve the rest") records every card in it that was not marked wrong. Cards already approved or
 * marked wrong in an earlier batch are skipped; players with no cutout are not shown (kit card).
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { items, stats } = nextBatch(!!(await searchParams).focus);
  return <PhotoCheck items={items} stats={stats} />;
}
