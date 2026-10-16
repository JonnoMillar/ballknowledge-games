import Game from '../../../games/bluff/components/Game';
import Back from '../../../components/Back';
import '../../../games/bluff/bluff.css';

export const metadata = {
  title: 'Odd Man Out',
  description: 'A real team sheet with one player swapped. Find the fake. Two or more mates, one phone.',
};

/** The match. One phone on the table. See games/bluff/HANDOFF.md. */
export default function OddManOutPlay() {
  return (
    <div className="app bluff">
      <header className="masthead masthead--bluff">
        <Back href="/odd-man-out" label="Odd Man Out" />
        <a className="masthead__brand display" href="/odd-man-out">Odd Man Out</a>
      </header>
      <main className="bf-main">
        <Game />
      </main>
    </div>
  );
}
