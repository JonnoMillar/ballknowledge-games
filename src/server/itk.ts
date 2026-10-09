import { readFile } from 'node:fs/promises';
import { loadData } from './board';
import { clubColour, signatureClub } from '../lib/club-colours';
import type { PortraitImage } from '../lib/portraits';

/**
 * ITK, prototype: the example sets in content/itk/examples.json.
 *
 * The fake stands in for one real stop, keeping its year and loan tag. Which
 * stop, and the club it hid, is the answer, so it never leaves the server
 * until the round is over: every pick is judged by /api/itk/pick.
 */
interface StoredRound { band: string; player: string; name?: string; stops: { club: string; year: number; loan: boolean }[]; fake: number; real: string }
interface StoredSet { id: string; picker: string; rounds: StoredRound[] }

export interface ItkStop { clubId: string; name: string; year: number; loan: boolean }
export interface ItkRound { player: { id: string; name: string }; image: PortraitImage | null; ground: string; stops: ItkStop[] }
export interface ItkSet { id: string; picker: string; rounds: ItkRound[] }

let stored: Promise<StoredSet[]> | null = null;
// Read once in production; every request in development, so regenerated examples show without a restart.
const readSets = () => (process.env.NODE_ENV === 'development' ? null : stored) ?? (stored = readFile('content/itk/examples.json', 'utf8').then((s) => (JSON.parse(s) as { sets: StoredSet[] }).sets));

export async function loadItkSets(): Promise<ItkSet[]> {
  const [sets, { byId, images, clubs }] = await Promise.all([readSets(), loadData()]);
  return sets.map((set) => ({
    id: set.id,
    picker: set.picker,
    rounds: set.rounds.map((r) => {
      const p = byId.get(r.player)!;
      return {
        // The name fans use (the English Wikipedia title), not the Wikidata label: Marc Guiu, not Marc Guiu Paz.
        player: { id: p.id, name: r.name ?? p.name },
        image: images[p.id] ?? null,
        ground: clubColour(signatureClub(p)),
        stops: r.stops.map((s) => ({ clubId: s.club, name: clubs[s.club]?.name ?? s.club, year: s.year, loan: s.loan })),
      };
    }),
  }));
}

export interface Verdict { fake: boolean; fakeIndex: number | null; real: { clubId: string; name: string } | null }

/**
 * Judge one pick. The fake's index, and the real club it covered, come back
 * only when the round is over: the pick found it, or it was the last pick.
 */
export async function judgePick(setId: string, round: number, index: number, last: boolean): Promise<Verdict | null> {
  const r = (await readSets()).find((s) => s.id === setId)?.rounds[round];
  if (!r || !Number.isInteger(index) || index < 0 || index >= r.stops.length) return null;
  const fake = index === r.fake;
  if (!fake && !last) return { fake, fakeIndex: null, real: null };
  const { clubs } = await loadData();
  return { fake, fakeIndex: r.fake, real: { clubId: r.real, name: clubs[r.real]?.name ?? r.real } };
}
