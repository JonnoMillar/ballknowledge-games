import { notFound } from 'next/navigation';
import PitchPin from '../../../games/pin/components/PitchPin';
import { boardView, library } from '../../../games/pin/server';

/** A pack. The id is checked before it is looked up; an unknown pack is a 404. */
export default async function PinPack({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ score?: string }>;
}) {
  const { id } = await params;
  const { score } = await searchParams;
  const board = /^[a-z0-9-]{1,40}$/.test(id) ? boardView(id) : null;
  if (!board) notFound();
  const order = library().flatMap((s) => s.packs.map((p) => ({ id: p.id, size: p.size })));
  return <PitchPin board={board} mode={score === 'points' ? 'points' : 'metres'} order={order} />;
}
