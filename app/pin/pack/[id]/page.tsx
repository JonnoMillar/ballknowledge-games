import { notFound } from 'next/navigation';
import PitchPin from '../../../../games/pin/components/PitchPin';
import { boardView, packList } from '../../../../games/pin/server';

/** A themed pack: six classics, any time. */
export default async function PinPack({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ score?: string }>;
}) {
  const { id } = await params;
  const { score } = await searchParams;
  const board = /^[a-z0-9-]{1,40}$/.test(id) ? boardView(`pack:${id}`) : null;
  if (!board) notFound();
  return <PitchPin board={board} mode={score === 'points' ? 'points' : 'metres'} packs={packList()} />;
}
