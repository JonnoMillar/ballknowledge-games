/** Reading and writing Pitch pin's data files, for the scripts. Paths are relative to the project root. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Goals, Pack } from '../games/pin/lib/types';

export const GOALS = 'games/pin/data/goals.json';
export const PACKS = 'games/pin/data/packs';
export const CHECK = 'games/pin/data/check.json';

export const readGoals = (): Goals => JSON.parse(readFileSync(GOALS, 'utf8')) as Goals;
export const writeGoals = (g: Goals): void => writeFileSync(GOALS, `${JSON.stringify(g, null, 2)}\n`);

export const packExists = (id: string): boolean => existsSync(`${PACKS}/${id}.json`);
export const readPacks = (): Pack[] =>
  readdirSync(PACKS).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${PACKS}/${f}`, 'utf8')) as Pack);

/** Pack files keep one key order, so a diff shows only what changed. */
export function writePack(p: Pack): void {
  const { id, kind, title, subtitle, season, published, goals } = p;
  const out = { id, kind, title, subtitle, ...(season ? { season } : {}), published, goals };
  writeFileSync(`${PACKS}/${id}.json`, `${JSON.stringify(out, null, 2)}\n`);
}

/** `--name value` from the command line. */
export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
