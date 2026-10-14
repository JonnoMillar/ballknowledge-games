import Lobby from '../../games/itk/components/Lobby';
import { EPOCH } from '../../games/itk/lib/day';
import { demoCareer } from '../../games/itk/server';
import '../../games/itk/itk.css';

export const metadata = {
  title: 'Spoofed',
  description: 'Five careers. One move in each never happened. Find it.',
};

export default async function SpoofedLobby() {
  return <Lobby epoch={EPOCH} demo={await demoCareer()} />;
}
