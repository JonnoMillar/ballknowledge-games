/**
 * A season's results to each club's league position, game by game.
 *
 * Position after a club's nth game = the table at the end of that day, every
 * game played so far counted: points (less any deduction already applied),
 * goal difference, goals scored. Pure; the builder feeds it football-data.co.uk
 * CSVs.
 */
export interface Game { date: string; home: string; away: string; hg: number; ag: number }

/**
 * The PL's points deductions, which the results do not carry. Each applies
 * from its date; a negative number gives points back (an appeal).
 * A new one is a line here.
 */
export const DEDUCTIONS: Record<string, { date: string; points: number }[]> = {
  '1996-97|Middlesbrough': [{ date: '1997-01-07', points: 3 }],
  '2009-10|Portsmouth': [{ date: '2010-03-17', points: 9 }],
  '2023-24|Everton': [{ date: '2023-11-17', points: 10 }, { date: '2024-02-26', points: -4 }, { date: '2024-04-08', points: 2 }],
  "2023-24|Nott'm Forest": [{ date: '2024-03-18', points: 4 }],
};

/** dd/mm/yy or dd/mm/yyyy to yyyy-mm-dd. */
function isoDate(d: string): string {
  const [day, month, year] = d.split('/') as [string, string, string];
  const y = year.length === 2 ? `${Number(year) > 50 ? '19' : '20'}${year}` : year;
  return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** football-data.co.uk's E0.csv. Columns move between seasons, so read them by name. */
export function parseResults(csv: string): Game[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const head = lines[0]!.split(',');
  const col = (k: string) => {
    const i = head.indexOf(k);
    if (i < 0) throw new Error(`results CSV has no ${k} column`);
    return i;
  };
  const [date, home, away, hg, ag] = ['Date', 'HomeTeam', 'AwayTeam', 'FTHG', 'FTAG'].map(col) as number[];
  return lines.slice(1)
    .map((l) => l.split(','))
    .filter((r) => r[home!] && r[hg!] !== '' && r[hg!] !== undefined)
    .map((r) => ({ date: isoDate(r[date!]!), home: r[home!]!, away: r[away!]!, hg: Number(r[hg!]), ag: Number(r[ag!]) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function positions(games: readonly Game[], season: string): Record<string, number[]> {
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))].sort();
  const t = Object.fromEntries(teams.map((x) => [x, { pts: 0, gf: 0, ga: 0, n: 0 }]));
  const out: Record<string, number[]> = Object.fromEntries(teams.map((x) => [x, []]));
  const docked = (team: string, upTo: string) =>
    (DEDUCTIONS[`${season}|${team}`] ?? []).filter((d) => d.date <= upTo).reduce((s, d) => s + d.points, 0);
  const dates = [...new Set(games.map((g) => g.date))];
  for (const date of dates) {
    const today = games.filter((g) => g.date === date);
    for (const g of today) {
      const h = t[g.home]!, a = t[g.away]!;
      h.n++; a.n++;
      h.gf += g.hg; h.ga += g.ag; a.gf += g.ag; a.ga += g.hg;
      if (g.hg > g.ag) h.pts += 3; else if (g.hg < g.ag) a.pts += 3; else { h.pts++; a.pts++; }
    }
    const pts = (x: string) => t[x]!.pts - docked(x, date);
    const order = [...teams].sort((x, y) =>
      pts(y) - pts(x) || (t[y]!.gf - t[y]!.ga) - (t[x]!.gf - t[x]!.ga) || t[y]!.gf - t[x]!.gf || x.localeCompare(y));
    for (const g of today) for (const x of [g.home, g.away]) out[x]![t[x]!.n - 1] = order.indexOf(x) + 1;
  }
  return out;
}

/** How far the line has grown at each step: fifths of the season, rounded (38 games: 8, 15, 23, 30, 38). */
export const fifths = (games: number) => [1, 2, 3, 4, 5].map((k) => Math.round((games * k) / 5));

/**
 * The clubs whose lines tangled most with this one, closest first: closest on
 * average across the season, most crossings to break a tie. In a title race
 * the first is the other contender; at the bottom, a fellow struggler.
 */
export function rivals(table: Record<string, number[]>, club: string): string[] {
  const me = table[club]!;
  const near = (other: number[]) => me.reduce((s, p, i) => s + Math.abs(p - other[i]!), 0) / me.length;
  const crossings = (other: number[]) => me.slice(1).filter((p, i) => Math.sign(p - other[i + 1]!) !== Math.sign(me[i]! - other[i]!)).length;
  return Object.keys(table).filter((c) => c !== club)
    .sort((a, b) => near(table[a]!) - near(table[b]!) || crossings(table[b]!) - crossings(table[a]!) || a.localeCompare(b));
}

export const nearestRival = (table: Record<string, number[]>, club: string) => rivals(table, club)[0]!;
