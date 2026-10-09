import Library from '../../games/pin/components/Library';
import { library } from '../../games/pin/server';

/** The library. Rendered per request, so New is always current. */
export const dynamic = 'force-dynamic';

export default async function PinLibrary({ searchParams }: { searchParams: Promise<{ score?: string }> }) {
  const { score } = await searchParams;
  return <Library shelves={library()} mode={score === 'points' ? 'points' : 'metres'} />;
}
