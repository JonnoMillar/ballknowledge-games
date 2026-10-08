/**
 * The line under a goal. It says what kind of goal it was, never where it
 * was struck from: the position is the answer.
 */
const BANNED = new Set([
  'yard', 'yards', 'metre', 'metres', 'meter', 'meters', 'edge', 'box', 'area', 'post',
  'left', 'right', 'centre', 'center', 'halfway', 'distance', 'range', 'close', 'far',
  'long', 'near', 'angle', 'six', 'wide', 'outside', 'inside',
]);
/** The copy is gender-neutral: the classics include women's goals. */
const GENDERED = new Set(['he', 'his', 'him']);

/** The words in a line that give a position away or assume a gender. */
export function leaks(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  return words.filter((w) => BANNED.has(w) || GENDERED.has(w));
}

export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  const end: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${n}${end[n % 10] ?? 'th'}`;
}

/** Understat's last action before the shot, where it says something. */
export const ACTIONS: Record<string, string> = {
  TakeOn: ' after a dribble',
  Dribble: ' after a dribble',
  Cross: ' from a cross',
  Throughball: ' from a through ball',
  Rebound: ' from a rebound',
  Chipped: ' from a chipped pass',
  HeadPass: ' from a flick-on',
  BallRecovery: ' after winning the ball back',
  Tackle: ' after winning the ball back',
  Interception: ' after an interception',
};

export interface ShotFacts {
  shotType: string;
  situation: string;
  lastAction: string;
  minute: number;
  /** Home–away after the goal, or null when the shots did not add up to the result. */
  score: [number, number] | null;
}

/** "A header from a corner, in the 42nd minute, to make it 3–1." Which foot is never said. */
export function recentLine(s: ShotFacts): string {
  const free = s.situation === 'DirectFreekick';
  const kind = free ? 'A direct free kick' : s.shotType === 'Head' ? 'A header' : 'A shot';
  const how = free ? ''
    : s.situation === 'FromCorner' ? ' from a corner'
    : s.situation === 'SetPiece' ? ' from a set piece'
    : ACTIONS[s.lastAction] ?? '';
  const score = s.score ? `, to make it ${s.score[0]}–${s.score[1]}` : '';
  return `${kind}${how}, in the ${ordinal(Math.max(1, s.minute))} minute${score}.`;
}
