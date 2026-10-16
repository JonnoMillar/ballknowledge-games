import type { Match, Options } from './match';

/**
 * The phone's memory: the match in progress, and the last names and options
 * used. Shared by the front page (which starts a match) and the match page
 * (which plays it), so a refresh never loses the lives.
 */

const MATCH_KEY = 'bluff.match.v1';
const SAVED_KEY = 'bluff.saved.v1';

export interface Saved { names: string[]; options: Options | null }

export function readMatch(): Match | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Match;
    return Array.isArray(m.players) && m.players.length >= 2 && m.round ? m : null;
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
    const raw = localStorage.getItem(SAVED_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch { /* fresh */ }
  return { names: [], options: null };
}

export function writeSaved(s: Saved) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(s)); } catch { /* fine */ }
}
