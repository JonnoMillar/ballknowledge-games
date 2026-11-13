import RunRoute from './RunRoute';
import '../../games/itk/itk.css';
import '../../games/step/step.css';
import '../../components/run/run.css';

export const metadata = {
  title: 'Today’s assignment',
  description: 'Every daily in one go. One report at the end.',
};

/** The daily run. The day is the player's own date, so the client fetches it. */
export default function RunPage() {
  return <RunRoute />;
}
