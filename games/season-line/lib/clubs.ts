/**
 * Every club the Premier League has had, by football-data.co.uk's short name:
 * the name the page prints and the Wikipedia article its season pages hang
 * off. A newly promoted club is one line here; the builder fails loudly
 * until it is added.
 */
export const CLUBS: Record<string, { name: string; wiki: string; seasonWiki?: string }> = {
  Arsenal: { name: 'Arsenal', wiki: 'Arsenal F.C.' },
  'Aston Villa': { name: 'Aston Villa', wiki: 'Aston Villa F.C.' },
  Barnsley: { name: 'Barnsley', wiki: 'Barnsley F.C.' },
  Birmingham: { name: 'Birmingham City', wiki: 'Birmingham City F.C.' },
  Blackburn: { name: 'Blackburn Rovers', wiki: 'Blackburn Rovers F.C.' },
  Blackpool: { name: 'Blackpool', wiki: 'Blackpool F.C.' },
  Bolton: { name: 'Bolton Wanderers', wiki: 'Bolton Wanderers F.C.' },
  Bournemouth: { name: 'Bournemouth', wiki: 'AFC Bournemouth' },
  Bradford: { name: 'Bradford City', wiki: 'Bradford City A.F.C.' },
  Brentford: { name: 'Brentford', wiki: 'Brentford F.C.' },
  Brighton: { name: 'Brighton', wiki: 'Brighton & Hove Albion F.C.' },
  Burnley: { name: 'Burnley', wiki: 'Burnley F.C.' },
  Cardiff: { name: 'Cardiff City', wiki: 'Cardiff City F.C.' },
  Charlton: { name: 'Charlton Athletic', wiki: 'Charlton Athletic F.C.' },
  Chelsea: { name: 'Chelsea', wiki: 'Chelsea F.C.' },
  Coventry: { name: 'Coventry City', wiki: 'Coventry City F.C.' },
  'Crystal Palace': { name: 'Crystal Palace', wiki: 'Crystal Palace F.C.' },
  Derby: { name: 'Derby County', wiki: 'Derby County F.C.' },
  Everton: { name: 'Everton', wiki: 'Everton F.C.' },
  Fulham: { name: 'Fulham', wiki: 'Fulham F.C.' },
  Huddersfield: { name: 'Huddersfield Town', wiki: 'Huddersfield Town A.F.C.' },
  Hull: { name: 'Hull City', wiki: 'Hull City A.F.C.' },
  Ipswich: { name: 'Ipswich Town', wiki: 'Ipswich Town F.C.' },
  // Its season articles keep the club's old name.
  Leeds: { name: 'Leeds United', wiki: 'Leeds United F.C.', seasonWiki: 'Leeds United A.F.C.' },
  Leicester: { name: 'Leicester City', wiki: 'Leicester City F.C.' },
  Liverpool: { name: 'Liverpool', wiki: 'Liverpool F.C.' },
  Luton: { name: 'Luton Town', wiki: 'Luton Town F.C.' },
  'Man City': { name: 'Manchester City', wiki: 'Manchester City F.C.' },
  'Man United': { name: 'Manchester United', wiki: 'Manchester United F.C.' },
  Middlesbrough: { name: 'Middlesbrough', wiki: 'Middlesbrough F.C.' },
  Newcastle: { name: 'Newcastle United', wiki: 'Newcastle United F.C.' },
  Norwich: { name: 'Norwich City', wiki: 'Norwich City F.C.' },
  "Nott'm Forest": { name: 'Nottingham Forest', wiki: 'Nottingham Forest F.C.' },
  Oldham: { name: 'Oldham Athletic', wiki: 'Oldham Athletic A.F.C.' },
  Portsmouth: { name: 'Portsmouth', wiki: 'Portsmouth F.C.' },
  QPR: { name: 'QPR', wiki: 'Queens Park Rangers F.C.' },
  Reading: { name: 'Reading', wiki: 'Reading F.C.' },
  'Sheffield United': { name: 'Sheffield United', wiki: 'Sheffield United F.C.' },
  'Sheffield Weds': { name: 'Sheffield Wednesday', wiki: 'Sheffield Wednesday F.C.' },
  Southampton: { name: 'Southampton', wiki: 'Southampton F.C.' },
  Stoke: { name: 'Stoke City', wiki: 'Stoke City F.C.' },
  Sunderland: { name: 'Sunderland', wiki: 'Sunderland A.F.C.' },
  Swansea: { name: 'Swansea City', wiki: 'Swansea City A.F.C.' },
  Swindon: { name: 'Swindon Town', wiki: 'Swindon Town F.C.' },
  Tottenham: { name: 'Tottenham Hotspur', wiki: 'Tottenham Hotspur F.C.' },
  Watford: { name: 'Watford', wiki: 'Watford F.C.' },
  'West Brom': { name: 'West Brom', wiki: 'West Bromwich Albion F.C.' },
  'West Ham': { name: 'West Ham United', wiki: 'West Ham United F.C.' },
  Wigan: { name: 'Wigan Athletic', wiki: 'Wigan Athletic F.C.' },
  Wimbledon: { name: 'Wimbledon', wiki: 'Wimbledon F.C.' },
  Wolves: { name: 'Wolves', wiki: 'Wolverhampton Wanderers F.C.' },
};

/** 2015 to "2015-16" (an id) and "2015/16" (what the page prints). */
export const seasonId = (start: number) => `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
export const seasonLabel = (start: number) => `${start}/${String((start + 1) % 100).padStart(2, '0')}`;

/**
 * The line colour of each club, by short name: the shirt's main colour, one
 * shade darker where it would vanish on white (yellows, sky blues). A club
 * missing here draws in ink.
 */
export const INK = '#141210';
export const COLOUR: Record<string, string> = {
  Arsenal: '#EF0107', 'Aston Villa': '#7B1F3F', Barnsley: '#D71920', Birmingham: '#1C4FA0', Blackburn: '#1F8FD0', Blackpool: '#F26A1B',
  Bolton: '#263C7C', Bournemouth: '#C8102E', Bradford: '#8B1A3A', Brentford: '#E30613', Brighton: '#0057B8', Burnley: '#6C1D45',
  Cardiff: '#0070B5', Charlton: '#D4021D', Chelsea: '#034694', Coventry: '#4C9AD0', 'Crystal Palace': '#1B458F', Derby: '#4A4A4A',
  Everton: '#003399', Fulham: '#3A3A3A', Huddersfield: '#0E63AD', Hull: '#F08A00', Ipswich: '#3A64A3', Leeds: '#1D428A',
  Leicester: '#0B3FA8', Liverpool: '#C8102E', Luton: '#F78F1E', 'Man City': '#6CABDD', 'Man United': '#DA291C', Middlesbrough: '#E2231A',
  Newcastle: '#6B6B6B', Norwich: '#00A650', "Nott'm Forest": '#DD0000', Oldham: '#1E5BA8', Portsmouth: '#2147B2', QPR: '#005BAC',
  Reading: '#004494', 'Sheffield United': '#EE2737', 'Sheffield Weds': '#1F3A93', Southampton: '#D71920', Stoke: '#E03A3E',
  Sunderland: '#EB172B', Swansea: '#666666', Swindon: '#D4141C', Tottenham: '#132257', Watford: '#C9A400', 'West Brom': '#122F67',
  'West Ham': '#7A263A', Wigan: '#1B5FAF', Wimbledon: '#1B3F8B', Wolves: '#E3A400',
};
