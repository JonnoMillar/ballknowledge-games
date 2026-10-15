'use client';
import type { At } from '../lib/match';
import type { Slot } from '../lib/types';

export type Mark = 'picked' | 'swapped' | 'real' | 'fake' | 'caught' | null;

/**
 * The team sheet drawn as an XI, keeper at the bottom, attacking up.
 *
 * Every name is set the same way, first name small and the rest big, and
 * nothing else is shown: no numbers, flags or faces, which the fake would be
 * the one without.
 */
export default function Pitch({
  lines, mark, onTap, shake,
}: {
  lines: Slot[][];
  mark: (at: At) => Mark;
  /** Null: the sheet is only to look at. */
  onTap: ((at: At) => void) | null;
  /** The slot that just turned out real, shaken. */
  shake?: At | null;
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
      {lines.map((line, l) => (
        <div key={l} className="bf-pitch__line">
          {line.map((s, k) => {
            const at: At = [l, k];
            const m = mark(at);
            const shaking = shake && shake[0] === l && shake[1] === k;
            const body = <Name name={s.name} />;
            const cls = `bf-slot vt${m ? ` is-${m}` : ''}${shaking ? ' is-shaking' : ''}`;
            const tappable = onTap && m !== 'real';
            return tappable ? (
              <button key={`${l}-${k}`} type="button" className={cls} aria-pressed={m === 'picked' || m === 'swapped'} onClick={() => onTap(at)}>
                {body}
              </button>
            ) : (
              <span key={`${l}-${k}`} className={cls}>{body}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** "Steven" small over "Gerrard" big; a one-word name is all big. */
function Name({ name }: { name: string }) {
  const sp = name.indexOf(' ');
  if (sp < 0) return <span className="bf-slot__last display">{name}</span>;
  return (
    <>
      <span className="bf-slot__first">{name.slice(0, sp)}</span>
      <span className="bf-slot__last display">{name.slice(sp + 1)}</span>
    </>
  );
}
