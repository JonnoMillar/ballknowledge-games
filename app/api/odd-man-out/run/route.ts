import { runMole } from '../../../../games/bluff/server';

/** The daily run's Find the mole, judged as far as the taps go. The body is public input: checked, never trusted. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { date?: unknown; taps?: unknown; out?: unknown } | null;
  if (!body || !Array.isArray(body.taps)) return Response.json({ error: 'bad request' }, { status: 400 });
  const v = runMole(body.date, body.taps, body.out);
  if (!v) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(v);
}
