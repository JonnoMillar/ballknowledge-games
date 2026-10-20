import { readFile, readdir } from 'node:fs/promises';
import type { Player } from '../lib/chemistry/types';
import type { ChainPuzzle } from '../lib/chain/types';
import type { BoardProps, BoardSummary, Given } from '../lib/chain/client';
import { clubView, type ClubRecord, type ClubView } from '../lib/clubs';
import { clubColour, signatureClub } from '../lib/club-colours';
import { portraitUrls, type PortraitImage, type PortraitRecord } from '../lib/portraits';
import type { ChainDemo, DemoClub, DemoSticker } from '../lib/demo';

/**
 * The data the server reads, read once and kept.
 *
 * Every route handler and the page used to `readFile` the 5 MB pool for
 * themselves. A page that AWAITS that read inside a server component ships
 * it too: React's development stream records the resolved value of every
 * awaited promise as debug info, and the HTML for one board came to 7 MB.
 * Awaiting a function that returns the few hundred bytes the page needs
 * keeps both the file reads and the debug records small.
 */
interface Data {
  players: Player[];
  byId: Map<string, Player>;
  images: Record<string, PortraitImage>;
  clubs: Record<string, ClubRecord>;
}

let data: Promise<Data> | null = null;

export function loadData(): Promise<Data> {
  data ??= (async () => {
    const players = JSON.parse(await readFile('data/pool.json', 'utf8')) as Player[];
    const files = JSON.parse(await readFile('data/images.json', 'utf8')) as Record<string, string>;
    const resolved = await readFile('data/portraits.json', 'utf8')
      .then((s) => JSON.parse(s) as Record<string, PortraitRecord>)
      .catch(() => ({}));
    const clubs = JSON.parse(await readFile('data/clubs.json', 'utf8')) as Record<string, ClubRecord>;
    const images = portraitUrls(files, resolved, 200, process.env.NODE_ENV === 'development');
    return { players, byId: new Map(players.map((p) => [p.id, p])), images, clubs };
  })();
  return data;
}

/** A board id is a file path: validated, never interpolated raw. */
export const isBoardId = (c: string | undefined): c is string => /^\d{3}$/.test(c ?? '');

export async function readPuzzleFile(id: string): Promise<ChainPuzzle | null> {
  if (!isBoardId(id)) return null;
  return readFile(`content/chains/${id}.json`, 'utf8')
    .then((s) => JSON.parse(s) as ChainPuzzle)
    .catch(() => null);
}

/** A given as the page ships it: a name and the club it wears. */
const givenOf = (p: Player): Given => ({ id: p.id, name: p.name, ground: clubColour(signatureClub(p)) });

export async function loadBoard(id: string): Promise<BoardProps | null> {
  const file = await readPuzzleFile(id);
  if (!file) return null;
  const { byId, images: allImages, clubs: stored } = await loadData();

  // The reference solution never crosses to the browser. On a chain a blank
  // has exactly two neighbours, so one leaked id is the whole puzzle.
  const puzzle: ChainPuzzle = {
    id: file.id, mode: file.mode, difficulty: file.difficulty, slots: file.slots,
    prescribedLinks: file.prescribedLinks, caption: file.caption, closed: file.closed,
    clues: file.clues, deep: file.deep,
  };

  // The givens: a name and the ground they stand on. Their signature club is
  // on the board before anyone touches it, so it leaks nothing.
  const givens: Record<string, Given> = {};
  const images: Record<string, PortraitImage> = {};
  for (const gid of puzzle.slots) {
    if (gid == null) continue;
    const p = byId.get(gid);
    if (!p) continue;
    givens[gid] = givenOf(p);
    if (allImages[gid]) images[gid] = allImages[gid]!;
  }

  // Only the clubs the board names up front. The seal brings the rest.
  const clubs: Record<string, ClubView> = {};
  for (const clubId of Object.values(puzzle.prescribedLinks ?? {})) {
    const rec = stored[clubId];
    if (rec) clubs[clubId] = clubView(rec);
  }

  return { puzzle, givens, images, clubs };
}

let summaries: Promise<BoardSummary[]> | null = null;

export function listBoards(): Promise<BoardSummary[]> {
  summaries ??= (async () => {
    const { byId, images: allImages, clubs: stored } = await loadData();
    const files = (await readdir('content/chains')).filter((f) => /^\d{3}\.json$/.test(f)).sort();
    const out: BoardSummary[] = [];
    for (const f of files) {
      const p = await readPuzzleFile(f.slice(0, 3));
      if (!p) continue;
      const images: Record<string, PortraitImage> = {};
      const slots = p.slots.map((id): Given | null => {
        const player = id ? byId.get(id) : undefined;
        if (!id || !player) return null;
        if (allImages[id]) images[id] = allImages[id]!;
        return givenOf(player);
      });
      const clues: Record<number, string> = {};
      for (const [i, clue] of Object.entries(p.clues ?? {})) clues[Number(i)] = clue.label;
      const named = Object.values(p.prescribedLinks ?? {})[0];
      const via = named ? stored[named]?.name : undefined;
      out.push({
        id: p.id, daily: p.difficulty === undefined && !p.deep, deep: p.deep ?? false, difficulty: p.difficulty,
        closed: p.closed ?? false, slots, clues, images, ...(via ? { via } : {}),
      });
    }
    return out;
  })();
  return summaries;
}

/** A demo's sticker: the player, their photo, a ground of one club or two. */
export async function demoSticker(id: string, a: string, b = a): Promise<DemoSticker> {
  const { byId, images } = await loadData();
  const p = byId.get(id)!;
  return { id, name: p.name, ...(images[id] ? { image: images[id] } : {}), ground: { a: clubColour(a), b: clubColour(b) } };
}

/** A demo's club: its crest and colour. */
export async function demoClub(id: string): Promise<DemoClub> {
  const { clubs } = await loadData();
  return { id, club: clubs[id] ? clubView(clubs[id]!) : { name: id }, colour: clubColour(id) };
}

/**
 * Chain's How to play: Rooney, a Portuguese, Benzema, linked through United
 * and Madrid. The answer is Ronaldo; no daily asks it.
 */
export async function demoChain(): Promise<ChainDemo> {
  const [united, madrid] = ['Q18656', 'Q8682'];
  return {
    left: await demoSticker('Q266613', united),
    gap: await demoSticker('Q11571', united, madrid),
    right: await demoSticker('Q1912', madrid),
    links: [await demoClub(united), await demoClub(madrid)],
    clue: { flag: 'pt', label: 'a Portuguese' },
  };
}
