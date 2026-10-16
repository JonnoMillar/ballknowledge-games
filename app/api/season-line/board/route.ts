import { view } from '../../../../games/season-line/server';
import type { Guess } from '../../../../games/season-line/lib/types';

/** A board as far as the guesses have got. The body is public input: checked, never trusted. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: unknown; guesses?: unknown; bonus?: unknown } | null;
  if (!body || typeof body.id !== 'string' || !Array.isArray(body.guesses)) return Response.json({ error: 'bad request' }, { status: 400 });
  const v = await view(body.id, body.guesses as Guess[], body.bonus);
  if (!v) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(v);
}
