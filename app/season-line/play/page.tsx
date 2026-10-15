import SeasonLine from '../../../games/season-line/components/SeasonLine';
import '../../../games/season-line/season-line.css';

export const metadata = {
  title: 'Season line',
  description: 'A Premier League club’s season, drawn as a line. Name the club and the season.',
};

/** The day is the player's own date, and endless reads its years from the URL, so the client fetches the board. */
export default function SeasonLinePlay() {
  return <SeasonLine />;
}
