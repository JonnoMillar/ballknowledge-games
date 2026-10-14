import Archive from '../../../games/step/components/Archive';
import { EPOCH } from '../../../games/step/lib/day';
import '../../../games/step/step.css';

export const metadata = {
  title: 'Step archive',
  description: 'Every step run so far. Play the ones you missed.',
};

export default function ArchivePage() {
  return <Archive epoch={EPOCH} />;
}
