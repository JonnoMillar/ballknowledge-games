'use client';
import ClubBadge, { shortClubName } from '../ClubBadge';
import type { PitchKind } from '../../src/lib/slugger/deck';
import type { Pitch } from '../../src/lib/slugger/match';

export const KIND_LABEL: Record<PitchKind, string> = {
  fastball: 'Fastball',
  curveball: 'Curveball',
  knuckleball: 'Knuckleball',
};

const KIND_HINT: Record<PitchKind, string> = {
  fastball: 'A giant',
  curveball: 'A shelf of names',
  knuckleball: 'A small club',
};

/**
 * The pitcher's hand: three cards, one of each kind. Tap one to throw it.
 *
 * The kind just thrown in this at-bat is face down — no pitch twice in a
 * row — which is what stops a pitcher throwing knuckleballs at a casual
 * mate until the game is nothing but strikeouts.
 */
export default function Hand({
  hand, lastKind, pitcher, batter, onPitch,
}: {
  hand: readonly Pitch[] | null;
  lastKind: PitchKind | null;
  pitcher: string;
  batter: string;
  onPitch: (p: Pitch) => void;
}) {
  return (
    <div className="slug-hand">
      <p className="slug-panel__lead">
        <b>{pitcher}</b> to pitch to <b>{batter}</b>.{lastKind ? <span className="slug-panel__note"> Not the {KIND_LABEL[lastKind].toLowerCase()} again.</span> : null}
      </p>
      <div className="slug-hand__cards">
        {(hand ?? []).map((p) => {
          const barred = p.kind === lastKind;
          return (
            <button
              type="button"
              key={p.kind}
              className={`slug-card slug-card--${p.kind}${barred ? ' is-barred' : ''}`}
              disabled={barred}
              aria-label={barred ? `${KIND_LABEL[p.kind]}, not again` : `${KIND_LABEL[p.kind]}: ${shortClubName(p.name)}`}
              onClick={() => onPitch(p)}
            >
              <span className="slug-card__kind display">{KIND_LABEL[p.kind]}</span>
              <span className="slug-card__crest">
                {barred ? <span className="slug-card__back" aria-hidden="true" /> : <ClubBadge clubId={p.id} club={{ name: p.name, crest: p.crest }} size={56} />}
              </span>
              <span className="slug-card__club">{barred ? '—' : shortClubName(p.name)}</span>
              <span className="slug-card__hint">{KIND_HINT[p.kind]}</span>
            </button>
          );
        })}
        {!hand ? ['fastball', 'curveball', 'knuckleball'].map((k) => (
          <div key={k} className={`slug-card slug-card--${k} is-dealing`} aria-hidden="true">
            <span className="slug-card__kind display">{KIND_LABEL[k as PitchKind]}</span>
            <span className="slug-card__crest"><span className="slug-card__back" /></span>
            <span className="slug-card__club">Dealing…</span>
          </div>
        )) : null}
      </div>
    </div>
  );
}
