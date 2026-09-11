import { readFile } from 'node:fs/promises';
import Chain from '../components/Chain';
import type { Player } from '../src/lib/chemistry/types';
import type { ChainPuzzle } from '../src/lib/chain/types';
import { clubView, type ClubRecord, type ClubView } from '../src/lib/clubs';
import { portraitUrls, type PortraitRecord } from '../src/lib/portraits';

export default async function ChainPage(
  { searchParams }: { searchParams: Promise<{ c?: string }> },
) {
  const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
  const files = JSON.parse(await readFile('data/images.json', 'utf8')) as Record<string, string>;
  // Portraits win over the raw Commons photos, and a resolved "none" empties
  // the card rather than falling back to a retirement-era snap.
  const resolved = await readFile('data/portraits.json', 'utf8')
    .then((s) => JSON.parse(s) as Record<string, PortraitRecord>)
    .catch(() => ({}));
  const images = portraitUrls(files, resolved);
  const stored = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;
  // Names and a yes/no on the crest. The URLs stay on the server; see ClubView.
  const clubs: Record<string, ClubView> = {};
  for (const [qid, club] of Object.entries(stored)) clubs[qid] = clubView(club);

  // ?c=005 picks a board. Validated rather than interpolated: this reads a
  // file path from a query string.
  const { c } = await searchParams;
  const id = /^\d{3}$/.test(c ?? '') ? c! : '004';
  const file = JSON.parse(await readFile(`content/chains/${id}.json`, 'utf8')) as ChainPuzzle;

  // The reference solution never crosses to the browser. On a chain a blank has
  // exactly two neighbours, so one leaked id is the whole puzzle — and the XI
  // boards currently ship theirs inside the client bundle, which is a standing
  // leak this mode does not repeat.
  const puzzle: ChainPuzzle = {
    id: file.id, mode: file.mode, difficulty: file.difficulty, slots: file.slots,
    prescribedLinks: file.prescribedLinks, caption: file.caption, closed: file.closed,
  };

  return <Chain players={players} puzzle={puzzle} images={images} clubs={clubs} />;
}
