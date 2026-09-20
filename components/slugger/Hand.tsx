'use client';
import ClubBadge, { shortClubName } from '../ClubBadge';
import { PITCH_KINDS, type PitchKind } from '../../src/lib/slugger/deck';
import { BASES_FOR, BASES_NAME } from '../../src/lib/slugger/grade';
import { canThrow, fielding, type Match, type Pitch } from '../../src/lib/slugger/match';

export const KIND_LABEL: Record<PitchKind, string> = {
  fastball: 'Fastball',
  curveball: 'Curveball',
  slider: 'Slider',
  knuckleball: 'Knuckleball',
};

/**
 * The pitcher's hand: four cards, one of each kind. Tap one to throw it.
 *
 * Each card says what a hit off it is worth, because that is the whole
 * decision: the fastball will be hit, for a single; the knuckleball might
 * not be, and if it is, it's gone. Knuckleballs are three a game, and the
 * card shows how many are left.
 */
export default function Hand({
  match, hand, pitcher, batter, onPitch,
}: {
  match: Match;
  hand: readonly Pitch[] | null;
  pitcher: string;
  batter: string;
  onPitch: (p: Pitch) => void;
}) {
  const left = match.knuckleballs[fielding(match)];
  return (
    <div className="slug-hand">
      <p className="slug-panel__lead">
        <b>{pitcher}</b> to pitch to <b>{batter}</b>.
        <span className="slug-panel__note"> Batter {match.up + 1} of 3.</span>
      </p>
      <div className="slug-hand__cards">
        {(hand ?? PITCH_KINDS.map((kind): Pitch => ({ id: '', name: '', crest: false, kind }))).map((p) => {
          const dealing = !hand;
          const barred = !canThrow(match, p.kind);
          const worth = BASES_NAME[BASES_FOR[p.kind]];
          return (
            <button
              type="button"
              key={p.kind}
              className={`slug-card slug-card--${p.kind}${barred ? ' is-barred' : ''}${dealing ? ' is-dealing' : ''}`}
              disabled={barred || dealing}
              aria-label={barred ? `${KIND_LABEL[p.kind]}, none left` : `${KIND_LABEL[p.kind]}: ${shortClubName(p.name)}, a ${worth.toLowerCase()} if hit`}
              onClick={() => onPitch(p)}
            >
              <span className="slug-card__kind display">{KIND_LABEL[p.kind]}</span>
              <span className="slug-card__crest">
                {barred || dealing
                  ? <span className="slug-card__back" aria-hidden="true" />
                  : <ClubBadge clubId={p.id} club={{ name: p.name, crest: p.crest }} size={52} />}
              </span>
              <span className="slug-card__club">{dealing ? 'Dealing…' : barred ? 'None left' : shortClubName(p.name)}</span>
              <span className="slug-card__worth display">
                {worth}{p.kind === 'knuckleball' && !barred ? <small> · {left} left</small> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
