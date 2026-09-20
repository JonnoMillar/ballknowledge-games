import { deal } from '../../../../src/server/slugger';

/**
 * A hand for the pitcher: three clubs, one of each kind, none thrown yet.
 * The browser sends what has been pitched this match; the server has no
 * memory of a match and needs none.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { pitched?: unknown } | null;
  const pitched = Array.isArray(body?.pitched) ? body!.pitched.filter((x): x is string => typeof x === 'string') : [];
  if (pitched.length > 500) return Response.json({ error: 'bad request' }, { status: 400 });
  return Response.json({ hand: await deal(pitched) });
}
