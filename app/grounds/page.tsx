import { notFound } from 'next/navigation';
import GroundsPreview, { type GroundCard } from '../../components/GroundsPreview';
import { loadData } from '../../src/server/board';
import { clubColour } from '../../src/lib/club-colours';
import { kitCard } from '../../src/lib/portraits';

export const metadata = { title: 'Card grounds' };

/**
 * Dev only: what stands behind a player's photo on a card. Twelve real
 * cutouts from the photo pipeline (public/portraits, the ranking's first
 * pick, not yet approved) and two kit cards, on each candidate ground.
 */
const CUTOUTS: [string, string][] = [
  ['Q104454', 'Q41420'], ['Q10520', 'Q18656'], ['Q113704154', 'Q7156'], ['Q119562', 'Q50602'],
  ['Q133903', 'Q1130849'], ['Q1354960', 'Q1130849'], ['Q151269', 'Q15789'], ['Q129027', 'Q18656'],
  ['Q16665941', 'Q9616'], ['Q17515', 'Q2641'], ['Q184586', 'Q8682'], ['Q178649', 'Q7156'],
];
const KIT: [string, string][] = [['Q42731', 'Q8701'], ['Q173139', 'Q1543']];

export default async function GroundsPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { byId } = await loadData();
  const card = ([id, club]: [string, string], kit: boolean): GroundCard => ({
    player: { id, name: byId.get(id)?.name ?? id },
    image: kit ? kitCard(club) : { url: `/portraits/${id}.webp`, fit: 'box' },
    colour: clubColour(club),
  });
  return <GroundsPreview cards={[...CUTOUTS.map((c) => card(c, false)), ...KIT.map((c) => card(c, true))]} />;
}
