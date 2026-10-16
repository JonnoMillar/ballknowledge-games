import Lobby from '../../games/season-line/components/Lobby';
import { demo, years } from '../../games/season-line/server';
import '../../games/season-line/season-line.css';

export const metadata = {
  title: 'Season line',
  description: 'A Premier League club’s season, drawn as a line. Name the club and the season.',
};

export default async function SeasonLineLobby() {
  return <Lobby years={await years()} demo={await demo()} />;
}
