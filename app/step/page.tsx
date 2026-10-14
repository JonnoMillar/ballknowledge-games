import Step from '../../games/step/components/Step';
import '../../games/step/step.css';

export const metadata = {
  title: 'Step',
  description: 'One gap at a time: name someone who played with the player and for the club. The deeper, the rarer the card.',
};

/** The day is the player's own date, so the client fetches it. */
export default function StepPage() {
  return <Step />;
}
