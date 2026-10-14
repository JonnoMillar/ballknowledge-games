'use client';
import { useEffect, useState } from 'react';
import { dateOfDay, dayNumber, localDate, shortDate } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import { MAX_POINTS, pointsOf, roundMark, tierOf } from '../lib/score';
import { allPlayed, type Played } from '../lib/progress';
import Back from '../../../components/Back';

export function marksOf(p: Played | undefined): (PlateMark | null)[] {
  return (p?.picks ?? Array.from({ length: 5 }, () => [])).map((x) => roundMark(x.map((y) => y.fake)));
}

export const playUrl = (date: string, today: string) => (date === today ? '/spoofed/play' : `/spoofed/play?date=${date}`);

/** The days before today, newest first. */
export function pastDays(today: string, epoch: string): string[] {
  return Array.from({ length: Math.max(0, dayNumber(today, epoch) - 1) }, (_, i) => dateOfDay(i + 1, epoch)).reverse();
}

/**
 * Every day before today, newest first, with what this browser has played
 * of each. Progress is local, so an unplayed tile only means "not here".
 */
export default function Archive({ days, today, epoch, played }: {
  days: string[];
  today: string;
  epoch: string;
  played: Record<string, Played>;
}) {
  return (
    <ol className="daytiles">
      {days.map((date) => {
        const marks = marksOf(played[date]);
        const done = marks.every(Boolean);
        const started = marks.some(Boolean);
        return (
          <li key={date}>
            <a className={`daytile ${done ? 'is-done' : ''}`} href={playUrl(date, today)}>
              <span className="daytile__n display">#{dayNumber(date, epoch)}</span>
              <span className="daytile__date">{shortDate(date)}</span>
              <span className="itk-arch__marks" aria-hidden>
                {marks.map((m, i) => <span key={i} className={`itk-pip itk-pip--${m ?? 'open'}`} />)}
              </span>
              <span className="daytile__note">
                {done ? `${pointsOf(marks as PlateMark[])}/${MAX_POINTS} · ${tierOf(marks as PlateMark[])}` : started ? 'Resume' : 'Play'}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/** The archive page: every past daily, newest first. Reached from the lobby's Archive card. */
export function ArchivePage({ epoch }: { epoch: string }) {
  // Read after mount: localStorage is the player's, and the server render knows nothing of it.
  const [me, setMe] = useState<{ today: string; played: Record<string, Played> } | null>(null);
  useEffect(() => setMe({ today: localDate(), played: allPlayed() }), []);
  return (
    <div className="app itk">
      <header className="masthead">
        <Back href="/spoofed" label="Spoofed" />
        <a className="masthead__brand display" href="/spoofed">Spoofed</a>
        <div className="masthead__meta"><span>Archive</span></div>
      </header>
      <main className="itk__main">
        {me ? <Archive days={pastDays(me.today, epoch)} today={me.today} epoch={epoch} played={me.played} /> : null}
      </main>
    </div>
  );
}
