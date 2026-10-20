import { readFile } from 'node:fs/promises';

/**
 * The candidate ids (data/raw/_ids.json) a side file has no entry for yet,
 * with what it already holds.
 *
 * The side-file fetchers resume this way, so adding players to the pool
 * fetches only the new ones rather than refreshing every player's facts
 * under the daily boards. Delete the side file for a full refresh.
 */
export async function pendingIds<T>(sideFile: string): Promise<{ ids: string[]; done: Record<string, T> }> {
  const all = JSON.parse(await readFile('data/raw/_ids.json', 'utf8')) as string[];
  const done = await readFile(sideFile, 'utf8')
    .then((s) => JSON.parse(s) as Record<string, T>)
    .catch(() => ({} as Record<string, T>));
  const ids = all.filter((id) => !(id in done));
  console.log(`${sideFile}: ${Object.keys(done).length} held, ${ids.length} of ${all.length} to fetch`);
  return { ids, done };
}
