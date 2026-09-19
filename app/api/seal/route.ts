import type { SealResponse } from '../../../src/lib/chain/client';
import { chainLinks } from '../../../src/lib/chain/score';
import { chainResult } from '../../../src/lib/chain/result';
import { clubView, type ClubView } from '../../../src/lib/clubs';
import { isBoardId, loadData, readPuzzleFile } from '../../../src/server/board';

/**
 * The seal.
 *
 * The browser sends the board and its fill; the server judges it. The whole
 * result — links, fields, the answers that were sitting there — is computed
 * here and sent back with full records for every player it names, so the
 * reveal can draw them. Nothing about the fields reaches the browser before
 * this, and the reference solution never does.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { board?: unknown; fill?: unknown } | null;
  const board = typeof body?.board === 'string' && isBoardId(body.board) ? body.board : null;
  const fill = Array.isArray(body?.fill) && body.fill.every((x) => typeof x === 'string')
    ? (body.fill as string[])
    : null;
  if (!board || !fill) return Response.json({ error: 'bad request' }, { status: 400 });

  const puzzle = await readPuzzleFile(board);
  if (!puzzle) return Response.json({ error: 'no such board' }, { status: 404 });

  const { players, byId, clubs: stored } = await loadData();

  // The fill has to be the board's own shape: every given where the board put
  // it, every slot a real player, nobody twice.
  if (fill.length !== puzzle.slots.length) return Response.json({ error: 'wrong length' }, { status: 400 });
  for (let i = 0; i < fill.length; i++) {
    const given = puzzle.slots[i];
    if (given != null && fill[i] !== given) return Response.json({ error: 'given moved' }, { status: 400 });
    if (!byId.has(fill[i]!)) return Response.json({ error: 'unknown player' }, { status: 400 });
  }
  if (new Set(fill).size !== fill.length) return Response.json({ error: 'player twice' }, { status: 400 });

  const mode = puzzle.mode ?? 'chemistry';
  const result = chainResult(fill, puzzle, players, byId);
  const links = chainLinks(fill, byId, mode, puzzle.prescribedLinks ?? {}, puzzle.closed ?? false);

  const ids = new Set<string>(fill);
  const clubIds = new Set<string>();
  for (const s of result.slots) {
    if (s.best) { ids.add(s.best.id); s.best.clubs.forEach((c) => clubIds.add(c)); }
    if (s.obvious) { ids.add(s.obvious.id); s.obvious.clubs.forEach((c) => clubIds.add(c)); }
  }
  for (const p of result.pinboard) { ids.add(p.id); p.clubs.forEach((c) => clubIds.add(c)); }
  for (const l of links) { l.clubs.forEach((c) => clubIds.add(c)); if (l.required) clubIds.add(l.required); }

  const views: Record<string, ClubView> = {};
  for (const c of clubIds) { const rec = stored[c]; if (rec) views[c] = clubView(rec); }

  const out: SealResponse = {
    result,
    links,
    players: [...ids].map((id) => byId.get(id)!).filter(Boolean),
    clubs: views,
  };
  return Response.json(out);
}
