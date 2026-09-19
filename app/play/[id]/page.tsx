import { notFound } from 'next/navigation';
import PlayClient from '../../../components/PlayClient';
import { isBoardId, listBoards, loadBoard } from '../../../src/server/board';

/**
 * A board to play.
 *
 * Ships the puzzle, the givens and nothing else about the pool. The album
 * index comes from /api/names once the page is up, and the seal goes to
 * /api/seal. Whether this board is today's daily is decided in the browser,
 * from the player's own clock, so the page also ships the daily set's ids.
 */
export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isBoardId(id)) notFound();
  const board = await loadBoard(id);
  if (!board) notFound();
  const daily = (await listBoards()).filter((b) => b.daily).map((b) => b.id);
  return <PlayClient board={board} dailyIds={daily} />;
}
