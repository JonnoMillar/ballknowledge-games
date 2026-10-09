import { MONTH_NAMES } from './dates';
import type { Pick } from './match';

/**
 * The winners table of the English Wikipedia article "Premier League Goal of
 * the Month", as wikitext. A season starts with a row holding
 * "[[2016–17 Premier League]]"; a winner's row has nine cells: month, year,
 * flag, player ({{sortname|First|Last}}, sometimes inside {{nowrap|…}}),
 * team, score just after the goal (the team's first, "'''2'''–1"),
 * opponents, date ("21 August 2016"), ref.
 */
export interface Winner extends Pick { season: number; team: string; date: string }

/** Links to their shown text, no italics or bold, no templates, no cell attributes. */
function clean(cell: string): string {
  return cell
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/^[^|[\]]*=[^|[\]]*\|/, '')
    .trim();
}

/** "21 August 2016" → "2016-08-21", or null. */
export function isoDate(s: string): string | null {
  const m = /^(\d{1,2}) (\w+) (\d{4})$/.exec(s.trim());
  if (!m) return null;
  const month = MONTH_NAMES.findIndex((n) => n.toLowerCase() === m[2]!.toLowerCase());
  return month < 0 ? null : `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

export function parseWinners(wikitext: string): Winner[] {
  const out: Winner[] = [];
  let season: number | null = null;
  for (const row of wikitext.split(/\n\|-/)) {
    const head = /\[\[(\d{4})[–-]\d{2} Premier League\]\]/.exec(row);
    if (head) { season = Number(head[1]); continue; }
    const cells = row.split(/\n\|/).slice(1);
    if (season === null || cells.length < 8 || !/sortname/.test(cells[3]!)) continue;
    const date = isoDate(clean(cells[7]!));
    if (!date) continue;
    const name = /\{\{sortname\|([^|}]*)\|([^|}]*)/.exec(cells[3]!)!;
    const team = clean(cells[4]!);
    const score = /(\d+)\s*[–−-]\s*(\d+)/.exec(clean(cells[5]!));
    out.push({
      season, player: `${name[1]!.trim()} ${name[2]!.trim()}`, team, clubs: [team, clean(cells[6]!)], when: date, date,
      ...(score ? { score: [Number(score[1]), Number(score[2])] as [number, number] } : {}),
    });
  }
  return out;
}
