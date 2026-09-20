import { deal } from '../../../../src/server/rondo';

/**
 * A starter for a new ball: famous, several clubs, every club open.
 * `exclude` is the starters this match has already seen.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { exclude?: unknown } | null;
  const exclude = Array.isArray(body?.exclude) && body.exclude.every((x) => typeof x === 'string')
    ? (body.exclude as string[])
    : [];
  return Response.json(await deal(exclude));
}
