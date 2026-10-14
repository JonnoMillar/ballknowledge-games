import Lobby from '../../games/rondo/components/Lobby';
import '../../games/rondo/rondo.css';

export const metadata = {
  title: 'Rondo',
  description: 'Keep the ball. A football passing game for two to four mates and one phone.',
};

/** Rondo's front page; the match is at /rondo/play. See games/rondo/DESIGN.md. */
export default function RondoLobby() {
  return <Lobby />;
}
