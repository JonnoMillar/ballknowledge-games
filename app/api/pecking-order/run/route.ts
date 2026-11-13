import { runOrder } from '../../../../games/tunnel/run/server';

/** The daily run's Line them up, its values for each locked line. The body is public input: checked, never trusted. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { date?: unknown; lines?: unknown } | null;
  if (!body || !Array.isArray(body.lines)) return Response.json({ error: 'bad request' }, { status: 400 });
  const v = await runOrder(body.date, body.lines);
  if (!v) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(v);
}
