import { notFound } from 'next/navigation';
import PitchPin from '../../../games/pin/components/PitchPin';
import { boardView, packList } from '../../../games/pin/server';

/** A daily board. A date that is not playable yet, or never was, is a 404. */
export default async function PinDay({ params, searchParams }: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ score?: string }>;
}) {
  const { date } = await params;
  const { score } = await searchParams;
  const board = boardView(date);
  if (!board) notFound();
  return <PitchPin board={board} mode={score === 'points' ? 'points' : 'metres'} packs={packList()} />;
}
