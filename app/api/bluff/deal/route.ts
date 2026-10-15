import { deal, YEARS } from '../../../../games/bluff/server';

/** One team sheet in the year range, not one of `exclude` (the keys this phone has seen). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { from?: unknown; to?: unknown; exclude?: unknown } | null;
  const year = (v: unknown, d: number) => (typeof v === 'number' && Number.isInteger(v) ? v : d);
  const exclude = Array.isArray(body?.exclude) ? body.exclude.filter((x): x is string => typeof x === 'string').slice(-500) : [];
  const side = deal(year(body?.from, YEARS.first), year(body?.to, YEARS.last), exclude);
  return side ? Response.json(side) : Response.json({ error: 'no sides in that range' }, { status: 404 });
}
