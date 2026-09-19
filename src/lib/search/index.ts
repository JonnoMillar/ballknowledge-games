/** Anything the album can be searched by. `Player` and `NameEntry` both are. */
export interface Nameable { id: string; name: string; aliases: readonly string[] }

export interface SearchEntry<T extends Nameable = Nameable> { player: T; haystack: string }
export type SearchIndex<T extends Nameable = Nameable> = SearchEntry<T>[];

/**
 * Letters NFD cannot help with. These are atomic codepoints, not a base letter
 * plus a combining mark, so `normalize('NFD')` leaves them intact and the
 * non-ASCII strip then deletes them outright — "Ødegaard" would fold to
 * "degaard" and never match a search for "odegaard".
 *
 * Every one of these appears in real footballers' names.
 */
const ATOMIC: Record<string, string> = {
  'Ø': 'o', 'ø': 'o',     // Ødegaard
  'Æ': 'ae', 'æ': 'ae',
  'Đ': 'd', 'đ': 'd',     // Đorđević
  'Ð': 'd', 'ð': 'd',
  'Þ': 'th', 'þ': 'th',
  'Ł': 'l', 'ł': 'l',     // Fabiański
  'ß': 'ss',
  'İ': 'i', 'ı': 'i',     // Şahin
  'Œ': 'oe', 'œ': 'oe',
};

const ATOMIC_RE = new RegExp(`[${Object.keys(ATOMIC).join('')}]`, 'g');

const fold = (s: string): string =>
  s.replace(ATOMIC_RE, (c) => ATOMIC[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function buildIndex<T extends Nameable>(players: readonly T[]): SearchIndex<T> {
  return players.map((player) => ({
    player,
    haystack: fold([player.name, ...player.aliases].join(' ')),
  }));
}

/**
 * Returns [] for an empty query, deliberately and permanently.
 *
 * The pool is searched, never listed. Any default result set beside an open
 * slot names valid answers to it — a mockup already shipped with three
 * suggestions, all three valid, the first being the board's deep cut.
 */
export function search<T extends Nameable>(index: SearchIndex<T>, query: string, limit = 12): T[] {
  const q = fold(query);
  if (q.length === 0) return [];

  const out: T[] = [];
  for (const entry of index) {
    if (!entry.haystack.includes(q)) continue;
    out.push(entry.player);
    if (out.length >= limit * 4) break;
  }

  // Prefix matches first. No fame ordering — fame is hidden until placement.
  out.sort((a, b) => {
    const ap = fold(a.name).startsWith(q) ? 0 : 1;
    const bp = fold(b.name).startsWith(q) ? 0 : 1;
    return ap - bp || a.name.localeCompare(b.name);
  });
  return out.slice(0, limit);
}
