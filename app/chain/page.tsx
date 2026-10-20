import { redirect } from 'next/navigation';
import Home from '../../components/Home';
import { demoChain, isBoardId, listBoards } from '../../src/server/board';
import { demoSteps } from '../../games/step/server';

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
  const [boards, chain, steps] = await Promise.all([listBoards(), demoChain(), demoSteps()]);
  return <Home boards={boards} demos={{ chain, steps }} />;
}
