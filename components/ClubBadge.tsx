'use client';
import { crestPath, type ClubView } from '../src/lib/clubs';

/**
 * The handful of clubs whose everyday name is not a substring of their
 * registered one.
 *
 * The suffix stripping below cannot produce these, and no rule could: "PSG"
 * is not a shorter Paris Saint-Germain, it is a different string that happens
 * to be what everybody says. So they are listed, by hand, one at a time —
 * this is emphatically NOT a place to guess at abbreviations, and it is not a
 * licence to shorten anything that stripping already handles: "FC Bayern
 * Munich" becomes "Bayern Munich" below and stops there. Every entry here is
 * a name a fan would use out loud; anything that needed inventing is left
 * long instead.
 *
 * Matched on the WHOLE name, so "Borussia Dortmund II" is untouched. A rule
 * that matched loosely would put a reserve side on the sheet under the first
 * team's name.
 */
const SPOKEN_NAME: Record<string, string> = {
  'Paris Saint-Germain FC': 'PSG',
  'Brighton & Hove Albion F.C.': 'Brighton',
  'Wolverhampton Wanderers F.C.': 'Wolves',
  'Tottenham Hotspur F.C.': 'Tottenham',
  'Borussia Mönchengladbach': 'Gladbach',
  'Borussia Dortmund': 'Dortmund',
  'Bayer 04 Leverkusen': 'Leverkusen',
  '1. FC Köln': 'Köln',
  'RCD Espanyol de Barcelona': 'Espanyol',
  'ACF Fiorentina': 'Fiorentina',
  'SS Lazio': 'Lazio',
  'SSC Napoli': 'Napoli',
  'Genoa CFC': 'Genoa',
  'S.L. Benfica': 'Benfica',
  'Olympique de Marseille': 'Marseille',
};

/**
 * Trim the legal furniture off a club's name.
 *
 * Wikidata stores full registered names — "Manchester United F.C.", "Real
 * Madrid Club de Fútbol" — which are too long for a link pill and read as
 * paperwork rather than as a club. Only well-known suffixes are stripped, and
 * anything left over is kept verbatim: guessing at abbreviations would produce
 * a name no fan actually uses. See SPOKEN_NAME for the hand-checked exceptions.
 */
export function shortClubName(name: string): string {
  const spoken = SPOKEN_NAME[name.trim()];
  if (spoken) return spoken;
  return name
    .replace(/\s+(A\.?F\.?C\.?|F\.?C\.?|S\.?C\.?|C\.?F\.?|B\.?C\.?|J\.?K\.?|S\.?K\.?)$/i, '')
    // Leading club-type prefixes. SV, AS, RC and the rest read as noise beside
    // the name that identifies the club: "SV Werder Bremen and Juventus" is a
    // caption, "Werder Bremen and Juventus" is a fact.
    .replace(/^(A\.?F\.?C\.?|F\.?C\.?|S\.?C\.?|C\.?F\.?|S\.?V\.?|A\.?S\.?|R\.?C\.?|V\.?f\.?B\.?|V\.?f\.?L\.?)\s+/i, '')
    .replace(/\s+Club de Fútbol$/i, '')
    .replace(/^Club de Fútbol\s+/i, '')
    .replace(/\s+Football Club$/i, '')
    .replace(/\s+Balompié$/i, '')
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
 * Crests come from English Wikipedia's article infoboxes, not from Wikidata:
 * P154 covers 4.9% of football clubs and none of the Premier League, because
 * Commons will not host a copyrighted crest. See scripts/fetch-club-badges.ts.
 *
 * The monogram is still not a broken image. It is what a club gets when it has
 * no English article or no infobox crest, and it is drawn to look deliberate:
 * the same chamfer as the player cards, a colour fixed by club id so a club
 * always looks like itself.
 */
export default function ClubBadge({
  clubId, club, size = 18,
}: {
  clubId: string;
  club: ClubView | undefined;
  size?: number;
}) {
  const name = shortClubName(club?.name ?? clubId);

  if (club?.crest) {
    return (
      <img
        src={crestPath(clubId)}
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
