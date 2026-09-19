import type { Player } from './chemistry/types';

/**
 * Club colours, by hand.
 *
 * A dominant-colour extractor over the crest PNGs was built first and is about
 * 75% right — it takes City's navy ring over the sky blue, and Barcelona's
 * crest gold over the claret. A wrong colour is the most visible error on a
 * board, so the clubs that appear are named here and everything else falls
 * back to ink. The list is the clubs the shipped boards' givens are known
 * for plus the clubs that carry links often enough to have come up in play;
 * a club missing from it shows as ink, never as a guess.
 *
 * Server-safe: the board loader and the client both read this.
 */
export const CLUB_COLOUR: Record<string, string> = {
  // England
  Q9617: '#EF0107', // Arsenal
  Q1130: '#EF0107', // Arsenal (second item)
  Q18711: '#670E36', // Aston Villa
  Q19446: '#009EE0', // Blackburn Rovers
  Q19451: '#263C7C', // Bolton Wanderers
  Q19571: '#E30613', // Brentford
  Q9616: '#034694', // Chelsea
  Q19470: '#1B2A47', // Derby County
  Q5794: '#003399', // Everton
  Q19481: '#003090', // Leicester City
  Q1130849: '#C8102E', // Liverpool
  Q1130285: '#C8102E', // Liverpool (second item)
  Q50602: '#6CABDD', // Manchester City
  Q18656: '#DA291C', // Manchester United
  Q18716: '#241F20', // Newcastle United
  Q18723: '#005FA7', // Queens Park Rangers
  Q18732: '#D71920', // Southampton
  Q18739: '#EB172B', // Sunderland
  Q18741: '#132257', // Tottenham Hotspur
  Q18747: '#7A263A', // West Ham United
  // Spain
  Q8701: '#CB3524', // Atlético Madrid
  Q20921799: '#CB3524', // Atlético Madrid youth
  Q7156: '#A50044', // Barcelona
  Q10467: '#A50044', // Barcelona Atlètic
  Q2346842: '#A50044', // Barcelona C
  Q8760: '#1E5BA8', // Deportivo de A Coruña
  Q8780: '#007FC8', // Espanyol
  Q8835: '#E20613', // Mallorca
  Q8682: '#FEBE10', // Real Madrid — the gold, since the shirt is white
  Q8682000: '#FEBE10',
  Q12217: '#FEBE10', // Real Madrid Castilla
  Q10315: '#0067B1', // Real Sociedad
  Q10329: '#D4121A', // Sevilla
  // Italy
  Q1543: '#FB090B', // AC Milan
  Q1893: '#1B2E5A', // Bologna
  Q631: '#0068A8', // Inter Milan
  Q1422: '#000000', // Juventus
  Q2609: '#87D8F7', // Lazio
  Q2641: '#12A0D7', // Napoli
  Q2693: '#1F4E9A', // Parma
  Q2739: '#8E1F2F', // Roma
  // Germany
  Q104761: '#E32221', // Bayer Leverkusen
  Q15789: '#DC052D', // Bayern Munich
  Q994701: '#DC052D', // Bayern Munich II
  Q41420: '#FDE100', // Borussia Dortmund
  Q101959: '#1E9E51', // Borussia Mönchengladbach
  Q38245: '#E1000F', // Eintracht Frankfurt
  Q104770: '#ED1C24', // 1. FC Köln
  Q32494: '#004D9D', // Schalke 04
  Q4512: '#E32219', // VfB Stuttgart
  Q51976: '#1D9053', // Werder Bremen
  Q101859: '#65B32E', // VfL Wolfsburg
  // France
  Q704: '#143C8C', // Olympique Lyonnais
  Q132885: '#2FAEE0', // Olympique de Marseille
  Q180305: '#E63329', // Monaco
  Q185163: '#C8102E', // OGC Nice
  Q483020: '#004170', // Paris Saint-Germain
  // Netherlands, Belgium, Portugal, Turkey, elsewhere in Europe
  Q81888: '#D2122E', // Ajax
  Q11938: '#ED1C24', // PSV Eindhoven
  Q134241: '#E5202B', // Feyenoord
  Q216032: '#005BAC', // Genk
  Q128446: '#003E7E', // Porto
  Q75729: '#008057', // Sporting CP
  Q172567: '#000000', // Beşiktaş
  Q495299: '#A90432', // Galatasaray
  Q6601875: '#1A2A6C', // Fenerbahçe
  Q189671: '#E2001A', // Basel
  Q193481: '#7B1F27', // Sparta Prague
  Q176371: '#1D3E8A', // CSKA Moscow
  Q170040: '#8B1A1A', // Rubin Kazan
  // The Americas, Asia, the Gulf
  Q170703: '#0A2E6B', // Boca Juniors
  Q276533: '#6CACE4', // Racing Club
  Q80955: '#111111', // Santos
  Q38568: '#C8102E', // São Paulo
  Q5014111: '#1A1A1A', // Vasco da Gama
  Q80987: '#7A1F3D', // Fluminense
  Q506832: '#C8102E', // Athletico Paranaense
  Q18380286: '#C39E6D', // Los Angeles FC
  Q204357: '#00245D', // LA Galaxy
  Q15214308: '#633492', // Orlando City
  Q16844931: '#F7B5CD', // Inter Miami
  Q196107: '#00245E', // Vancouver Whitecaps
  Q308683: '#C41230', // Chicago Fire
  Q844271: '#8B1B3F', // Vissel Kobe
  Q692856: '#43B02A', // Shonan Bellmare
  Q855809: '#E5007F', // Cerezo Osaka
  Q1047535: '#5D2E8C', // Kyoto Sanga
  Q73965: '#2444A0', // Al Hilal
  Q283545: '#1A1A1A', // Al Sadd
  Q1191998: '#005BAC', // Emirates Club
};

/** Ink, for a club with no colour on file. Never guessed from the crest. */
export const NEUTRAL = '#4d4133';

export const clubColour = (id: string | undefined): string =>
  (id && CLUB_COLOUR[id]) || NEUTRAL;

/**
 * The club a given is best known for, where the appearance count would say
 * otherwise. Neymar's 225 for Santos are more than his 123 for Barcelona and
 * nobody in the audience pictures him in white.
 */
const SIGNATURE_CLUB: Record<string, string> = {
  Q142794: 'Q7156', // Neymar — Barcelona
  Q178649: 'Q7156', // Romário — Barcelona
  Q482955: 'Q18656', // Edwin van der Sar — Manchester United
  Q659634: 'Q7156', // Deco — Barcelona
};

/**
 * The club a given wears on the board. Named above, or the club it made
 * the most league appearances for. Leaks nothing: the givens are on the
 * board from the start.
 */
export function signatureClub(p: Player): string | undefined {
  const named = SIGNATURE_CLUB[p.id];
  if (named && p.clubIds.includes(named)) return named;
  const apps = (c: string) => p.spells?.[c]?.[0] ?? 0;
  return [...p.clubIds].sort((a, b) => apps(b) - apps(a))[0];
}
