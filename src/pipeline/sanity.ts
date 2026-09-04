/**
 * Name-sanity heuristics.
 *
 * Wikidata is community-edited, and vandalised labels are live right now — the
 * pool contains "Guido Carrillo EL GOAT" (Q3779221). Spec 8.2 requires pinned
 * snapshots reviewed by diff; this is the automated half of that review.
 *
 * Deliberately FLAGS rather than removes. "Guido Carrillo EL GOAT" is a real
 * player with a defaced name — dropping him loses a legitimate player, so the
 * right response is a manual name override, not deletion.
 */

// MEASURED: this list must NOT contain `king` or `best`. Ledley King, Joshua
// King, Andy King, Joel King and Leon Best are all real players in the pool,
// and George Best is the obvious cautionary case. Surnames that double as
// praise words belong nowhere near a vandalism heuristic. `rip` and `sus` are
// out for the same reason — too short and too name-like to be safe.
const MEME_WORDS = /\b(goat|legend|noob|lol|xd|omg)\b/i;
const SHOUTING = /\b[A-Z]{3,}\b/;
const DIGITS = /\d/;
const PUNCT_SPAM = /[!?]{1,}|[<>{}[\]@#$%^*=_|\~`]/;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export type NameFlag = 'meme' | 'shouting' | 'digits' | 'punctuation' | 'emoji' | 'length';

/** Returns the reason a name looks defaced, or null if it looks fine. */
export function suspiciousName(name: string): NameFlag | null {
  if (EMOJI.test(name)) return 'emoji';
  if (MEME_WORDS.test(name)) return 'meme';
  if (DIGITS.test(name)) return 'digits';
  if (PUNCT_SPAM.test(name)) return 'punctuation';
  if (SHOUTING.test(name)) return 'shouting';
  if (name.length > 60) return 'length';
  return null;
}
