import Itk from '../../games/itk/components/Itk';
import '../../games/itk/itk.css';

export const metadata = {
  title: 'Spoofed',
  description: 'Five careers. One move in each never happened. Find it.',
};

/** The day is the player's own date, so the client fetches it. */
export default function ItkPage() {
  return <Itk />;
}
