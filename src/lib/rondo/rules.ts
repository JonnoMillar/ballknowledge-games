/**
 * Rondo: the rule.
 *
 * Someone is on the ball. A pass names a player who shared a club with
 * them. Every club the pass goes through burns for the rest of the ball;
 * no club twice, no player twice. A pass that nobody in the album could
 * take on is a dead end, which is the passer's loss — the bust.
 *
 * Pure. The server feeds it the pool; the tests feed it six players.
 */

/** The least a player needs to be passed to. `Player` satisfies it. */
export interface RondoFacts {
  id: string;
  name: string;
  clubIds: readonly string[];
}

/** The ball as the client carries it between passes. */
export interface Ball {
  /** The player on the ball. */
  carrier: string;
  /** Clubs already passed through this ball. */
  burnt: readonly string[];
  /** Everyone named this ball, the starter first. */
  named: readonly string[];
}

/** `time` is the client's word for a forfeit the clock made; the server only ever says `forfeit`. */
export type LossReason = 'no-link' | 'repeat' | 'dead-end' | 'unknown' | 'forfeit' | 'time';

export type Verdict =
  | { ok: true; via: string[]; burnt: string[] }
  | { ok: false; reason: LossReason; open: string[]; via?: string[] };

export type ClubIndex = ReadonlyMap<string, readonly RondoFacts[]>;

export function buildClubIndex(players: readonly RondoFacts[]): ClubIndex {
  const out = new Map<string, RondoFacts[]>();
  for (const p of players) for (const c of p.clubIds) {
    const list = out.get(c) ?? [];
    list.push(p);
    out.set(c, list);
  }
  return out;
}

/** The carrier's clubs that have not burnt, in the carrier's own order. */
export function openClubs(carrier: RondoFacts, burnt: readonly string[]): string[] {
  const gone = new Set(burnt);
  return carrier.clubIds.filter((c) => !gone.has(c));
}

/**
 * Whether anyone not yet named could take the ball on from `carrier`,
 * given what has burnt. The dead-end check.
 */
export function receivable(byClub: ClubIndex, carrier: RondoFacts, burnt: readonly string[], named: readonly string[]): boolean {
  const used = new Set(named);
  used.add(carrier.id);
  for (const c of openClubs(carrier, burnt)) {
    for (const q of byClub.get(c) ?? []) if (!used.has(q.id)) return true;
  }
  return false;
}

/**
 * Judge one pass. `target` null is a forfeit: the clock, or "I've got
 * nothing". On a loss the verdict carries what was open on the carrier,
 * which is the reveal.
 */
export function judgePass(
  byId: ReadonlyMap<string, RondoFacts>,
  byClub: ClubIndex,
  ball: Ball,
  target: string | null,
): Verdict {
  const carrier = byId.get(ball.carrier);
  if (!carrier) return { ok: false, reason: 'unknown', open: [] };
  const open = openClubs(carrier, ball.burnt);

  if (target === null) return { ok: false, reason: 'forfeit', open };
  const to = byId.get(target);
  if (!to) return { ok: false, reason: 'unknown', open };
  if (ball.named.includes(target) || target === ball.carrier) return { ok: false, reason: 'repeat', open };

  const via = open.filter((c) => to.clubIds.includes(c));
  if (via.length === 0) return { ok: false, reason: 'no-link', open };

  const burnt = [...ball.burnt, ...via];
  const named = [...ball.named, ball.carrier, target];
  if (!receivable(byClub, to, burnt, named)) return { ok: false, reason: 'dead-end', via, open };

  return { ok: true, via, burnt };
}
