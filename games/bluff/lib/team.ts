/**
 * The crest or flag for a team on a sheet. Sheets name teams the way
 * Wikipedia does ("Liverpool", "Republic of Ireland"); this maps each to the
 * pool's club id (its crest, as ClubBadge shows everywhere) or to the code of
 * its real flag in public/flags (flag-icons, MIT; Yugoslavia's is from
 * Commons). tests/team.test.ts holds every team in the data.
 */
export type TeamMark = { kind: 'club' | 'nation'; id: string };

const CLUB: Record<string, string> = {
  'Ajax': 'Q81888', 'Arsenal': 'Q9617', 'Aston Villa': 'Q18711', 'Atlético Madrid': 'Q8701', 'Barcelona': 'Q7156',
  'Bayer Leverkusen': 'Q104761', 'Bayern Munich': 'Q15789', 'Borussia Dortmund': 'Q41420', 'Cardiff City': 'Q18662',
  'Chelsea': 'Q9616', 'Crystal Palace': 'Q19467', 'Everton': 'Q5794', 'Hull City': 'Q19477', 'Inter Milan': 'Q631',
  'Juventus': 'Q1422', 'Liverpool': 'Q1130849', 'Manchester City': 'Q50602', 'Manchester United': 'Q18656',
  'Milan': 'Q1543', 'Millwall': 'Q19487', 'Paris Saint-Germain': 'Q483020', 'Portsmouth': 'Q19604',
  'Real Madrid': 'Q8682', 'Southampton': 'Q18732', 'Stoke City': 'Q18736', 'Tottenham Hotspur': 'Q18741',
  'Valencia': 'Q10333', 'Watford': 'Q2714', 'West Ham United': 'Q18747', 'Wigan Athletic': 'Q18750',
};

const NATION: Record<string, string> = {
  'Algeria': 'dz',
  'Argentina': 'ar',
  'Australia': 'au',
  'Austria': 'at',
  'Belgium': 'be',
  'Brazil': 'br',
  'Canada': 'ca',
  'Chile': 'cl',
  'Colombia': 'co',
  'Costa Rica': 'cr',
  'Croatia': 'hr',
  'Czech Republic': 'cz',
  'Denmark': 'dk',
  'Ecuador': 'ec',
  'Egypt': 'eg',
  'England': 'gb-eng',
  'FR Yugoslavia': 'yu',
  'France': 'fr',
  'Georgia': 'ge',
  'Germany': 'de',
  'Ghana': 'gh',
  'Greece': 'gr',
  'Hungary': 'hu',
  'Iceland': 'is',
  'Italy': 'it',
  'Japan': 'jp',
  'Mexico': 'mx',
  'Morocco': 'ma',
  'Netherlands': 'nl',
  'Nigeria': 'ng',
  'Northern Ireland': 'gb-nir',
  'Norway': 'no',
  'Paraguay': 'py',
  'Poland': 'pl',
  'Portugal': 'pt',
  'Republic of Ireland': 'ie',
  'Romania': 'ro',
  'Russia': 'ru',
  'Senegal': 'sn',
  'Slovakia': 'sk',
  'Slovenia': 'si',
  'South Korea': 'kr',
  'Spain': 'es',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Turkey': 'tr',
  'Ukraine': 'ua',
  'United States': 'us',
  'Uruguay': 'uy',
  'Wales': 'gb-wls',
  'Yugoslavia': 'yu',
};

export function teamMark(team: string): TeamMark | null {
  if (CLUB[team]) return { kind: 'club', id: CLUB[team]! };
  if (NATION[team]) return { kind: 'nation', id: NATION[team]! };
  return null;
}
