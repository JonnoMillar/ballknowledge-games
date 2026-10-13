import { judgePick } from '../../../../games/itk/server';

/** Judge one ITK pick. The body is public input: checked, never trusted. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { date?: unknown; round?: unknown; index?: unknown; last?: unknown } | null;
  if (!body || typeof body.date !== 'string' || typeof body.round !== 'number' || typeof body.index !== 'number') {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const verdict = await judgePick(body.date, body.round, body.index, body.last === true);
  if (!verdict) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(verdict);
}
