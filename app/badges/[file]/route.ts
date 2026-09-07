import { readFile } from 'node:fs/promises';
import type { ClubRecord } from '../../../src/lib/clubs';

/**
 * Serve a club crest that is not in the local cache.
 *
 * Files under public/badges take precedence over this route, so it only runs
 * for clubs `npm run fetch:badges` has not pulled down — which is all of them
 * on a fresh clone, since the cache is 78 MB and gitignored. Redirecting keeps
 * the crest URL out of the client payload: one map of 5,764 thumbnail URLs is
 * 1.4 MB of props, and every club has to be there because any club can appear
 * in a link once the player starts placing people.
 */
let clubs: Record<string, ClubRecord> | null = null;

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;

  // The id is interpolated into nothing and read from a map, but the route is
  // public, so it is checked rather than trusted.
  const qid = /^(Q\d+)\.png$/.exec(file)?.[1];
  if (!qid) return new Response('not found', { status: 404 });

  clubs ??= JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;
  const url = clubs[qid]?.crestUrl;
  if (!url) return new Response('no crest', { status: 404 });

  return Response.redirect(url, 302);
}
