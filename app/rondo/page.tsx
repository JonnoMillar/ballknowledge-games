import Lobby from '../../games/rondo/components/Lobby';
import { demoBall } from '../../games/rondo/server';
import '../../games/rondo/rondo.css';

export const metadata = {
  title: 'Rondo',
  description: 'Keep the ball. A football passing game for two to four mates and one phone.',
};

/** Rondo's front page; the match is at /rondo/play. See games/rondo/DESIGN.md. */
export default async function RondoLobby() {
  return <Lobby demo={await demoBall()} />;
}
