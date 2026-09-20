import { judge } from '../../../../games/rondo/server';

/**
 * A pass, judged. The body is the ball as the page carries it and the id
 * named, or null for a forfeit (the clock, or "I've got nothing").
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    { carrier?: unknown; burnt?: unknown; named?: unknown; target?: unknown } | null;
  const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');
  if (!body || typeof body.carrier !== 'string' || !strings(body.burnt) || !strings(body.named)) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const target = typeof body.target === 'string' ? body.target : null;
  if (body.burnt.length > 400 || body.named.length > 400) return Response.json({ error: 'too long' }, { status: 400 });
  const out = await judge({ carrier: body.carrier, burnt: body.burnt, named: body.named }, target);
  return Response.json(out);
}
