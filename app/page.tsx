import { Onest } from 'next/font/google';
import { redirect } from 'next/navigation';
import Hub from '../games/hub/Hub';
import '../games/hub/hub.css';
import { isBoardId } from '../src/server/board';

/** Onest is self-hosted by next/font. Valley Sans (the headings) is not in this Next's font list, so it comes from Google's stylesheet. */
const onest = Onest({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-onest', display: 'swap' });

export const metadata = {
  title: { absolute: 'FootballScouted · Daily football games' },
  description: 'Daily football games for people with real ball knowledge: today’s assignment, and every daily on the board.',
  icons: { icon: '/hub/office/fs-icon-32.png' },
};

/**
 * The hub: the scout's office (games/hub). `/?c=NNN` is how the old Chain links
 * reached a board, before Chain moved to `/chain`; they still land on it.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  if (isBoardId(c)) redirect(`/play/${c}`);
  return (
    <div className={onest.variable}>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Valley+Sans:wght@900&display=swap" precedence="default" />
      <Hub />
    </div>
  );
}
