import { readFile } from 'node:fs/promises';
import Chain from '../../components/Chain';
import type { Player } from '../../src/lib/chemistry/types';
import type { ChainPuzzle } from '../../src/lib/chain/types';

export default async function ChainPage() {
  const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const nations = JSON.parse(await readFile('data/nations.json', 'utf8')) as Record<string, string>;
  const images = JSON.parse(await readFile('data/images.json', 'utf8')) as Record<string, string>;

  const file = JSON.parse(await readFile('content/chains/001.json', 'utf8')) as ChainPuzzle;

  // The reference solution never crosses to the browser. On a chain a blank has
  // exactly two neighbours, so one leaked id is the whole puzzle — and the XI
  // boards currently ship theirs inside the client bundle, which is a standing
  // leak this mode does not repeat.
  const puzzle: ChainPuzzle = { id: file.id, slots: file.slots };

  return <Chain players={players} puzzle={puzzle} nations={nations} images={images} />;
}
