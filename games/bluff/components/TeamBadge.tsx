'use client';
import ClubBadge from '../../../components/ClubBadge';
import { teamMark } from '../lib/team';

/** A team's crest (clubs) or real flag (nations), `size` tall. Nothing when the team is unknown. */
export default function TeamBadge({ team, size = 28 }: { team: string; size?: number }) {
  const m = teamMark(team);
  if (!m) return null;
  if (m.kind === 'club') return <ClubBadge clubId={m.id} club={{ name: team, crest: true }} size={size} />;
  return (
    <span className="bf-flag" style={{ height: size }}>
      <img src={`/flags/${m.id}.svg`} alt="" height={size} style={{ height: size, width: 'auto', display: 'block' }} />
    </span>
  );
}
