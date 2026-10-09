import { daysBetween } from './dates';
import type { Pack } from './types';

/** The packs football's calendar brings. Only these are ever New. */
const FRESH = new Set(['round', 'month']);

/** New for seven days from the day it was published. */
export function isNew(p: Pack, today: string): boolean {
  if (!FRESH.has(p.kind)) return false;
  const age = daysBetween(p.published, today);
  return age >= 0 && age < 7;
}

const newestFirst = (a: Pack, b: Pack) => b.published.localeCompare(a.published) || b.id.localeCompare(a.id);

/**
 * The library in order. This season: round and month packs of the latest
 * season, newest first. Archive: season packs (newest season first), club
 * packs (A to Z), classic packs (oldest first), then round and month packs
 * of earlier seasons (newest first). An empty shelf is left out.
 */
export function shelve(packs: readonly Pack[]): { title: string; packs: Pack[] }[] {
  const fresh = packs.filter((p) => FRESH.has(p.kind));
  const latest = fresh.reduce<string | null>((m, p) => (p.season && (!m || p.season > m) ? p.season : m), null);
  const of = (kind: string) => packs.filter((p) => p.kind === kind);
  const archive = [
    ...of('season').sort((a, b) => (b.season ?? '').localeCompare(a.season ?? '')),
    ...of('club').sort((a, b) => a.title.localeCompare(b.title)),
    ...of('classic').sort((a, b) => a.published.localeCompare(b.published) || a.id.localeCompare(b.id)),
    ...fresh.filter((p) => p.season !== latest).sort(newestFirst),
  ];
  return [
    { title: 'This season', packs: fresh.filter((p) => p.season === latest).sort(newestFirst) },
    { title: 'Archive', packs: archive },
  ].filter((s) => s.packs.length);
}
