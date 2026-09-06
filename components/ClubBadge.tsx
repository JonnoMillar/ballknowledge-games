'use client';
import { commonsThumb } from './PlayerCard';

export interface ClubRecord {
  name: string;
  /** Commons filename, when Wikidata has one. Most clubs have none. */
  badge?: string;
}

/**
 * Trim the legal furniture off a club's name.
 *
 * Wikidata stores full registered names — "Manchester United F.C.", "Real
 * Madrid Club de Fútbol" — which are too long for a link pill and read as
 * paperwork rather than as a club. Only well-known suffixes are stripped, and
 * anything left over is kept verbatim: guessing at abbreviations would produce
 * a name no fan actually uses.
 */
export function shortClubName(name: string): string {
  return name
    .replace(/\s+(A\.?F\.?C\.?|F\.?C\.?|S\.?C\.?|C\.?F\.?|B\.?C\.?)$/i, '')
    .replace(/^(A\.?F\.?C\.?|F\.?C\.?|S\.?C\.?|C\.?F\.?)\s+/i, '')
    .replace(/\s+Club de Fútbol$/i, '')
    .replace(/\s+Football Club$/i, '')
    .trim();
}

/** Up to three initials, or the first three letters of a single-word name. */
function monogram(name: string): string {
  const words = name.split(/[\s-]+/).filter((w) => /[a-z0-9]/i.test(w));
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]!).join('').toUpperCase();
  return (words[0] ?? '?').slice(0, 3).toUpperCase();
}

/**
 * Deterministic hue per club, so a club looks the same everywhere it appears.
 * Kept desaturated and dark to sit inside the existing palette rather than
 * competing with the green and gold that carry meaning.
 */
function tone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h}, 24%, 32%)`;
}

/**
 * A club's crest.
 *
 * Wikidata carries a badge for about 17% of the clubs in the pool and none of
 * the Premier League, because club crests are copyrighted logos that Wikimedia
 * Commons will not host — English Wikipedia keeps them as local fair-use files
 * that are not reusable. The clubs that do have one are those whose crests fall
 * below the threshold of originality.
 *
 * So the monogram is not a placeholder for a missing image, it is the normal
 * case, and it is drawn to look deliberate: the same chamfer as the player
 * cards, a colour fixed by club id so a club always looks like itself. A real
 * crest replaces it wherever one exists, and would replace it everywhere if the
 * badges ever came from a source that licenses them.
 */
export default function ClubBadge({
  clubId, club, size = 18,
}: {
  clubId: string;
  club: ClubRecord | undefined;
  size?: number;
}) {
  const name = shortClubName(club?.name ?? clubId);

  if (club?.badge) {
    return (
      <img
        src={commonsThumb(club.badge, 64)}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="cond"
      style={{
        width: size, height: size, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        clipPath: 'polygon(12% 0, 88% 0, 100% 18%, 100% 82%, 88% 100%, 12% 100%, 0 82%, 0 18%)',
        background: tone(clubId),
        color: '#e7eefb',
        fontWeight: 700,
        fontSize: size * 0.42,
        letterSpacing: '0.02em',
        lineHeight: 1,
      }}
    >
      {monogram(name)}
    </span>
  );
}
