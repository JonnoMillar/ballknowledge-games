import transfers from '../../../../data/transfers.json';
import { dealFor, dealLine, type Deal } from '../../../../src/lib/transfers';

/**
 * The real deal beside a report value: `?m=37.0` (£m). Kept on the server so
 * the page does not carry every transfer.
 */
export function GET(req: Request) {
  const m = Number(new URL(req.url).searchParams.get('m'));
  const hit = Number.isFinite(m) && m > 0 && m < 1000 ? dealFor(m, transfers as Deal[]) : null;
  if (!hit) return Response.json(null);
  return Response.json({ line: dealLine(hit), fee: hit.deal.fee, year: Number(hit.deal.date.slice(0, 4)), from: hit.deal.from });
}
