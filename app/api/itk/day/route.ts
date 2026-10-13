import { loadDay } from '../../../../games/itk/server';

/** One day of ITK, without the answers. `?date=YYYY-MM-DD`, the player's own date. */
export async function GET(req: Request) {
  const day = await loadDay(new URL(req.url).searchParams.get('date') ?? '');
  if (!day) return Response.json({ error: 'no game that day' }, { status: 404 });
  return Response.json(day);
}
