import { median, RULES, type Career, type Stop, type World } from './world';

/**
 * The fakes a career could carry: the best of each kind.
 *
 * A fake either stands in for a real stop (a swap, keeping its year and loan
 * tag) or is a move inserted between two real ones. The kind is what makes
 * a day varied: an early loan, a mid-career move, a late one, one spell of a
 * club he had twice, or an insert.
 */
export type Kind = 'loan' | 'mid' | 'late' | 'return' | 'insert';
export const KINDS: readonly Kind[] = ['loan', 'mid', 'late', 'return', 'insert'];

export interface Fake {
  mode: 'swap' | 'insert';
  kind: Kind;
  /** Where the fake sits in the trail the player sees. */
  index: number;
  club: string;
  year: number;
  loan: boolean;
  /** The club a swap covered. */
  real?: string;
  score: number;
  /** Real players moved from the club before it and to the club after it. */
  both: boolean;
}

/** Chance an insert is shown as a loan. */
const LOAN_RATE = 0.15;

/**
 * @param exclude clubs that must not be the fake: this player's earlier fakes, and recent days' fakes.
 * @param rand the day's seeded generator; only the insert's loan tag draws from it.
 */
export function fakeOptions(w: World, career: Career, exclude: ReadonlySet<string>, rand: () => number): Map<Kind, Fake> {
  const st = career.stops;
  const n = st.length;
  const apps = new Map<string, number>(), count = new Map<string, number>();
  for (const s of st) { apps.set(s.q, (apps.get(s.q) ?? 0) + s.apps); count.set(s.q, (count.get(s.q) ?? 0) + 1); }
  const signature = [...apps].sort((a, b) => b[1] - a[1])[0]![0];
  const own = w.owned(career.id);
  // No fake bigger than the career's median club: that move would have been news.
  const cap = median(st.map((s) => w.clubViews(s.q)));
  const marquee = (s: Stop | undefined) => !!s && w.clubViews(s.q) >= RULES.marquee;
  const fits = (c: string) => !own.has(c) && !exclude.has(c) && w.clubViews(c) <= cap && !w.isReserve(c) && !w.giants.has(c)
    && w.known(c) && !!w.clubs[c]?.crestUrl && (w.size.get(c) ?? 0) >= RULES.clubSize;

  /** How well the fake sits between its neighbours: real moves both ways, at the same level. */
  const score = (c: string, A: Stop | undefined, B: Stop | undefined, y: number, ref: number | null) => {
    const sc = w.strength(c, y);
    if (sc == null) return null;
    const sr = ref ?? sc;
    const fa = A ? (w.out.get(A.q)?.get(c) ?? 0) : 0, fb = B ? (w.inn.get(B.q)?.get(c) ?? 0) : 0;
    if (fa + fb < 2) return null;
    const tier = 1 - Math.min(1, Math.abs(sc - sr) / Math.max(sc, sr, 1));
    return { score: (fa + fb) / Math.sqrt(w.size.get(c)!) * tier * tier * (fa > 0 && fb > 0 ? 2 : 1), both: fa > 0 && fb > 0 };
  };

  const opts: Fake[] = [];
  for (let i = 1; i < n; i++) {
    const X = st[i]!, A = st[i - 1]!, B = st[i + 1];
    // Never the club he is known for, a famous club, or a real spell: fans remember those.
    if (X.q === signature || marquee(X) || (apps.get(X.q) ?? 0) >= RULES.bigSpell) continue;
    // Never between two marquee moves: the fake would be the only thing not on the news.
    if (marquee(A) && marquee(B)) continue;
    // The photo was taken somewhere: never swap out that spell.
    const py = career.photoYear;
    if (py != null && py >= X.from && (!B || py < B.from)) continue;
    const kind: Kind = count.get(X.q)! > 1 || X.ret ? 'return' : X.loan ? 'loan' : i >= n * 0.7 ? 'late' : 'mid';
    const xv = w.clubViews(X.q);
    for (const c of new Set([...(w.out.get(A.q)?.keys() ?? []), ...(B ? w.inn.get(B.q)?.keys() ?? [] : [])])) {
      if (!fits(c) || !w.activeAt(c, X.from)) continue;
      const v = w.clubViews(c);
      if (xv > 0 && (v > xv * 3 || v < xv / 3)) continue;
      const r = score(c, A, B, X.from, w.strength(X.q, X.from));
      if (r) opts.push({ mode: 'swap', kind, index: i, club: c, year: X.from, loan: X.loan, real: X.q, ...r });
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const A = st[i]!, B = st[i + 1]!;
    if (marquee(A) && marquee(B)) continue;
    const y = B.from - A.from >= 2 ? A.from + 1 + Math.floor((B.from - A.from - 1) / 2) : B.from;
    for (const c of new Set([...(w.out.get(A.q)?.keys() ?? []), ...(w.inn.get(B.q)?.keys() ?? [])])) {
      if (!fits(c) || !w.activeAt(c, y)) continue;
      const sa = w.strength(A.q, A.from), sb = w.strength(B.q, B.from);
      const r = score(c, A, B, y, sa != null && sb != null ? (sa + sb) / 2 : null);
      if (r) opts.push({ mode: 'insert', kind: 'insert', index: i + 1, club: c, year: y, loan: false, ...r });
    }
  }
  const best = new Map<Kind, Fake>();
  for (const o of opts.sort((a, b) => b.score - a.score || a.club.localeCompare(b.club) || a.index - b.index)) if (!best.has(o.kind)) best.set(o.kind, o);
  // Drawn only for the insert that is kept, so the generator's other choices do not shift the draw.
  const ins = best.get('insert');
  if (ins) ins.loan = rand() < LOAN_RATE;
  return best;
}
