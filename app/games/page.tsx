import { cookies } from 'next/headers';
import Hub from '../../components/Hub';
import { HUB_COOKIE, readHubCookie } from '../../src/lib/today';

export const metadata = {
  title: 'All games',
  description: 'Daily football games: today’s assignment, Chain, Spoofed, Odd Man Out, Pitch pin, Season line and Rondo.',
};

/**
 * Every game as a bento of tiles: the hub until 2026-11-24, when the scout's
 * office took `/`. It is the way to games the office board does not show (Rondo).
 */
export default async function GamesPage() {
  return <Hub initial={readHubCookie((await cookies()).get(HUB_COOKIE)?.value)} />;
}
