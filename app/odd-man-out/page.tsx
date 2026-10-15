import Lobby from '../../games/bluff/components/Lobby';
import { SIDE_COUNT, YEARS } from '../../games/bluff/server';
import '../../games/bluff/bluff.css';

export const metadata = {
  title: 'Odd Man Out',
  description: 'A real team sheet with one player swapped. Find the fake. Two or more mates, one phone.',
};

/** Odd Man Out's front page; the match is at /odd-man-out/play. See games/bluff/HANDOFF.md. */
export default function OddManOutLobby() {
  return <Lobby years={YEARS} count={SIDE_COUNT} />;
}
