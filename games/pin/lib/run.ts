import { seeded } from '../../../src/lib/seeded';
import { lazyScore } from './score';
import type { Goals } from './types';

/**
 * Log the shot: the daily run's three goals a day (docs/daily-run.md,
 * section 10). A committed schedule, topped up by a cron, like the other
 * dailies: past days freeze, reuse needs history.
 *
 * Rules, each a named constant:
 * - RUN_PIN_GOALS a day, none back within RUN_PIN_GAP days;
 * - at most RUN_PIN_CLASSICS classic a day;
 * - at least one goal from the last RUN_PIN_RECENT days (this season's
 *   preferred), so the run is about football the 16 to 26s watched;
 * - never two from one match;
 * - fair: the lazy pin (all on the penalty spot) scores under RUN_PIN_LAZY;
 * - memorable: from RUN_PIN_FAME_FROM, a recent goal's scorer has at least
 *   RUN_PIN_MIN_VIEWS Wikipedia views a year (Jonno, 2026-11-16: Cajuste for
 *   Ipswich v Forest, "nobody remembers that"). Classics are picked by hand.
 * When the goals run thin (summer brings none for ten weeks), the reuse gap
 * shrinks by itself, a step at a time down to RUN_PIN_GAP_MIN, and the day
 * records the gap it was built to. No one has to step in. Below that it
 * throws, so the cron goes red.
 */
export const RUN_PIN_START = '2026-11-13';
export const RUN_PIN_GOALS = 3;
export const RUN_PIN_GAP = 60;
export const RUN_PIN_GAP_MIN = 30;
const GAP_STEP = 10;
export const RUN_PIN_CLASSICS = 1;
export const RUN_PIN_RECENT = 365;
export const RUN_PIN_LAZY = 60;
export const RUN_PIN_FAME_FROM = '2026-11-17';
export const RUN_PIN_MIN_VIEWS = 400_000;
/** Top up when fewer than MIN_AHEAD days are left, to TOP_UP ahead. */
export const MIN_AHEAD = 14;
export const TOP_UP = 28;

/** `gap` is the reuse gap the day was built to, when it is under RUN_PIN_GAP. */
export interface RunPinDay { date: string; goals: string[]; gap?: number }

export const addDays = (date: string, n: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const between = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** The season a date falls in starts on 1 August. */
export const seasonStart = (date: string): string => `${Number(date.slice(0, 4)) - (date.slice(5, 7) < '08' ? 1 : 0)}-08-01`;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * The goals memorable enough for the run: classics, and recent goals whose
 * scorer is found in the pool (by name or alias, the most viewed on a clash)
 * with RUN_PIN_MIN_VIEWS views. A scorer we cannot find is left out.
 */
export function memorable(goals: Goals, pool: readonly { id: string; name: string; aliases?: string[] }[], views: Readonly<Record<string, number>>): Set<string> {
  const byName = new Map<string, number>();
  for (const p of pool) for (const n of [p.name, ...(p.aliases ?? [])]) byName.set(norm(n), Math.max(byName.get(norm(n)) ?? 0, views[p.id] ?? 0));
  return new Set(Object.keys(goals).filter((s) => goals[s]!.kind === 'classic' || (byName.get(norm(goals[s]!.scorer)) ?? 0) >= RUN_PIN_MIN_VIEWS));
}

/** What is wrong with one day, given the days before it. Empty when it keeps every promise. `ok`: the memorable goals (when given, enforced from RUN_PIN_FAME_FROM). */
export function problems(goals: Goals, day: RunPinDay, before: readonly RunPinDay[], ok?: ReadonlySet<string>): string[] {
  const out: string[] = [];
  if (ok && day.date >= RUN_PIN_FAME_FROM) for (const s of day.goals) if (goals[s] && !ok.has(s)) out.push(`${day.date}: ${goals[s]!.scorer} (${s}) is not memorable enough`);
  const gs = day.goals.map((s) => goals[s]);
  if (day.goals.length !== RUN_PIN_GOALS) out.push(`${day.date}: ${day.goals.length} goals`);
  if (gs.some((g) => !g)) return [...out, `${day.date}: unknown goal`];
  if (gs.some((g) => g!.date >= day.date)) out.push(`${day.date}: a goal not yet scored`);
  if (gs.filter((g) => g!.kind === 'classic').length > RUN_PIN_CLASSICS) out.push(`${day.date}: too many classics`);
  if (!gs.some((g) => between(g!.date, day.date) <= RUN_PIN_RECENT)) out.push(`${day.date}: nothing recent`);
  if (new Set(gs.map((g) => `${g!.match}|${g!.date}`)).size !== gs.length) out.push(`${day.date}: two from one match`);
  if (lazyScore(gs.map((g) => g!.at)) >= RUN_PIN_LAZY) out.push(`${day.date}: the lazy pin scores ${lazyScore(gs.map((g) => g!.at))}`);
  const gap = day.gap ?? RUN_PIN_GAP;
  if (gap < RUN_PIN_GAP_MIN) out.push(`${day.date}: gap ${gap} under ${RUN_PIN_GAP_MIN}`);
  const recent = new Set(before.filter((d) => between(d.date, day.date) < gap).flatMap((d) => d.goals));
  for (const s of day.goals) if (recent.has(s)) out.push(`${day.date}: ${s} back within ${gap} days`);
  return out;
}

/** One day's goals at the widest gap that fits, or throws if none does. */
export function composeDay(goals: Goals, date: string, before: readonly RunPinDay[], ok?: ReadonlySet<string>): RunPinDay {
  for (let gap = RUN_PIN_GAP; gap >= RUN_PIN_GAP_MIN; gap -= GAP_STEP) {
    const day = atGap(goals, date, before, gap, ok);
    if (day) return gap < RUN_PIN_GAP ? { ...day, gap } : day;
  }
  throw new Error(`run pin: no three goals fit ${date}, even ${RUN_PIN_GAP_MIN} days apart`);
}

function atGap(goals: Goals, date: string, before: readonly RunPinDay[], gap: number, ok?: ReadonlySet<string>): RunPinDay | null {
  const rand = seeded(`run-pin:${date}`);
  const lastUsed = new Map<string, string>();
  for (const d of before) for (const s of d.goals) lastUsed.set(s, d.date);
  const free = Object.keys(goals).filter((s) => goals[s]!.date < date && (!ok || date < RUN_PIN_FAME_FROM || ok.has(s)) && (!lastUsed.has(s) || between(lastUsed.get(s)!, date) >= gap));
  // Never-used first, then longest unused; random within that order.
  const order = free.map((s) => ({ s, k: lastUsed.get(s) ?? '0000', r: rand() })).sort((a, b) => a.k.localeCompare(b.k) || a.r - b.r).map((x) => x.s);
  const season = seasonStart(date);
  const anchors = [
    ...order.filter((s) => goals[s]!.date >= season),
    ...order.filter((s) => goals[s]!.date < season && between(goals[s]!.date, date) <= RUN_PIN_RECENT),
  ];
  for (const a of anchors) {
    // Fillers spend older goals first: recent ones are scarce, and each day needs one.
    const isRecent = (s: string) => between(goals[s]!.date, date) <= RUN_PIN_RECENT;
    const rest = [...order.filter((s) => s !== a && !isRecent(s)), ...order.filter((s) => s !== a && isRecent(s))];
    for (let i = 0; i < rest.length; i++) {
      for (let j = i + 1; j < rest.length; j++) {
        const day: RunPinDay = { date, goals: [a, rest[i]!, rest[j]!], ...(gap < RUN_PIN_GAP ? { gap } : {}) };
        if (problems(goals, day, before, ok).length === 0) {
          // The anchor need not come first on screen.
          const k = Math.floor(rand() * day.goals.length);
          [day.goals[0], day.goals[k]] = [day.goals[k]!, day.goals[0]!];
          return day;
        }
      }
    }
  }
  return null;
}

/** The schedule from RUN_PIN_START through `through`, keeping the days already there. */
export function extend(goals: Goals, days: readonly RunPinDay[], through: string, ok?: ReadonlySet<string>): RunPinDay[] {
  const out = [...days];
  for (let d = out.length ? addDays(out[out.length - 1]!.date, 1) : RUN_PIN_START; d <= through; d = addDays(d, 1)) out.push(composeDay(goals, d, out, ok));
  return out;
}

/**
 * The run's line for a goal: when and why it mattered, never how or from
 * where (Jonno, 2026-11-16: "header" and "from a corner" gave the spot
 * away). Recent goals keep their minute and score; classics have their own
 * line here, written for the run. The packs keep the full line.
 */
export const RUN_CLUES: Readonly<Record<string, string>> = {
  'maradona-hand': 'The Hand of God, early in the second half of the quarter-final.',
  'maradona-solo': 'Four minutes after the Hand of God: the Goal of the Century.',
  'pele-1970': 'The opener in the 1970 final.',
  'carlos-alberto-1970': 'The fourth in the final, to finish the team goal of all team goals.',
  'bale-overhead-2018': 'Two minutes after coming off the bench, to put Madrid ahead in the final.',
  'bale-strike-2018': 'His second of the final, to settle it with seven minutes left.',
  'messi-header-2009': 'The second in the final in Rome, to seal Barcelona\'s treble.',
  'gerrard-istanbul': 'The first of six minutes that turned a final from 3–0 down at half-time.',
  'smicer-istanbul': 'Two minutes after the first: 3–2, and the comeback is on.',
  'ramos-lisbon': 'In stoppage time, with Atlético a minute from the trophy.',
  'messi-wembley-2011': 'To retake the lead in the final at Wembley.',
  'drogba-munich': 'Two minutes from defeat, in Bayern\'s own stadium.',
  'robben-wembley': 'The late winner in an all-German final.',
  'bellingham-slovakia': 'In the fifth minute of stoppage time, with England a minute from going out.',
  'yamal-france': 'A 16-year-old\'s equaliser in the semi-final.',
  'watkins-netherlands': 'Off the bench, in the last minute, to reach the final.',
  'saka-switzerland': 'The equaliser in the quarter-final, with ten minutes left.',
  'schick-scotland': 'His second of the game: the goal of the tournament.',
  'shaw-final': 'A first international goal, in the second minute of the final.',
  'pavard-argentina': 'The equaliser against Argentina: the goal of the tournament.',
  'trippier-croatia': 'In the fifth minute of a World Cup semi-final.',
  'ronaldo-spain': 'Two minutes from time, to complete a hat-trick against Spain.',
  'vardy-manutd': 'A goal in an 11th Premier League game in a row: a record.',
  'vardy-liverpool': 'The opener against Liverpool, in the season Leicester won the league.',
  'ronaldinho-bernabeu': 'His second at the Bernabéu, the night the home fans stood to applaud.',
  'messi-bernabeu-2017': 'The stoppage-time winner, then the shirt held up to the Bernabéu.',
  'richarlison-serbia': 'His second of Brazil\'s opener: the goal of the tournament.',
  'aldawsari-argentina': 'The winner in the biggest upset of the tournament.',
  'enzo-mexico': 'To make it 2–0 and settle Argentina\'s nerves.',
  'messi-mexico': 'To break the deadlock with Argentina\'s tournament on the line.',
  'dimaria-final-2022': '2–0 in the final, at the end of a sweeping counter.',
  'mbappe-volley-final': '97 seconds after his first, to make it 2–2 in the final.',
  'henry-manutd-2004': 'Against United at Highbury, in the unbeaten season.',
  'henry-liverpool-2004': 'Against Liverpool, on the day the season was saved.',
  'pires-anfield-2003': 'The winner at Anfield.',
  'edu-chelsea-2003': 'Early on, against the new-money Chelsea.',
  'vieira-spurs-2004': 'The opener at White Hart Lane, on the day the title was won.',
  'vieira-leicester-2004': 'The winner on the final day, completing a season unbeaten.',
  'russo-backheel': 'The third in the semi-final against Sweden.',
  'toone-final': 'Off the bench, the opener in the final.',
  'kelly-final': 'In extra time of the final: the winner.',
  'stanway-spain': 'In extra time, to win the quarter-final.',
  'james-china': 'In a 6–1 win at the World Cup.',
  'agyemang-italy': 'A teenager off the bench, equalising in stoppage time of the semi-final.',
};

/** "A shot after a dribble, in the 89th minute, to make it 1–1." to "In the 89th minute, to make it 1–1." */
export function runLine(slug: string, g: { line: string; kind: 'classic' | 'recent' }): string {
  if (RUN_CLUES[slug]) return RUN_CLUES[slug]!;
  const cut = /^A [^,]*, (in the .*)$/i.exec(g.line);
  return cut ? cut[1]!.charAt(0).toUpperCase() + cut[1]!.slice(1) : g.line;
}
