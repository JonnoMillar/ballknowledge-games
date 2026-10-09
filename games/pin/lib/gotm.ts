import { monthName, seasonOf, seasonTag } from './dates';
import type { Pick } from './match';

/**
 * The Premier League's Goal of the Month shortlist page, read as HTML. The
 * markup around each nominee varies month to month (bold in different
 * places), so only two things are relied on: a link to the player's page
 * and, after it, a link to the match whose path is "<home>-vs-<away>".
 */

export const gotmUrl = (ym: string): string =>
  `https://www.premierleague.com/en/awards/goal-of-the-month/${seasonTag(seasonOf(`${ym}-01`))}/${monthName(ym).toLowerCase()}`;

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" };
const text = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? m).replace(/\s+/g, ' ').trim();

/** The nominees in page order, as picks in the given month (YYYY-MM). Empty when the page lists none. */
export function parseShortlist(html: string, ym: string): Pick[] {
  const out: Pick[] = [];
  const player = /<a href="[^"]*\/players\/\d+\/[^"/]+\/overview">([\s\S]*?)<\/a>/g;
  for (let m = player.exec(html); m; m = player.exec(html)) {
    const match = /\/match\/\d+\/([a-z0-9-]+?)-vs-([a-z0-9-]+?)(?:[/?"])/.exec(html.slice(player.lastIndex));
    if (!match) continue;
    out.push({ player: text(m[1]!), clubs: [match[1]!.replace(/-/g, ' '), match[2]!.replace(/-/g, ' ')], when: ym });
  }
  return out;
}

/**
 * The months to try on a given day: last month, and the month before while
 * its pack is still missing. Older months are left alone.
 */
export function monthsDue(today: string, have: (ym: string) => boolean): string[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const back = (k: number) => {
    const d = new Date(Date.UTC(y, m - 1 - k, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  return [back(1), back(2)].filter((ym) => !have(ym));
}
