/**
 * Real transfer fees, for the daily run's report: "About what Newcastle
 * United paid for Harvey Barnes" under the report value (docs/daily-run.md,
 * section 4a). Read from English Wikipedia's "List of English football
 * transfers" pages (CC BY-SA; fees and clubs are facts), kept in
 * data/transfers.json by scripts/run/build-transfers.ts. Pure.
 */
export interface Deal {
  player: string;
  /** Wikidata id of the pool player the row's link matched. */
  qid: string;
  from: string;
  to: string;
  /** Pounds, as the page's sort key states it. */
  fee: number;
  /** YYYY-MM-DD. */
  date: string;
  /** English Wikipedia views over 24 months (data/player-views.json). */
  views: number;
}

/** One row as the page has it, before it is matched to the pool. */
export interface Row { title: string; player: string; from: string; to: string; fee: number; date: string }

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** Wikitext with refs and comments gone, so a cell is one line. */
const clean = (w: string) => w.replace(/<!--[\s\S]*?-->/g, '').replace(/<sup>[\s\S]*?<\/sup>/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');

/** "[[Arsenal F.C.|Arsenal]]" or "[[Arsenal]]" to its shown text; flags and markup dropped. */
function text(cell: string): string {
  return cell
    .replace(/\{\{flagicon\|[^}]*\}\}/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .trim();
}

/** The player's Wikipedia title and shown name, from {{sortname|First|Last|Link|...|dab=}} or a link. */
function player(cell: string): { title: string; name: string } | null {
  const s = cell.match(/\{\{sortname\|([^}]*)\}\}/i);
  if (s) {
    const parts = s[1]!.split('|');
    const pos = parts.filter((p) => !p.includes('='));
    const dab = parts.find((p) => p.startsWith('dab='))?.slice(4);
    const name = `${pos[0] ?? ''} ${pos[1] ?? ''}`.trim();
    const link = pos[2]?.trim();
    return { title: link || (dab ? `${name} (${dab})` : name), name };
  }
  const l = cell.replace(/\{\{flagicon\|[^}]*\}\}/gi, '').match(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/);
  return l ? { title: l[1]!.trim(), name: (l[2] ?? l[1]!).trim() } : null;
}

/** "16 July 2023", or {{dts|format=dmy|2010|2|3}} on the older pages, to "2023-07-16". */
function isoDate(cell: string): string | null {
  const dts = cell.match(/\{\{dts\|(?:[^|}]*=[^|}]*\|)*(\d{4})\|(\d{1,2})\|(\d{1,2})/i);
  if (dts) return `${dts[1]}-${dts[2]!.padStart(2, '0')}-${dts[3]!.padStart(2, '0')}`;
  const m = text(cell).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  const mo = m ? MONTHS.indexOf(m[2]!.toLowerCase()) : -1;
  return m && mo >= 0 ? `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : null;
}

/** A table line's cells: split on "||" outside templates and links ({{sortname|A|B||key}} has one inside). */
function cellsOf(line: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < line.length; i++) {
    const two = line.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; i++; }
    else if (two === '}}' || two === ']]') { depth = Math.max(0, depth - 1); i++; }
    else if (two === '||' && depth === 0) { out.push(line.slice(from, i)); from = i + 2; i++; }
  }
  out.push(line.slice(from));
  return out;
}

/** A cell's rowspan and content: "rowspan="2" | text" has its attributes before a lone "|". */
function spanOf(cell: string): { span: number; content: string } {
  // The first lone "|" outside templates and links ends the attributes, if what is before it is attributes.
  let depth = 0;
  for (let i = 0; i < cell.length; i++) {
    const two = cell.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; i++; continue; }
    if (two === '}}' || two === ']]') { depth = Math.max(0, depth - 1); i++; continue; }
    if (cell[i] === '|' && depth === 0) {
      const attrs = cell.slice(0, i);
      if (!/^\s*(rowspan|colspan|style|align|class|scope)\s*=/i.test(attrs)) break;
      return { span: Number(attrs.match(/rowspan\s*=\s*"?(\d+)/i)?.[1] ?? 1), content: cell.slice(i + 1) };
    }
  }
  return { span: 1, content: cell };
}

/** Pounds from a fee cell: its sort key ({{ntsh|N}}) when there is one, else the text ("£58,000,000", "£58m", "£1.5 million", "£500k"). */
export function poundsOf(cell: string): number {
  if (!cell.includes('£')) return 0;
  const key = cell.match(/\{\{ntsh\|([\d.]+)\}\}/i);
  if (key) return Number(key[1]);
  const m = text(cell).match(/£\s*([\d.,]+)\s*(m|million|k)?/i);
  if (!m) return 0;
  const n = Number(m[1]!.replace(/,/g, ''));
  const unit = m[2]?.toLowerCase();
  return unit === 'k' ? n * 1e3 : unit ? n * 1e6 : n;
}

/**
 * Every priced permanent move on one window's page. Tables are read by
 * their headers (Date, Player or Name, Moving from, Moving to, Fee); a loans
 * table (it has a Start date) is skipped. Any cell can span rows (a date
 * for several moves, a player with a loan return and a sale), so spans are
 * carried down column by column. Only stated fees count: Free, Undisclosed,
 * Loan and the rest have no pounds.
 */
export function parseTransfers(wikitext: string): Row[] {
  const out: Row[] = [];
  for (const table of clean(wikitext).split(/^\{\|/m).slice(1)) {
    const body = table.split(/^\|\}/m)[0]!;
    // Headers one a line ("!Date") or all on one ("! Date !! Name !! ..."); older pages call the player "Name".
    const heads = [...body.matchAll(/^!\s*(.*)$/gm)].flatMap((m) => m[1]!.split('!!')).map((h) => text(h.replace(/^.*\|/, '')).toLowerCase().replace(/^name$/, 'player'));
    const col = (h: string) => heads.indexOf(h);
    if (col('fee') < 0 || col('player') < 0 || col('date') < 0 || heads.includes('start date')) continue;
    // Per column: a spanning cell's content and how many rows below still take it.
    const carry: ({ content: string; left: number } | null)[] = heads.map(() => null);
    for (const raw of body.split(/^\|-.*$/m).slice(1)) {
      const given = raw.split('\n').filter((l) => l.startsWith('|')).flatMap((l) => cellsOf(l.slice(1)));
      if (given.length === 0) continue;
      const row: string[] = [];
      for (let c = 0, k = 0; c < heads.length; c++) {
        const held = carry[c];
        if (held && held.left > 0) { row.push(held.content); held.left--; continue; }
        const cell = given[k++];
        if (cell === undefined) { row.push(''); continue; }
        const { span, content } = spanOf(cell);
        row.push(content);
        carry[c] = span > 1 ? { content, left: span - 1 } : null;
      }
      const date = isoDate(row[col('date')]!);
      const p = player(row[col('player')]!);
      const pounds = poundsOf(row[col('fee')]!);
      if (!date || !p || !(pounds >= 2)) continue;
      out.push({ title: p.title, player: p.name, from: text(row[col('moving from')] ?? ''), to: text(row[col('moving to')] ?? ''), fee: pounds, date });
    }
  }
  return out;
}

/** A deal is near a value within NEAR, close within CLOSE; the player must be known (views) and recent (from SINCE). */
export const NEAR = 0.1;
export const CLOSE = 0.05;
export const TRANSFER_MIN_VIEWS = 500_000;
export const SINCE = '2010-01-01';

/**
 * The deal to set beside a report value (£m), fixed per value: among known,
 * recent deals within NEAR, one within CLOSE beats one further away, then
 * the best-known player, then the nearer fee. With none near, the dearest
 * deal under the value, as "More than". Null below every deal.
 */
export function dealFor(valueM: number, deals: readonly Deal[]): { deal: Deal; more: boolean } | null {
  const v = valueM * 1e6;
  const known = deals.filter((d) => d.views >= TRANSFER_MIN_VIEWS && d.date >= SINCE);
  const off = (d: Deal) => Math.abs(d.fee - v) / v;
  const near = known.filter((d) => off(d) <= NEAR)
    .sort((a, b) => Number(off(b) <= CLOSE) - Number(off(a) <= CLOSE) || b.views - a.views || off(a) - off(b) || a.date.localeCompare(b.date));
  if (near[0]) return { deal: near[0], more: false };
  const under = known.filter((d) => d.fee < v).sort((a, b) => b.fee - a.fee || b.views - a.views);
  return under[0] ? { deal: under[0], more: true } : null;
}

/** "About what Newcastle United paid for Harvey Barnes", or "More than …". */
export const dealLine = ({ deal, more }: { deal: Deal; more: boolean }): string =>
  `${more ? 'More than' : 'About what'} ${deal.to} paid for ${deal.player}`;
