import { readFile } from 'node:fs/promises';
import { notFound } from 'next/navigation';
import PhotoCheck, { type CheckItem } from '../../components/PhotoCheck';

export const metadata = { title: 'Photo check' };
export const dynamic = 'force-dynamic';

const DIR = '.scratch/photo-all';
const BATCH = 100;
const json = <T,>(file: string, fallback: T): Promise<T> => readFile(`${DIR}/${file}`, 'utf8').then((s) => JSON.parse(s) as T).catch(() => fallback);

/**
 * Dev only: the next batch of 100 cutouts to check, most viewed first, across every player the
 * pipeline has finished (docs/photo-pipeline.md). Only checked photos ship: approving a batch
 * ("Approve the rest") records every card in it that was not marked wrong. Cards already approved or
 * marked wrong in an earlier batch are skipped; players with no cutout are not shown (kit card).
 */
export default async function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const players = await json<{ id: string; name: string; club?: string }[]>('players.json', []);
  const marks = await json<{ wrong: string[]; flagged: string[] }>('marks.json', { wrong: [], flagged: [] });
  const approved = new Set(await json<string[]>('approved.json', []));
  const skip = new Set([...approved, ...marks.wrong, ...marks.flagged]);
  const items: CheckItem[] = [];
  let left = 0;
  let kit = 0;
  for (const [i, p] of players.entries()) {
    if (skip.has(p.id)) continue;
    const st = await json<{ ok: boolean; results?: { file: string; year: number }[] } | null>(`out/${p.id}.json`, null);
    if (!st) continue;
    if (!st.ok) { kit++; continue; }
    left++;
    if (items.length < BATCH) items.push({ id: p.id, name: p.name, rank: i + 1, club: p.club, cutout: true, file: st.results?.[0]?.file.replace(/^File:/, ''), year: st.results?.[0]?.year });
  }
  return <PhotoCheck items={items} stats={{ approved: approved.size, wrong: new Set([...marks.wrong, ...marks.flagged]).size, left, kit }} />;
}
