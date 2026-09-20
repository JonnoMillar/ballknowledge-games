'use client';
import { useEffect, type ReactNode } from 'react';
import ClubBadge, { shortClubName } from '../ClubBadge';
import { BASES_NAME } from '../../src/lib/slugger/grade';
import type { Call, Match } from '../../src/lib/slugger/match';

/**
 * The umpire's call, after every swing.
 *
 * A stamp in the umpire's voice — SINGLE, OUT, GRAND SLAM — the fact under
 * it, and then the game moves on by itself: a beat for a hit, a longer one
 * for an out (the clubs they did play for are the "ahh"), longer again for
 * a change of sides or a home run. A tap anywhere moves on sooner. There
 * is no Next button because the first draft's four taps a pitch were half
 * the length of the game.
 */
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function dwell(m: Match, call: Call): number {
  if (m.status === 'over') return 2600;
  if (call.kind === 'hit') return call.bases === 4 ? 2800 : call.sideRetired ? 2400 : 1600;
  return call.clubs && call.clubs.length ? 3200 : 2000;
}

export default function CallCard({ match, call, onNext }: { match: Match; call: Call; onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(onNext, dwell(match, call));
    return () => clearTimeout(t);
  }, [match, call, onNext]);

  let tone: 'hit' | 'homer' | 'out';
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
        {call.sideRetired ? ' Side retired.' : ''}
      </p>
    );
  } else {
    tone = 'out';
    stamp = call.sideRetired ? 'Out · side retired' : 'Out';
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
    } else line = <>Out.</>;
  }

  return (
    <button type="button" className={`slug-call slug-call--${tone}`} onClick={onNext} aria-label="Continue">
      <span className="slug-call__stamp display">{stamp}</span>
      <p className="slug-call__line">{line}</p>
      {detail}
      <span className="slug-call__hint">tap to continue</span>
    </button>
  );
}
