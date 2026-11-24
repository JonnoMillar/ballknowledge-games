import { Onest } from 'next/font/google';
import Hub from '../../games/hub/Hub';
import '../../games/hub/hub.css';

/** Onest is self-hosted by next/font. Valley Sans (the headings) is not in this Next's font list, so it comes from Google's stylesheet. */
const onest = Onest({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-onest', display: 'swap' });

export const metadata = {
  title: 'The scout’s office',
  description: 'Today’s assignment, and every daily on the board.',
  icons: { icon: '/hub/office/fs-icon-32.png' },
};

export default function HubPage() {
  return (
    <div className={onest.variable}>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Valley+Sans:wght@900&display=swap" precedence="default" />
      <Hub />
    </div>
  );
}
