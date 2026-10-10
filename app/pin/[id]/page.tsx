import { notFound } from 'next/navigation';
import PitchPin from '../../../games/pin/components/PitchPin';
import { boardView, library } from '../../../games/pin/server';

/** A pack. The id is checked before it is looked up; an unknown pack is a 404. */
export default async function PinPack({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = /^[a-z0-9-]{1,40}$/.test(id) ? boardView(id) : null;
  if (!board) notFound();
  const order = library().flatMap((s) => s.packs.map((p) => ({ id: p.id, size: p.size, title: p.title })));
  return <PitchPin board={board} order={order} />;
}
