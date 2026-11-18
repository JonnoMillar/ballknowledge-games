import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Hub from '../components/Hub';
import { isBoardId } from '../src/server/board';
import { HUB_COOKIE, readHubCookie } from '../src/lib/today';

export const metadata = {
  title: { absolute: 'FootyScoutle · Daily football games' },
  description: 'Daily football games: today’s assignment, Chain, Spoofed, Odd Man Out, Pitch pin, Season line and Rondo.',
};

/**
 * The hub. `/?c=NNN` is how the old Chain links reached a board, before
 * Chain moved to `/chain`; they still land on it.
 */
export default async function HubPage(
  { searchParams }: { searchParams: Promise<{ c?: string }> },
) {
  const { c } = await searchParams;
  if (isBoardId(c)) redirect(`/play/${c}`);
  return <Hub initial={readHubCookie((await cookies()).get(HUB_COOKIE)?.value)} />;
}
