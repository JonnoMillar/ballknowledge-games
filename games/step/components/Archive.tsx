'use client';
import { useEffect, useState } from 'react';
import Back from '../../../components/Back';
import { dateOfDay, dayNumber, localDate, shortDate } from '../../../src/lib/daily';
import { GRADE_GLYPH, GRADE_WORD } from '../../../src/lib/chain/grade';
import { MARK_GLYPH } from '../../../src/lib/chain/share';
import { NAME, STEPS, runGrade } from '../lib/rules';
import { allRuns, type Run } from '../lib/progress';
import { StepMark } from './Step';

/**
 * Every day from day 1 to today, newest first, with what this browser has
 * played of each. Progress is local, so an unplayed tile only means "not here".
 */
export default function Archive({ epoch }: { epoch: string }) {
  // Read after mount: localStorage is the player's, and the server render knows nothing of it.
  const [today, setToday] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, Run>>({});
  useEffect(() => {
    setToday(localDate());
    setRuns(allRuns());
  }, []);
  const days = today ? Array.from({ length: Math.max(0, dayNumber(today, epoch)) }, (_, i) => dateOfDay(i + 1, epoch)).reverse() : [];

  return (
    <div className="app step">
      <header className="masthead">
        <Back href="/chain" label="Chain" />
        <a className="masthead__brand display" href="/step">
          <StepMark />
          {NAME}
        </a>
        <div className="masthead__meta">
          <span>Archive</span>
        </div>
      </header>
      <main className="step__main">
        <ol className="daytiles step-arch">
          {days.map((date) => {
            const run: Run = runs[date] ?? Array<null>(STEPS).fill(null);
            const done = run.every(Boolean);
            const started = run.some(Boolean);
            const word = done ? runGrade(run.map((v) => v?.grade ?? null)) : null;
            return (
              <li key={date}>
                <a className={`daytile ${done ? 'is-done' : ''}`} href={date === today ? '/step' : `/step?date=${date}`}>
                  <span className="daytile__n display">#{dayNumber(date, epoch)}</span>
                  <span className="daytile__date">{date === today ? 'Today' : shortDate(date)}</span>
                  {started ? (
                    <span className="step-arch__grid" aria-hidden>
                      {run.map((v) => (v ? (v.grade ? GRADE_GLYPH[v.grade] : MARK_GLYPH.missed) : '·')).join('')}
                    </span>
                  ) : null}
                  <span className="daytile__note">{done ? (word ? GRADE_WORD[word] : 'No hits') : started ? 'Resume' : 'Play'}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
