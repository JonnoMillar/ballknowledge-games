'use client';
import ClubBadge from '../../../components/ClubBadge';
import { Flag } from '../../../components/ClueBadge';
import { teamMark } from '../lib/team';

/** A team's crest (clubs) or flag (nations), `size` tall. Nothing when the team is unknown. */
export default function TeamBadge({ team, size = 28 }: { team: string; size?: number }) {
  const m = teamMark(team);
  if (!m) return null;
  if (m.kind === 'club') return <ClubBadge clubId={m.id} club={{ name: team, crest: true }} size={size} />;
  return (
    <span className="bf-flag" style={{ width: size * 1.5, height: size }}>
      <Flag qid={m.id} width={size * 1.5} />
    </span>
  );
}
