'use client';
import { sameAt, type At } from '../lib/match';
import type { Slot } from '../lib/types';
import TeamBadge from './TeamBadge';

export type Mark = 'picked' | 'swapped' | 'real' | 'fake' | 'caught' | null;

/**
 * The team sheet drawn as an XI, keeper at the bottom, attacking up, the
 * team's crest or flag on the halfway line.
 *
 * Every name is set the same way, first name small and the rest big, and
 * nothing else is on a card: no numbers, flags or faces, which the fake would
 * be the one without. Each card carries `data-at` so a dragged card can find
 * the one it is dropped on.
 */
export default function Pitch({
  lines, team, mark, onTap, shake, over, reveal,
}: {
  lines: Slot[][];
  team: string;
  mark: (at: At) => Mark;
  /** Null: the sheet is only to look at. */
  onTap: ((at: At) => void) | null;
  /** The slot that just turned out real, shaken. */
  shake?: At | null;
  /** The slot a dragged card is over. */
  over?: At | null;
  /** The round is over: the fake's slot turns its card to show who really played. */
  reveal?: { at: At; real: Slot; caught: boolean } | null;
}) {
  return (
    <div className="bf-pitch" role="group" aria-label="The XI">
      <svg className="bf-pitch__lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden>
        <rect x="2" y="2" width="96" height="136" rx="1" />
        <path d="M2 2h96" />
        <circle cx="50" cy="2" r="13" />
        <rect x="22" y="116" width="56" height="22" />
        <rect x="36" y="130" width="28" height="8" />
        <path d="M38 116a13 13 0 0 1 24 0" />
      </svg>
      <div className="bf-pitch__crest" title={team}><TeamBadge team={team} size={38} /></div>
      {lines.map((line, l) => (
        <div key={l} className={`bf-pitch__line${reveal && reveal.at[0] === l ? ' has-tab' : ''}`}>
          {line.map((s, k) => {
            const at: At = [l, k];
            const data = `${l}:${k}`;
            if (reveal && sameAt(at, reveal.at)) {
              return <Flip key={`${l}-${k}`} data={data} fake={s} real={reveal.real} caught={reveal.caught} edge={line.length > 1 ? (k === 0 ? 'start' : k === line.length - 1 ? 'end' : null) : null} />;
            }
            const m = mark(at);
            const shaking = shake && sameAt(shake, at);
            const cls = `bf-slot vt${m ? ` is-${m}` : ''}${shaking ? ' is-shaking' : ''}${over && sameAt(over, at) ? ' is-over' : ''}`;
            const tappable = onTap && m !== 'real';
            return tappable ? (
              <button key={`${l}-${k}`} type="button" data-at={data} className={cls} aria-pressed={m === 'picked' || m === 'swapped'} onClick={() => onTap(at)}>
                <Name name={s.name} />
              </button>
            ) : (
              <span key={`${l}-${k}`} data-at={data} className={cls}><Name name={s.name} /></span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** The fake's card turns over to the real player's; the fake stays on a tab above it (kept on the pitch at either edge). */
function Flip({ data, fake, real, caught, edge }: { data: string; fake: Slot; real: Slot; caught: boolean; edge: 'start' | 'end' | null }) {
  return (
    <span className="bf-flip" data-at={data}>
      <span className="bf-flip__in">
        <span className={`bf-slot bf-flip__face ${caught ? 'is-caught' : 'is-fake'}`} aria-hidden><Name name={fake.name} /></span>
        <span className="bf-slot bf-flip__face bf-flip__back"><Name name={real.name} /></span>
      </span>
      <span className={`bf-flip__tab${caught ? ' is-caught' : ''}${edge ? ` is-${edge}` : ''}`}>Fake · {last(fake.name)}</span>
    </span>
  );
}

const last = (name: string) => name.slice(name.indexOf(' ') + 1);

/** "Steven" small over "Gerrard" big; a one-word name is all big. */
export function Name({ name }: { name: string }) {
  const sp = name.indexOf(' ');
  if (sp < 0) return <span className="bf-slot__last display">{name}</span>;
  return (
    <>
      <span className="bf-slot__first">{name.slice(0, sp)}</span>
      <span className="bf-slot__last display">{name.slice(sp + 1)}</span>
    </>
  );
}
