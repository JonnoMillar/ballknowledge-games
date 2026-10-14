import { ArchivePage } from '../../../games/itk/components/Archive';
import { EPOCH } from '../../../games/itk/lib/day';
import '../../../games/itk/itk.css';

export const metadata = {
  title: 'Spoofed archive',
  description: 'Every past Spoofed daily. Play the ones you missed.',
};

export default function SpoofedArchive() {
  return <ArchivePage epoch={EPOCH} />;
}
