'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import ClubBadge, { shortClubName } from '../ClubBadge';
import { BASES_NAME } from '../../src/lib/slugger/grade';
import type { Call, Match } from '../../src/lib/slugger/match';

/**
 * The umpire's call, after every swing.
 *
 * A stamp in the umpire's voice — SINGLE, STRIKE THREE, FOUL BALL — the
 * fact under it, and a Next button. The scoreboard and the diamond above
 * have already moved; this is the beat where the table reacts before the
 * phone moves on. On a miss, the clubs the name did play for: the "ahh".
 */
function nextLabel(m: Match, call: Call): string {
  if (m.status === 'over') return 'Full time';
  if (call.kind === 'strike' && call.sideRetired) return 'Change sides';
  if (call.kind === 'hit' || (call.kind === 'strike' && call.out)) return 'Next batter';
  return 'Next pitch';
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function CallCard({ match, call, onNext }: { match: Match; call: Call; onNext: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus({ preventScroll: true }); }, []);

  let tone: 'hit' | 'homer' | 'strike' | 'out' | 'foul';
  let stamp: string;
  let line: ReactNode;
  let detail: ReactNode = null;

  if (call.kind === 'hit') {
    tone = call.bases === 4 ? 'homer' : 'hit';
    stamp = call.grandSlam ? 'Grand slam' : BASES_NAME[call.bases];
    const club = shortClubName(call.club.name);
    const fact = call.apps === null
      ? `was at ${club}`
      : call.apps === 0
        ? `on the books at ${club}, no league games`
        : `${plural(call.apps, 'league game')} for ${club}`;
    line = <><b>{call.player.name}</b> — {fact}.</>;
    const where = call.bases === 1 ? 'On first.' : call.bases === 2 ? 'On second.' : 'On third.';
    detail = (
      <p className="slug-call__runs">
        {call.walkOff ? <b>Walk-off! </b> : null}
        {call.runs === 0 ? where : `${plural(call.runs, 'run')} in.`}
      </p>
    );
  } else if (call.kind === 'foul') {
    tone = 'foul';
    stamp = 'Foul ball';
    line = (
      <><b>{call.player.name}</b> has already had a hit this match.
        {call.counted ? ' That’s a strike.' : ' Two strikes already, so the count stands.'}</>
    );
  } else {
    tone = call.out ? 'out' : 'strike';
    stamp = call.out ? (call.sideRetired ? 'Strike three · side retired' : 'Strike three') : 'Strike';
    const club = call.club ? shortClubName(call.club.name) : 'them';
    if (call.reason === 'clock') line = <>Caught looking — the clock ran out on {club}.</>;
    else if (call.reason === 'nothing') line = <>Nothing for {club}. The pitch goes by.</>;
    else if (call.player) {
      line = <><b>{call.player.name}</b> never played for {club}.</>;
      if (call.clubs && call.clubs.length) {
        detail = (
          <div className="slug-call__clubs">
            <span className="slug-call__clubs-label">Did play for</span>
            <ul>
              {call.clubs.map((c) => (
                <li key={c.id}>
                  <ClubBadge clubId={c.id} club={{ name: c.name, crest: c.crest }} size={22} />
                  <span>{shortClubName(c.name)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      }
    } else line = <>Strike.</>;
  }

  return (
    <div className={`slug-call slug-call--${tone}`} role="status">
      <span className="slug-call__stamp display">{stamp}</span>
      <p className="slug-call__line">{line}</p>
      {detail}
      <button ref={btn} type="button" className="slug-btn slug-btn--primary display" onClick={onNext}>
        {nextLabel(match, call)}
      </button>
    </div>
  );
}
