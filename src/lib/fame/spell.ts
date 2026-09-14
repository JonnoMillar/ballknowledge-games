import type { ChainMode } from '../chain/types';
import type { Player, Spell } from '../chemistry/types';

/**
 * How well known is the FACT that a player was at a club — as opposed to how
 * well known the player is.
 *
 * Harry Kane is about as famous as a footballer gets, and his 13 league games
 * for Leicester are a fact most fans do not hold. A chain that goes through
 * them deserves the credit a chain through Tottenham does not, and fame alone
 * cannot tell the two apart. So the unit the chain ranks by is the fame of
 * the player scaled by the prominence of the stint that carried the link:
 * `fame × spellWeight`. Everyone in a slot's field is measured the same way
 * against the same neighbours, so this is still a rank within the field —
 * only the ruler has changed.
 */

/**
 * The tuning surface, kept together.
 *
 * SATURATION_APPS: past this many league appearances the stint is common
 * knowledge and earns no further discount. Fifty is about two seasons as a
 * regular.
 *
 * APPS_PER_YEAR: the estimate used when Wikidata has the dates of a spell but
 * not the count. A season as a regular is 30-odd league games; 25 leaves room
 * for the fact that a spell with no count recorded is likelier to be a minor
 * one.
 *
 * FLOOR: a stint never weighs nothing. A player who was on the books and
 * never played still links under the rule the game ships, so the fact is
 * merely very obscure rather than nonexistent.
 */
export const SATURATION_APPS = 50;
export const APPS_PER_YEAR = 25;
export const FLOOR = 0.05;

/**
 * 0.05..1: how much of a stint this was.
 *
 * Missing data is NEUTRAL, deliberately. Around a fifth of spells carry no
 * count and some carry no dates either; if silence meant "obscure", a player
 * whose page nobody has finished would outscore one whose page is complete,
 * and the pool's least-curated corner would become its best answers. Erring
 * harsh keeps the reward honest: you only get it for a stint Wikidata can
 * vouch was short.
 */
export function spellWeight(spell: Spell | undefined): number {
  if (!spell) return 1;
  const [apps, years] = spell;
  const estimate = apps ?? (years !== null ? years * APPS_PER_YEAR : null);
  if (estimate === null) return 1;
  return Math.min(1, Math.max(FLOOR, estimate / SATURATION_APPS));
}

const weightAt = (p: Player, club: string): number => spellWeight(p.spells?.[club]);

/** One neighbour of a slot, and the club the puzzle names for that link, if any. */
export interface Side {
  player: Player;
  club?: string;
}

/**
 * How well known is the route from `p` to one neighbour.
 *
 * A route is as obvious as its EASIEST shared club, and a club is as obvious
 * as its LESS obvious end: Kane at Leicester is a hard fact whether he is the
 * given or the pick, which is what makes the board score the same whichever
 * way round it is set. A prescribed link has one club and no choice. A
 * chemistry-mode link with no shared club at all (same nation, same league)
 * has no stint to be obscure about.
 *
 * Only ever called for a pair that DOES link — the field is built first and
 * this ranks it — so a clubs-mode pair with nothing shared cannot arise, and
 * the fallback there is defensive rather than a rule.
 */
function linkWeight(p: Player, side: Side, mode: ChainMode): number {
  const at = (club: string) => Math.min(weightAt(p, club), weightAt(side.player, club));
  if (side.club !== undefined) return at(side.club);
  const shared = p.clubIds.filter((c) => side.player.clubIds.includes(c));
  if (shared.length === 0) return mode === 'chemistry' ? 1 : FLOOR;
  return Math.max(...shared.map(at));
}

/**
 * The fame of the fact "p links here", given who is either side.
 *
 * A pick with two links is as obscure as its HARDER side — you had to know
 * both, and the one nobody knows is the one that earned the score.
 */
export function factFame(p: Player, sides: readonly Side[], mode: ChainMode): number {
  if (sides.length === 0) return p.fame.value;
  const weight = Math.min(...sides.map((s) => linkWeight(p, s, mode)));
  return p.fame.value * weight;
}
