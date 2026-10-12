import { redirect } from 'next/navigation';
import Home from '../../components/Home';
import { isBoardId, listBoards } from '../../src/server/board';

/**
 * The front door: today's chain, the streak, the ladder and the archive.
 *
 * Which board is today's is decided in the browser from the player's own
 * clock, so this ships the list and the client picks. `?c=NNN` is how the
 * old links reached a board; they still work.
 */
export default async function HomePage(
  { searchParams }: { searchParams: Promise<{ c?: string }> },
) {
  const { c } = await searchParams;
  if (isBoardId(c)) redirect(`/play/${c}`);
  const boards = await listBoards();
  return <Home boards={boards} />;
}
