import { boardView } from '../../../../games/pin/server';

/** The daily run's Log the shot for `?date=YYYY-MM-DD`, without the answers. Throws go to /api/pin/throw with board `run:<date>`. */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? '';
  const view = /^\d{4}-\d{2}-\d{2}$/.test(date) ? boardView(`run:${date}`) : null;
  if (!view) return Response.json({ error: 'no goals that day' }, { status: 404 });
  return Response.json(view);
}
