import PuzzleArchive from '../../../components/PuzzleArchive';
import { listBoards } from '../../../src/server/board';

export const metadata = {
  title: 'Puzzle archive · Chain',
  description: 'Every daily Chain puzzle so far, and the ladder of harder boards.',
};

export default async function PuzzleArchivePage() {
  return <PuzzleArchive boards={await listBoards()} />;
}
