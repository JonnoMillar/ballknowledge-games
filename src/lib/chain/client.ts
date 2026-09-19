import type { ChainLink } from './score';
import type { ChainResult } from './result';
import type { ChainPuzzle } from './types';
import type { Player } from '../chemistry/types';
import type { ClubView } from '../clubs';
import type { PortraitImage } from '../portraits';
import { linkPairs } from './score';

/**
 * What the browser knows about the pool, and when.
 *
 * The page used to ship every player — 11,741 records, fame and all — inside
 * the HTML, 8.6 MB decoded. Now the browser gets names to search and the
 * givens to draw, and finds out everything else when it seals: the fill goes
 * to a route handler, `chainResult` runs on the server, and the answer comes
 * back with the handful of full records the reveal needs. Fame, spells and
 * every field stay on the server until the sheet is sealed, which is also
 * what the game's own rules wanted all along.
 */

/** The least a sticker needs. `Player` satisfies it. */
export interface Named {
  id: string;
  name: string;
}

/** One line of the searchable album: a name, its aliases, and a picture. */
export interface NameEntry extends Named {
  aliases: readonly string[];
  image?: PortraitImage;
}

/** A given, as the page ships it: a name and the ground it stands on. */
export interface Given extends Named {
  /** CSS background for the sticker: the club it is best known for. */
  ground: string;
}

/**
 * The album index over the wire. Tuples rather than objects, because the
 * keys of eleven thousand objects are a third of the payload; and a picture
 * is a short key rather than a URL, because nine thousand Commons URLs share
 * the same 70 characters.
 */
export type NameRow = [id: string, name: string, aliases: readonly string[], picture: string | null];

const COMMONS = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const CUTOUT = 'https://r2.thesportsdb.com/images/media/player/cutout/';

/** `c:` a Commons file, cropped to the frame; `s:` a cutout, shown whole. */
export function encodePicture(img: PortraitImage | undefined): string | null {
  if (!img) return null;
  if (img.url.startsWith(COMMONS)) return `c:${img.url.slice(COMMONS.length)}`;
  if (img.url.startsWith(CUTOUT)) return `s:${img.url.slice(CUTOUT.length)}`;
  return `${img.fit === 'contain' ? 'u' : 'v'}:${img.url}`;
}

export function decodePicture(key: string | null): PortraitImage | undefined {
  if (!key) return undefined;
  const kind = key.slice(0, 2);
  const rest = key.slice(2);
  if (kind === 'c:') return { url: COMMONS + rest, fit: 'cover' };
  if (kind === 's:') return { url: CUTOUT + rest, fit: 'contain' };
  if (kind === 'u:') return { url: rest, fit: 'contain' };
  if (kind === 'v:') return { url: rest, fit: 'cover' };
  return undefined;
}

export function decodeNames(rows: readonly NameRow[]): NameEntry[] {
  return rows.map(([id, name, aliases, picture]) => ({ id, name, aliases, image: decodePicture(picture) }));
}

/** What sealing sends. */
export interface SealRequest {
  board: string;
  fill: readonly string[];
}

/** What sealing returns: the result, and everything the reveal draws. */
export interface SealResponse {
  result: ChainResult;
  links: ChainLink[];
  /** Full records for every player the result mentions. */
  players: Player[];
  /** Names for every club the result mentions. */
  clubs: Record<string, ClubView>;
}

/**
 * The links as the live board draws them: nothing known, except the club a
 * link names. The real links arrive with the seal.
 */
export function blankLinks(puzzle: ChainPuzzle): ChainLink[] {
  const prescribed = puzzle.prescribedLinks ?? {};
  return linkPairs(puzzle.slots.length, puzzle.closed ?? false).map((_, i) => {
    const required = prescribed[i];
    return {
      index: i,
      colour: null,
      clubs: required !== undefined ? [required] : [],
      made: false,
      required,
    };
  });
}
