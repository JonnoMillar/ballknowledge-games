import { readFile } from 'node:fs/promises';
import Game from '../../components/Game';
import type { Player } from '../../src/lib/chemistry/types';
import type { Board } from '../../src/lib/puzzle/types';
import { portraitUrls, type PortraitRecord } from '../../src/lib/portraits';

// Parked: the original XI board, kept for a possible return but no longer the
// main product. See HANDOFF.md. Chain (the root route) is where the work is.
export const metadata = { title: 'Recall XI' };

export default async function Page() {
  const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const board = JSON.parse(await readFile('content/puzzles/003.json', 'utf8')) as Board;
  const files = JSON.parse(await readFile('data/images.json', 'utf8')) as Record<string, string>;
  // Portraits win over the raw Commons photos, and a resolved "none" empties
  // the card rather than falling back to a retirement-era snap.
  const resolved = await readFile('data/portraits.json', 'utf8')
    .then((s) => JSON.parse(s) as Record<string, PortraitRecord>)
    .catch(() => ({}));
  const images = portraitUrls(files, resolved);
  return <Game players={players} board={board} images={images} />;
}
