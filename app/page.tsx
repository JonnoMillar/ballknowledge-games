import { redirect } from 'next/navigation';
import Hub from '../components/Hub';
import { isBoardId } from '../src/server/board';

export const metadata = {
  title: 'Football games',
  description: 'Football puzzles and pub games. Chain, Deep Cuts, Rondo, Pitch pin and Spoofed.',
};

/**
 * The hub. `/?c=NNN` is how the old Chain links reached a board, before
 * Chain moved to `/chain`; they still land on it.
 */
export default async function HubPage(
  { searchParams }: { searchParams: Promise<{ c?: string }> },
) {
  const { c } = await searchParams;
  if (isBoardId(c)) redirect(`/play/${c}`);
  return <Hub />;
}
