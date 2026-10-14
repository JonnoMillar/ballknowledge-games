import type { Clock, Match } from './match';

/**
 * The phone's memory: the match in progress, and the last names used.
 * Shared by the front page (which starts a match) and the match page (which
 * plays it), so a refresh or a knocked phone never loses the score.
 */

const MATCH_KEY = 'rondo.match.v1';
const NAMES_KEY = 'rondo.names.v1';

export interface Saved { names: string[]; clock: Clock }

export function readMatch(): Match | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Match;
    return Array.isArray(m.players) && m.players.length >= 2 ? m : null;
  } catch { return null; }
}

export function writeMatch(m: Match | null) {
  try {
    if (m) localStorage.setItem(MATCH_KEY, JSON.stringify(m));
    else localStorage.removeItem(MATCH_KEY);
  } catch { /* a full or private store; the game still plays */ }
}

export function readSaved(): Saved {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch { /* fresh */ }
  return { names: [], clock: 30 };
}

export function writeSaved(s: Saved) {
  try { localStorage.setItem(NAMES_KEY, JSON.stringify(s)); } catch { /* fine */ }
}
