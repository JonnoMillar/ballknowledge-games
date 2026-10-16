/**
 * The crest or flag for a team on a sheet. Sheets name teams the way
 * Wikipedia does ("Liverpool", "Republic of Ireland"); this maps each to the
 * pool's club id (its crest) or to the nation id the site draws a flag for
 * (components/ClueBadge). tests/team.test.ts holds every team in the data.
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
  'Algeria': 'Q262', 'Argentina': 'Q414', 'Australia': 'Q408', 'Austria': 'Q40', 'Belgium': 'Q31', 'Brazil': 'Q155',
  'Canada': 'Q16', 'Chile': 'Q298', 'Colombia': 'Q739', 'Costa Rica': 'Q800', 'Croatia': 'Q224', 'Czech Republic': 'Q213',
  'Denmark': 'Q35', 'Ecuador': 'Q736', 'Egypt': 'Q79', 'England': 'Q21', 'FR Yugoslavia': 'Q36704', 'France': 'Q142',
  'Georgia': 'Q230', 'Germany': 'Q183', 'Ghana': 'Q117', 'Greece': 'Q41', 'Hungary': 'Q28', 'Iceland': 'Q189',
  'Italy': 'Q38', 'Japan': 'Q17', 'Mexico': 'Q96', 'Morocco': 'Q1028', 'Netherlands': 'Q55', 'Nigeria': 'Q1033',
  'Northern Ireland': 'Q26', 'Norway': 'Q20', 'Paraguay': 'Q733', 'Poland': 'Q36', 'Portugal': 'Q45',
  'Republic of Ireland': 'Q27', 'Romania': 'Q218', 'Russia': 'Q159', 'Senegal': 'Q1041', 'Slovakia': 'Q214',
  'Slovenia': 'Q215', 'South Korea': 'Q884', 'Spain': 'Q29', 'Sweden': 'Q34', 'Switzerland': 'Q39', 'Turkey': 'Q43',
  'Ukraine': 'Q212', 'United States': 'Q30', 'Uruguay': 'Q77', 'Wales': 'Q25', 'Yugoslavia': 'Q36704',
};

export function teamMark(team: string): TeamMark | null {
  if (CLUB[team]) return { kind: 'club', id: CLUB[team]! };
  if (NATION[team]) return { kind: 'nation', id: NATION[team]! };
  return null;
}
