'use client';
import { dateOfDay, dayNumber } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import { MAX_POINTS, pointsOf, roundMark, tierOf } from '../lib/score';
import type { Played } from '../lib/progress';

/**
 * Every day before today, newest first, with what this browser has played
 * of each. Progress is local, so an unplayed tile only means "not here".
 */
const short = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function marksOf(p: Played | undefined): (PlateMark | null)[] {
  return (p?.picks ?? Array.from({ length: 5 }, () => [])).map((x) => roundMark(x.map((y) => y.fake)));
}

export const playUrl = (date: string, today: string) => (date === today ? '/spoofed/play' : `/spoofed/play?date=${date}`);

/** The days before today, newest first. */
export function pastDays(today: string, epoch: string): string[] {
  return Array.from({ length: Math.max(0, dayNumber(today, epoch) - 1) }, (_, i) => dateOfDay(i + 1, epoch)).reverse();
}

export default function Archive({ days, today, epoch, played }: {
  days: string[];
  today: string;
  epoch: string;
  played: Record<string, Played>;
}) {
  return (
    <ol className="itk-arch">
      {days.map((date) => {
        const marks = marksOf(played[date]);
        const done = marks.every(Boolean);
        const started = marks.some(Boolean);
        return (
          <li key={date}>
            <a className={`itk-arch__tile ${done ? 'is-done' : ''}`} href={playUrl(date, today)}>
              <span className="itk-arch__n display">#{dayNumber(date, epoch)}</span>
              <span className="itk-arch__date">{short(date)}</span>
              <span className="itk-arch__marks" aria-hidden>
                {marks.map((m, i) => <span key={i} className={`itk-pip itk-pip--${m ?? 'open'}`} />)}
              </span>
              <span className="itk-arch__note">
                {done ? `${pointsOf(marks as PlateMark[])}/${MAX_POINTS} · ${tierOf(marks as PlateMark[])}` : started ? 'Resume' : 'Play'}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
