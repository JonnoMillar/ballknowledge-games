import type { HintResponse } from '../../../src/lib/chain/client';
import { clubView } from '../../../src/lib/clubs';
import { isBoardId, loadData, readPuzzleFile } from '../../../src/server/board';

/**
 * A hint: the clubs a GIVEN played for.
 *
 * The givens are on the page from the start, so their careers leak nothing
 * about the answer; they are the shelf the answer is on. The hint says it
 * as badges, most appearances first. The reference solution is never read
 * here. Whether a hint was taken is the player's own record — the plates
 * either side of that given show yellow in the share line.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { board?: unknown; slot?: unknown } | null;
  const board = typeof body?.board === 'string' && isBoardId(body.board) ? body.board : null;
  const slot = typeof body?.slot === 'number' && Number.isInteger(body.slot) ? body.slot : null;
  if (!board || slot === null) return Response.json({ error: 'bad request' }, { status: 400 });

  const puzzle = await readPuzzleFile(board);
  if (!puzzle) return Response.json({ error: 'no such board' }, { status: 404 });
  const given = puzzle.slots[slot];
  if (!given) return Response.json({ error: 'not a given' }, { status: 400 });

  const { byId, clubs: stored } = await loadData();
  const player = byId.get(given);
  if (!player) return Response.json({ error: 'no such player' }, { status: 404 });

  const apps = (c: string) => player.spells?.[c]?.[0] ?? 0;
  const clubs = [...player.clubIds]
    .sort((a, b) => apps(b) - apps(a))
    .slice(0, 8)
    .map((id) => ({ id, club: stored[id] ? clubView(stored[id]!) : { name: id } }));

  const out: HintResponse = { clubs };
  return Response.json(out);
}
