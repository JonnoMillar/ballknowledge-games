import { judge, parseThrow } from '../../../../games/pin/server';

/** A thrown pin, judged. The answer for that one goal, never the rest of the board. */
export async function POST(req: Request) {
  const t = parseThrow(await req.json().catch(() => null));
  if (!t) return Response.json({ error: 'bad request' }, { status: 400 });
  const answer = judge(t);
  if (!answer) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(answer);
}
