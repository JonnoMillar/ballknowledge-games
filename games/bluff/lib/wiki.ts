/**
 * Reading lineups out of Wikipedia wikitext.
 *
 * A match is a `{{Football box}}` followed by two lineup tables, one row per
 * player: `|GK ||'''1''' ||{{flagicon|NED}} [[Edwin van der Sar]]`. Final
 * articles have one; World Cup and Euro stage pages have one per match,
 * under a `==Round of 16==` heading and a `===Brazil vs Chile===` one.
 */

export interface RawPlayer { pos: string; title: string; text: string }
export interface RawMatch {
  stage: string | null;
  date: string | null;
  team1: string | null;
  team2: string | null;
  score: string | null;
  xis: [RawPlayer[], RawPlayer[]];
}

/** Templates out, innermost first; a `{{nowrap|...}}` keeps what it wraps. */
function noTemplates(s: string): string {
  let out = s;
  for (let prev = ''; prev !== out;) {
    prev = out;
    out = out.replace(/\{\{\s*nowrap\s*\|([^{}]*)\}\}/gi, '$1').replace(/\{\{[^{}]*\}\}/g, '');
  }
  return out;
}

/** Templates, refs, links and markup out; what a reader would see. */
export function plain(s: string): string {
  return noTemplates(s.replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/<!--[\s\S]*?-->/g, ''))
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The end of the template that opens at `start` (just past its closing braces). */
function templateEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; } else if (text[i] === '}' && text[i + 1] === '}') {
      depth--; i++;
      if (depth === 0) return i + 1;
    }
  }
  return text.length;
}

/** A template's named fields, split only on its own pipes. */
export function fields(template: string): Record<string, string> {
  const body = template.slice(2, -2);
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const out: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) out[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return out;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(v: string): string | null {
  const t = /\{\{\s*start date[^|]*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(v);
  if (t) return `${t[1]}-${pad(+t[2]!)}-${pad(+t[3]!)}`;
  const s = plain(v).toLowerCase();
  const dmy = /(\d{1,2}) ([a-z]+),? (\d{4})/.exec(s);
  if (dmy && MONTHS.includes(dmy[2]!)) return `${dmy[3]}-${pad(MONTHS.indexOf(dmy[2]!) + 1)}-${pad(+dmy[1]!)}`;
  const mdy = /([a-z]+) (\d{1,2}),? (\d{4})/.exec(s);
  if (mdy && MONTHS.includes(mdy[1]!)) return `${mdy[3]}-${pad(MONTHS.indexOf(mdy[1]!) + 1)}-${pad(+mdy[2]!)}`;
  return null;
}

/** A team cell: the link's text, or null for a flag template the heading must name. */
function team(v: string | undefined): string | null {
  if (!v) return null;
  const link = /\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/.exec(v.replace(/\{\{[^{}]*\}\}/g, ''));
  return link ? link[1]!.trim() : null;
}

/** `|GK ||` or `|{{abbr|RB|Right-back}} ||`. */
const ROW = /^\|\s*(?:\{\{abbr\|)?([A-Z]{2,3})(?:\|[^}]*\}\})?\s*\|\|/;

/**
 * Footnotes out, whole: a note inside a row can run over several lines and
 * say "substitution" (2022 World Cup final), which would end the table.
 */
export function dropNotes(text: string): string {
  let out = text.replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '');
  for (let at = out.search(/\{\{\s*(?:refn|efn|notetag)\b/i); at >= 0; at = out.search(/\{\{\s*(?:refn|efn|notetag)\b/i)) {
    out = out.slice(0, at) + out.slice(templateEnd(out, at));
  }
  return out;
}

/** The two XIs after a match box: the first eleven rows of each table, before its substitutes. */
function lineups(text: string): RawPlayer[][] {
  const teams: RawPlayer[][] = [];
  let cur: RawPlayer[] | null = null;
  for (const line of dropNotes(text).split('\n')) {
    if (line.includes('{|')) { cur = []; teams.push(cur); continue; }
    if (!cur) continue;
    if (/Substitut|Manager|Coach/i.test(line)) { cur = null; continue; }
    const m = ROW.exec(line);
    if (!m || cur.length >= 11) continue;
    // The player is the first link outside a template (flags are templates).
    const stripped = noTemplates(line);
    const link = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/.exec(stripped);
    if (link) cur.push({ pos: m[1]!, title: link[1]!.trim(), text: (link[2] ?? link[1]!).trim() });
  }
  return teams.filter((t) => t.length === 11);
}

function lastHeading(text: string, level: number): string | null {
  const eq = '='.repeat(level);
  const re = new RegExp(`^${eq}([^=].*?)${eq}\\s*$`, 'gm');
  let last: string | null = null;
  for (let m = re.exec(text); m; m = re.exec(text)) last = plain(m[1]!);
  return last;
}

/** Every match on a page with both XIs read. */
export function parseMatches(text: string): RawMatch[] {
  const starts: number[] = [];
  // `{{Football box`, `{{footballbox`, `{{#invoke:football box|main`.
  const re = /\{\{\s*(?:#invoke:\s*)?football ?box/gi;
  for (let m = re.exec(text); m; m = re.exec(text)) starts.push(m.index);
  const out: RawMatch[] = [];
  starts.forEach((start, i) => {
    const end = templateEnd(text, start);
    const f = fields(text.slice(start, end));
    const xis = lineups(text.slice(end, starts[i + 1] ?? text.length));
    if (xis.length < 2) return;
    const before = text.slice(0, start);
    const heading = lastHeading(before, 3);
    // National sides are flag templates in the box: the kits after it name
    // them (final articles), or the match's heading does (stage pages).
    const kits = [...text.slice(end, starts[i + 1] ?? text.length).matchAll(/\|\s*title\s*=\s*([^\n]+)/g)].map((k) => plain(k[1]!));
    const [h1, h2] = kits.length >= 2 ? kits : heading ? heading.split(/\s+(?:vs?\.?)\s+/i) : [];
    // Raw, not plain: `{{score link|<anchor>|3–3}}` is a template.
    const score = /(\d+)\s*[–-]\s*(\d+)/.exec(dropNotes(f.score ?? ''));
    out.push({
      stage: lastHeading(before, 2),
      date: f.date ? parseDate(f.date) : null,
      team1: team(f.team1) ?? h1?.trim() ?? null,
      team2: team(f.team2) ?? h2?.trim() ?? null,
      score: score ? `${score[1]}–${score[2]}` : null,
      xis: [xis[0]!, xis[1]!],
    });
  });
  return out;
}
