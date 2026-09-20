import { judge } from '../../../../src/server/slugger';

/**
 * A swing: a club and a name. The ruling comes back — a hit and its grade,
 * or a miss and the clubs the name did play for. The count, the bases and
 * the innings are the browser's to keep; see src/lib/slugger/match.ts.
 */
const QID = /^Q\d{1,12}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { club?: unknown; player?: unknown } | null;
  const club = typeof body?.club === 'string' && QID.test(body.club) ? body.club : null;
  const player = typeof body?.player === 'string' && QID.test(body.player) ? body.player : null;
  if (!club || !player) return Response.json({ error: 'bad request' }, { status: 400 });
  const verdict = await judge(club, player);
  if (!verdict) return Response.json({ error: 'no such player' }, { status: 404 });
  return Response.json(verdict);
}
