import { runView } from '../../../../games/season-line/server';

/** The daily run's Read the season, as far as the guesses have got. The body is public input: checked, never trusted. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { date?: unknown; clubs?: unknown; seasons?: unknown } | null;
  if (!body || typeof body.date !== 'string' || !Array.isArray(body.clubs)) return Response.json({ error: 'bad request' }, { status: 400 });
  if (body.seasons !== undefined && !Array.isArray(body.seasons)) return Response.json({ error: 'bad request' }, { status: 400 });
  const v = await runView(body.date, body.clubs, body.seasons ?? []);
  if (!v) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(v);
}
