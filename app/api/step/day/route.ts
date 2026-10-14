import { loadDay } from '../../../../games/step/server';

/** One day of the step run: the givens only. `?date=YYYY-MM-DD`, the player's own date. */
export async function GET(req: Request) {
  const day = await loadDay(new URL(req.url).searchParams.get('date') ?? '');
  if (!day) return Response.json({ error: 'no run that day' }, { status: 404 });
  return Response.json(day);
}
