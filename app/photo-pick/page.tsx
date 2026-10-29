import { readFile } from 'node:fs/promises';
import { notFound } from 'next/navigation';
import PhotoPick, { type PickItem } from '../../components/PhotoPick';

export const metadata = { title: 'Photo pick' };
export const dynamic = 'force-dynamic';

const DIR = '.scratch/photo-all';
const json = <T,>(file: string, fallback: T): Promise<T> => readFile(`${DIR}/${file}`, 'utf8').then((s) => JSON.parse(s) as T).catch(() => fallback);

/**
 * Dev only: for each player Jonno marked wrong on /photo-check (or flagged with the "Wrong photo"
 * button), the alternatives the pipeline cut, to pick one of or the kit card.
 */
export default async function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const marked = await json<string[]>('marked.json', []);
  const players = await json<{ id: string; name: string; club?: string }[]>('players.json', []);
  const byId = new Map(players.map((p, i) => [p.id, { ...p, rank: i + 1 }]));
  const items: PickItem[] = [];
  let waiting = 0;
  for (const id of marked) {
    const p = byId.get(id);
    if (!p) continue;
    const st = await json<{ results?: { file: string; year: number }[] } | null>(`out/${id}.json`, null);
    if (!st) { waiting++; continue; }
    items.push({ id, name: p.name, rank: p.rank, club: p.club, alts: (st.results ?? []).map((r) => ({ file: r.file.replace(/^File:/, ''), year: r.year })) });
  }
  items.sort((a, b) => a.rank - b.rank);
  return <PhotoPick items={items} waiting={waiting} />;
}
