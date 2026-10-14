import { judgePick } from '../../../../games/step/server';

/** Judge one pick. The body is public input: checked, never trusted. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { date?: unknown; step?: unknown; pick?: unknown; earlier?: unknown } | null;
  const earlier = Array.isArray(body?.earlier) && body.earlier.every((x) => typeof x === 'string') ? (body.earlier as string[]) : null;
  if (!body || typeof body.date !== 'string' || typeof body.step !== 'number' || typeof body.pick !== 'string' || !earlier) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const verdict = await judgePick(body.date, body.step, body.pick, earlier);
  if (!verdict) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(verdict);
}
