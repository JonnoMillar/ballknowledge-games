import type { Player } from '../chemistry/types';

export interface SearchEntry { player: Player; haystack: string }
export type SearchIndex = SearchEntry[];

/**
 * Letters NFD cannot help with. These are atomic codepoints, not a base letter
 * plus a combining mark, so `normalize('NFD')` leaves them intact and the
 * non-ASCII strip then deletes them outright \u2014 "\u00d8degaard" would fold to
 * "degaard" and never match a search for "odegaard".
 *
 * Every one of these appears in real footballers' names.
 */
const ATOMIC: Record<string, string> = {
  '\u00d8': 'o', '\u00f8': 'o',     // \u00d8degaard
  '\u00c6': 'ae', '\u00e6': 'ae',
  '\u0110': 'd', '\u0111': 'd',     // \u0110or\u0111evi\u0107
  '\u00d0': 'd', '\u00f0': 'd',
  '\u00de': 'th', '\u00fe': 'th',
  '\u0141': 'l', '\u0142': 'l',     // Fabia\u0144ski
  '\u00df': 'ss',
  '\u0130': 'i', '\u0131': 'i',     // \u015eahin
  '\u0152': 'oe', '\u0153': 'oe',
};

const ATOMIC_RE = new RegExp(`[${Object.keys(ATOMIC).join('')}]`, 'g');

const fold = (s: string): string =>
  s.replace(ATOMIC_RE, (c) => ATOMIC[c] ?? c)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function buildIndex(players: readonly Player[]): SearchIndex {
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
export function search(index: SearchIndex, query: string, limit = 12): Player[] {
  const q = fold(query);
  if (q.length === 0) return [];

  const out: Player[] = [];
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
