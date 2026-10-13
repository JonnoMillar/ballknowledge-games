import Archive from '../../../games/itk/components/Archive';
import { EPOCH } from '../../../games/itk/lib/day';
import '../../../games/itk/itk.css';

export const metadata = {
  title: 'Spoofed archive',
  description: 'Every Spoofed day so far. Play the ones you missed.',
};

export default function ArchivePage() {
  return <Archive epoch={EPOCH} />;
}
