import type { HintResponse } from '../../../src/lib/chain/client';
import { clubView } from '../../../src/lib/clubs';
import { isBoardId, loadData, readPuzzleFile } from '../../../src/server/board';

/**
 * A hint: the clubs the answer to one plate played for.
 *
 * It is the one thing the board will say about an answer before the seal,
 * and it says it as badges, not names. The plate the player asked about
 * has to be an empty one; the reference solution stays on the server and
 * only its clubs, most appearances first, come back. Whether a hint was
 * taken is the player's own record — the share line shows it in yellow.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { board?: unknown; slot?: unknown } | null;
  const board = typeof body?.board === 'string' && isBoardId(body.board) ? body.board : null;
  const slot = typeof body?.slot === 'number' && Number.isInteger(body.slot) ? body.slot : null;
  if (!board || slot === null) return Response.json({ error: 'bad request' }, { status: 400 });

  const puzzle = await readPuzzleFile(board);
  if (!puzzle) return Response.json({ error: 'no such board' }, { status: 404 });
  if (puzzle.slots[slot] !== null) return Response.json({ error: 'not a plate' }, { status: 400 });
  const answer = puzzle.referenceSolution?.[slot];
  if (!answer) return Response.json({ error: 'no answer' }, { status: 404 });

  const { byId, clubs: stored } = await loadData();
  const player = byId.get(answer);
  if (!player) return Response.json({ error: 'no answer' }, { status: 404 });

  const apps = (c: string) => player.spells?.[c]?.[0] ?? 0;
  const clubs = [...player.clubIds]
    .sort((a, b) => apps(b) - apps(a))
    .slice(0, 8)
    .map((id) => ({ id, club: stored[id] ? clubView(stored[id]!) : { name: id } }));

  const out: HintResponse = { clubs };
  return Response.json(out);
}
