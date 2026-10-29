import { readFile } from 'node:fs/promises';
import { portraitUrls, type PortraitRecord } from '../lib/portraits';
import { loadData } from './board';

export interface CreditRow {
  player: string;
  file: string;
  artist: string;
  licence: string;
  licenceUrl?: string;
}

interface Credit { artist: string; licence: string; licenceUrl?: string }


/** A–Z by the name's first letter, accents folded; anything else under '#'. */
export const letterOf = (name: string) => {
  const c = name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
};

let rows: Promise<CreditRow[]> | null = null;

/**
 * Every Commons photo a public page can show, with its author and licence.
 * Built with portraitUrls in its public mode, the same call scripts/fetch-credits
 * used, so the page credits exactly what is on screen.
 */
function allRows(): Promise<CreditRow[]> {
  rows ??= (async () => {
    const { byId } = await loadData();
    const portraits = JSON.parse(await readFile('data/portraits.json', 'utf8')) as Record<string, PortraitRecord>;
    const credits = JSON.parse(await readFile('data/credits.json', 'utf8').catch(() => '{}')) as Record<string, Credit | null>;
    const out: CreditRow[] = [];
    for (const id of Object.keys(portraitUrls(portraits))) {
      // Our own cutouts name the Commons file they came from.
      const file = portraits[id]?.source === 'processed' ? portraits[id]!.file : undefined;
      if (!file) continue;
      const c = credits[file];
      const player = byId.get(id)?.name;
      if (!c || !player) continue;
      out.push({ player, file, ...c });
    }
    return out.sort((a, b) => a.player.localeCompare(b.player, 'en'));
  })();
  return rows;
}

/** One letter's rows, and how many each letter holds. Small on purpose. */
export async function creditsFor(letter: string): Promise<{ rows: CreditRow[]; counts: Record<string, number>; total: number }> {
  const all = await allRows();
  const counts: Record<string, number> = {};
  for (const r of all) counts[letterOf(r.player)] = (counts[letterOf(r.player)] ?? 0) + 1;
  return { rows: all.filter((r) => letterOf(r.player) === letter), counts, total: all.length };
}

/** The photo the kit card's figure (public/kit-figure.png) was cut from. */
export const KIT_FIGURE_FILE = 'Thiago Silva (cropped).jpg';

export async function kitFigureCredit(): Promise<(Credit & { file: string }) | null> {
  const credits = JSON.parse(await readFile('data/credits.json', 'utf8').catch(() => '{}')) as Record<string, Credit | null>;
  const c = credits[KIT_FIGURE_FILE];
  return c ? { file: KIT_FIGURE_FILE, ...c } : null;
}
