import { existsSync, readFileSync } from 'node:fs';
import { notFound } from 'next/navigation';
import PhotoPick, { type PickItem } from '../../components/PhotoPick';

export const metadata = { title: 'Photo pick' };
export const dynamic = 'force-dynamic';

const DIR = '.scratch/photo-all';
const json = <T,>(file: string, fallback: T): T => (existsSync(`${DIR}/${file}`) ? (JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as T) : fallback);

/** Synchronous reads in one function, as on /photo-check: no awaited promise per file. */
function load(focus?: string): { items: PickItem[]; waiting: number } {
  // ?focus=1: only the players in upcoming games (focus.json); ?focus=<name>: focus-<name>.json.
  const want = focus ? new Set(json<string[]>(focus === '1' ? 'focus.json' : `focus-${focus.replace(/[^a-z0-9-]/gi, '')}.json`, [])) : null;
  const blurry = json<{ blurry?: Record<string, number[]> }>('screen.json', {}).blurry ?? {};
  const marked = json<string[]>('marked.json', []).filter((id) => !want || want.has(id));
  const players = json<{ id: string; name: string; club?: string }[]>('players.json', []);
  const byId = new Map(players.map((p, i) => [p.id, { ...p, rank: i + 1 }]));
  const items: PickItem[] = [];
  let waiting = 0;
  for (const id of marked) {
    const p = byId.get(id);
    if (!p) continue;
    const st = json<{ results?: { file: string; year: number; k: number; current?: boolean }[] } | null>(`out/${id}.json`, null);
    if (!st) { waiting++; continue; }
    // A blurry alternative is left out (screen.py's floor), except the photo on the site now, which stays as the default.
    const alts = (st.results ?? []).filter((r) => r.current || !blurry[id]?.includes(r.k));
    items.push({ id, name: p.name, rank: p.rank, club: p.club, alts: alts.map((r) => ({ k: r.k, file: r.file.replace(/^File:/, ''), year: r.year, current: r.current })) });
  }
  items.sort((a, b) => a.rank - b.rank);
  return { items, waiting };
}

/**
 * Dev only: for each player Jonno marked wrong on /photo-check (or flagged with the "Wrong photo"
 * button), the alternatives the pipeline cut, to pick one of or the kit card.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { items, waiting } = load((await searchParams).focus);
  return <PhotoPick items={items} waiting={waiting} />;
}
