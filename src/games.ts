/**
 * Every game on the site, in the order the hub shows them. Adding a game is
 * one entry here plus its own route; the hub reads nothing else.
 * Recall XI is parked and left out on purpose.
 */
export type GameCard = {
  href: string;
  name: string;
  /** Bold lead-in, then the rest. */
  lead: string;
  blurb: string;
  cta: string;
  /** Band and link colour. */
  accent: string;
};

export const GAMES: readonly GameCard[] = [
  {
    href: '/chain',
    name: 'Chain',
    lead: 'A football chain a day.',
    blurb: 'Name the players who link the givens. Every link is a club two players both played for. Seal it once; your streak counts the days it held.',
    cta: 'Play today’s chain →',
    accent: '#C8102E',
  },
  {
    href: '/deep',
    name: 'Deep Cuts',
    lead: 'Going deep is the point.',
    blurb: 'Open boards where the players nobody else remembers come back as rarer cards, from bronze up to the Grail. Keep them in your collection.',
    cta: 'Start digging →',
    accent: '#7A4E12',
  },
  {
    href: '/rondo',
    name: 'Rondo',
    lead: 'A passing game for the pub.',
    blurb: 'Two to four mates, one phone. Pass to anyone who shared a club; every club you go through is burnt. Three bibs and you’re in the middle.',
    cta: 'Fancy a game? →',
    accent: '#F26B1D',
  },
  {
    href: '/slugger',
    name: 'Slugger',
    lead: 'Football, played as baseball.',
    blurb: 'The pitcher throws a club; the batter names someone who played for it. Barcelona is a single. Bolton is a home run, if they can hit it.',
    cta: 'Play ball →',
    accent: '#1F6F43',
  },
  {
    href: '/pin',
    name: 'Pitch pin',
    lead: 'Where was it struck from?',
    blurb: 'Famous goals in packs: each week’s best, the Goal of the Month shortlist, and the classics. A bullseye is within two metres.',
    cta: 'Take aim →',
    accent: '#2B4C9B',
  },
  {
    href: '/itk',
    name: 'ITK',
    lead: 'One move never happened.',
    blurb: 'Five careers a day, club by club. In each, one transfer is made up. Two picks to circle it, and your rank goes from Mascot to Fabrizio.',
    cta: 'Read today’s careers →',
    accent: '#5B2A86',
  },
];
