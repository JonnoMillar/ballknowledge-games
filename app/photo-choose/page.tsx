import { existsSync, readFileSync } from 'node:fs';
import { notFound } from 'next/navigation';
import PhotoChoose, { type ChooseItem, type ChooseOpt } from '../../components/PhotoChoose';

export const metadata = { title: 'Photo choose' };
export const dynamic = 'force-dynamic';

const DIR = '.scratch/photo-all';
const json = <T,>(file: string, fallback: T): T => (existsSync(`${DIR}/${file}`) ? (JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as T) : fallback);

/**
 * Who to show: ?focus=<name> reads focus-<name>.json (gaps: scripts/photos/ops/gap_batch.py), else every player marked
 * wrong (marked.json). Players whose photo he has already approved or picked are left out, except the re-picks
 * (repick.json), whose photo on the site now is one of the options. Options come from scripts/photos/preview.py.
 */
function load(focus?: string): ChooseItem[] {
  const ids = focus ? json<string[]>(`focus-${focus.replace(/[^a-z0-9-]/gi, '')}.json`, []) : json<string[]>('marked.json', []);
  const players = json<{ id: string; name: string }[]>('players.json', []);
  const rank = new Map(players.map((p, i) => [p.id, { name: p.name, rank: i + 1 }]));
  const marks = json<{ wrong: string[]; flagged: string[] }>('marks.json', { wrong: [], flagged: [] });
  const wrong = new Set([...marks.wrong, ...marks.flagged]);
  const approved = new Set(json<string[]>('approved.json', []));
  const picked = json<Record<string, unknown>>('choices.json', {});
  const repick = new Set(json<string[]>('repick.json', []));
  const items: ChooseItem[] = [];
  for (const id of ids) {
    const p = rank.get(id);
    if (!p || (!repick.has(id) && ((approved.has(id) && !wrong.has(id)) || id in picked))) continue;
    items.push({ id, name: p.name, rank: p.rank, opts: json<ChooseOpt[]>(`pre/${id}.json`, []) });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

/** Dev only: choose each player's photo from the raw candidates, before anything is cut out (docs/photo-pipeline.md). */
export default async function Page({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <PhotoChoose items={load((await searchParams).focus)} />;
}
