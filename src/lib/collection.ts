import { gradeRank, toGrade, type Grade } from './chain/grade';
import type { PortraitImage } from './portraits';

/**
 * The cards a player has collected (Deep Cuts boards, step runs), kept in the browser.
 *
 * One card per player: the best grade they have been found at, and where.
 * Like the streak, there is no account and no server; clearing site data
 * clears the album.
 */
export interface Card {
  id: string;
  name: string;
  grade: Grade;
  /** The Deep Cuts board it was found on, e.g. "104"; a step run's date. */
  board: string;
  /** The clubs the pick linked through, by name, in slot order. */
  via: string[];
  /** The same clubs as ids, for their colours. */
  clubs: string[];
  /** Local date, YYYY-MM-DD. */
  date: string;
  image?: PortraitImage;
  /** Where it was found, when that is not a Deep Cuts board: a label and a link. */
  source?: { label: string; href: string };
}

export type Collection = Record<string, Card>;

/** What adding a card did: a first find, a better grade, or nothing new. */
export type CardNews = 'new' | 'upgraded' | null;

const KEY = 'chain.collection.v1';

export function readCollection(): Collection {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Collection) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    // Cards saved under the old six grades are read as the five.
    const out: Collection = {};
    for (const [id, card] of Object.entries(parsed)) {
      const grade = toGrade(card?.grade);
      if (grade) out[id] = { ...card, grade };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Add a card, keeping the better one. Pure: returns the new collection and
 * what changed, and leaves the one passed in alone.
 */
export function addCard(collection: Collection, card: Card): { collection: Collection; news: CardNews } {
  const had = collection[card.id];
  if (!had) return { collection: { ...collection, [card.id]: card }, news: 'new' };
  if (gradeRank(card.grade) > gradeRank(had.grade)) return { collection: { ...collection, [card.id]: card }, news: 'upgraded' };
  return { collection, news: null };
}

/** Add several and save. Returns what each card did, by player id. */
export function recordCards(cards: readonly Card[]): Record<string, CardNews> {
  let collection = readCollection();
  const news: Record<string, CardNews> = {};
  for (const c of cards) {
    const r = addCard(collection, c);
    collection = r.collection;
    news[c.id] = r.news;
  }
  try { localStorage.setItem(KEY, JSON.stringify(collection)); } catch { /* private mode, or full */ }
  return news;
}

/** The collection rarest first, then most recent, then by name. */
export function sortedCards(collection: Collection): Card[] {
  return Object.values(collection).sort((a, b) =>
    gradeRank(b.grade) - gradeRank(a.grade) || b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}
