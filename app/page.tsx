import Chain from '../components/Chain';
import { isBoardId, loadBoard } from '../src/server/board';

/**
 * The board page.
 *
 * Ships the puzzle, the givens and nothing else about the pool. The album
 * index comes from /api/names once the page is up, and the seal goes to
 * /api/seal, which is where the pool is read and the result computed. See
 * src/lib/chain/client.ts and src/server/board.ts.
 */
export default async function ChainPage(
  { searchParams }: { searchParams: Promise<{ c?: string }> },
) {
  const { c } = await searchParams;
  const board = await loadBoard(isBoardId(c) ? c : '004');
  if (!board) return <main className="board-col"><p className="brief">No such board.</p></main>;
  return <Chain puzzle={board.puzzle} givens={board.givens} images={board.images} clubs={board.clubs} />;
}
