import { readFile } from 'node:fs/promises';
import { notFound } from 'next/navigation';
import PhotoCheck, { type CheckItem } from '../../components/PhotoCheck';

export const metadata = { title: 'Photo check' };
export const dynamic = 'force-dynamic';

const TOP = 500;

/**
 * Dev only: the top 500 players by Wikipedia views, with the cutout the pipeline picked, for
 * Jonno to mark the wrong ones (docs/photo-pipeline.md). Players without a cutout yet are
 * left out until the pipeline reaches them; ones it gave up on are listed at the end as kit cards.
 */
export default async function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const dir = '.scratch/photo-all';
  const players = (JSON.parse(await readFile(`${dir}/players.json`, 'utf8')) as { id: string; name: string; club?: string; clubName?: string }[]).slice(0, TOP);
  const items: CheckItem[] = [];
  let waiting = 0;
  for (const [i, p] of players.entries()) {
    const st = await readFile(`${dir}/out/${p.id}.json`, 'utf8').then((s) => JSON.parse(s) as { ok: boolean; results?: { file: string; year: number }[] }).catch(() => null);
    if (!st) { waiting++; continue; }
    items.push({ id: p.id, name: p.name, rank: i + 1, club: p.club, cutout: st.ok, file: st.results?.[0]?.file.replace(/^File:/, ''), year: st.results?.[0]?.year });
  }
  return <PhotoCheck items={items} waiting={waiting} />;
}
