import { readFile } from 'node:fs/promises';
import Game from '../components/Game';
import type { Player } from '../src/lib/chemistry/types';
import type { Board } from '../src/lib/puzzle/types';

export default async function Page() {
  const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const board = JSON.parse(await readFile('content/puzzles/003.json', 'utf8')) as Board;
  const nations = JSON.parse(await readFile('data/nations.json', 'utf8')) as Record<string, string>;
  return <Game players={players} board={board} nations={nations} />;
}
