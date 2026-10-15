import { pickEndless } from '../../../../games/season-line/server';

/** A fresh endless board inside `?from=&to=`, skipping the ids in `?seen=` (comma separated). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const seen = (q.get('seen') ?? '').split(',').filter(Boolean).slice(0, 1000);
  const id = await pickEndless(Number(q.get('from')), Number(q.get('to')), seen);
  if (!id) return Response.json({ error: 'none left' }, { status: 404 });
  return Response.json({ id });
}
