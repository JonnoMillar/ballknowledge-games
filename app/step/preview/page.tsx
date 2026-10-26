import { notFound } from 'next/navigation';
import MotionPreview from '../../../games/step/components/MotionPreview';
import { demoClub, demoSticker } from '../../../src/server/board';
import { judgePick, loadDay } from '../../../games/step/server';
import '../../../games/step/step.css';

export const metadata = { title: 'Card motion' };

/** Dev only: Steps' card motion on demand (games/step/components/MotionPreview.tsx). */
export default async function MotionPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const [united, madrid] = ['Q18656', 'Q8682'];
  // Ronaldo, Benzema, Suárez, Rooney, Heinze: real photos and crests, one per grade.
  const players = await Promise.all(['Q11571', 'Q1912', 'Q26517', 'Q266613', 'Q63659'].map((id) => demoSticker(id, united, madrid)));
  // The deepest answers of a real day, as the game would show them at the end of a run.
  const date = new Date().toISOString().slice(0, 10);
  const day = await loadDay(date);
  const deep = day ? await Promise.all(day.steps.map(async (_, i) => (await judgePick(date, i, 'Q11571'))?.elite ?? null)) : [];
  return <MotionPreview players={players} club={await demoClub(madrid)} deep={deep} />;
}
