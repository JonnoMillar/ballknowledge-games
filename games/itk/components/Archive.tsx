'use client';
import { useEffect, useState } from 'react';
import { dateOfDay, dayNumber, localDate } from '../../../src/lib/daily';
import type { PlateMark } from '../../../src/lib/chain/share';
import { ItkMark } from './Itk';
import { MAX_POINTS, pointsOf, roundMark, tierOf } from '../lib/score';
import { allPlayed, type Played } from '../lib/progress';
import Back from '../../../components/Back';

/**
 * Every day from day 1 to today, newest first, with what this browser has
 * played of each. Progress is local, so an unplayed tile only means "not here".
 */
const short = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function marksOf(p: Played | undefined): (PlateMark | null)[] {
  return (p?.picks ?? Array.from({ length: 5 }, () => [])).map((x) => roundMark(x.map((y) => y.fake)));
}

export default function Archive({ epoch }: { epoch: string }) {
  // Read after mount: localStorage is the player's, and the server render knows nothing of it.
  const [today, setToday] = useState<string | null>(null);
  const [played, setPlayed] = useState<Record<string, Played>>({});
  useEffect(() => {
    setToday(localDate());
    setPlayed(allPlayed());
  }, []);
  const days = today ? Array.from({ length: Math.max(0, dayNumber(today, epoch)) }, (_, i) => dateOfDay(i + 1, epoch)).reverse() : [];

  return (
    <div className="app itk">
      <header className="masthead">
        <Back href="/spoofed" label="Spoofed" />
        <a className="masthead__brand display" href="/spoofed">
          <ItkMark />
          Spoofed
        </a>
        <div className="masthead__meta">
          <span>Archive</span>
        </div>
      </header>
      <main className="itk__main">
        <ol className="itk-arch">
          {days.map((date) => {
            const marks = marksOf(played[date]);
            const done = marks.every(Boolean);
            const started = marks.some(Boolean);
            const href = date === today ? '/spoofed' : `/spoofed?date=${date}`;
            return (
              <li key={date}>
                <a className={`itk-arch__tile ${done ? 'is-done' : ''}`} href={href}>
                  <span className="itk-arch__n display">#{dayNumber(date, epoch)}</span>
                  <span className="itk-arch__date">{date === today ? 'Today' : short(date)}</span>
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
      </main>
    </div>
  );
}
