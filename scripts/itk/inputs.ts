import { readFileSync, existsSync } from 'node:fs';
import type { Inputs } from '../../games/itk/lib/world';

/** The committed files the ITK generator reads. No network. */
export const COUNTRIES = 'games/itk/data/club-countries.json';

export function readInputs(): Inputs {
  const json = <T>(f: string): T => JSON.parse(readFileSync(f, 'utf8')) as T;
  return {
    pool: json('data/pool.json'),
    careers: json<{ players: Inputs['careers'] }>('data/careers.json').players,
    clubs: json('data/clubs.json'),
    views: json('games/itk/data/enwiki-views.json'),
    redirects: json('games/itk/data/enwiki-views.redirects.json'),
    countries: existsSync(COUNTRIES) ? json(COUNTRIES) : {},
    portraits: existsSync('data/portraits.json') ? json('data/portraits.json') : {},
  };
}
