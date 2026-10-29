import { notFound } from 'next/navigation';
import GroundsPreview, { type GroundCard } from '../../components/GroundsPreview';
import { loadData } from '../../src/server/board';
import { clubColour } from '../../src/lib/club-colours';
import { kitCard } from '../../src/lib/portraits';

export const metadata = { title: 'Card grounds' };

/**
 * Dev only: what stands behind a player's photo on a card. Twelve real
 * cutouts from the photo pipeline (public/portraits, the ranking's first
 * pick, not yet approved), and the kit card's candidate figures.
 */
const CUTOUTS: [string, string][] = [
  ['Q104454', 'Q41420'], ['Q10520', 'Q18656'], ['Q113704154', 'Q7156'], ['Q119562', 'Q50602'],
  ['Q133903', 'Q1130849'], ['Q1354960', 'Q1130849'], ['Q151269', 'Q15789'], ['Q129027', 'Q18656'],
  ['Q16665941', 'Q9616'], ['Q17515', 'Q2641'], ['Q184586', 'Q8682'], ['Q178649', 'Q7156'],
];
const KIT_CLUB = 'Q7156';
const KIT_OPTIONS = [
  { id: 'avg-hard', label: 'A. Average footballer, solid (made from 49 of our own front-facing cutouts)', url: '/kit/avg-hard.png' },
  { id: 'avg-soft', label: 'B. Average footballer, soft edge', url: '/kit/avg-soft.png' },
  { id: 'one', label: 'C. One real cutout blacked out (the most typical of the 49)', url: '/kit/one.png' },
  { id: 'now', label: 'D. What it is now (Lewandowski 2018, blacked out)', url: '/kit-figure.png' },
];

export default async function GroundsPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { byId } = await loadData();
  const card = ([id, club]: [string, string]): GroundCard => ({
    player: { id, name: byId.get(id)?.name ?? id },
    image: { url: `/portraits/${id}.webp`, fit: 'box' },
    colour: clubColour(club),
  });
  return <GroundsPreview cards={CUTOUTS.map(card)} kit={{ options: KIT_OPTIONS, card: { player: { id: 'kit', name: 'John Doe' }, image: kitCard(KIT_CLUB), colour: clubColour(KIT_CLUB) } }} />;
}
