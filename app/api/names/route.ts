import { encodePicture, type NameRow } from '../../../src/lib/chain/client';
import { loadData } from '../../../src/server/board';

/**
 * The album index: every name the search can find, with its picture.
 *
 * Names only. No fame, no clubs, no nation — nothing that could rank or
 * filter an answer. It is fetched once and cached for a day, so the page
 * itself carries nothing of the pool.
 */
let cached: Promise<string> | null = null;

async function build(): Promise<string> {
  const { players, images } = await loadData();
  const rows: NameRow[] = players.map((p) => [p.id, p.name, p.aliases, encodePicture(images[p.id])]);
  return JSON.stringify({ players: rows });
}

export async function GET() {
  cached ??= build();
  return new Response(await cached, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
