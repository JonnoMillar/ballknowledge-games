/**
 * Club colours, by hand.
 *
 * A dominant-colour extractor over the crest PNGs was built first and is about
 * 75% right — it takes City's navy ring over the sky blue, and Barcelona's
 * crest gold over the claret. A wrong colour is the most visible error on a
 * board, so the clubs that actually appear are named here and everything else
 * falls back to ink.
 *
 * Server-safe: the sheet generator and the board both read this, and one of
 * them is a script.
 */
export const CLUB_COLOUR: Record<string, string> = {
  Q5794: '#003399', // Everton
  Q7156: '#A50044', // Barcelona
  Q10467: '#A50044', // Barcelona Atlètic
  Q2346842: '#A50044', // Barcelona C
  Q9616: '#034694', // Chelsea
  Q8682: '#FEBE10', // Real Madrid — the gold, since the shirt is white
  Q483020: '#004170', // Paris Saint-Germain
  Q8701: '#CB3524', // Atlético Madrid
  Q18656: '#DA291C', // Manchester United
  Q50602: '#6CABDD', // Manchester City
  Q172567: '#000000', // Beşiktaş
  Q18741: '#132257', // Tottenham Hotspur
  Q704: '#143C8C', // Olympique Lyonnais
  Q51976: '#1D9053', // Werder Bremen
  Q1422: '#000000', // Juventus
  Q180305: '#E63329', // Monaco
  Q10315: '#0067B1', // Real Sociedad
  Q844271: '#8B1B3F', // Vissel Kobe
  Q18380286: '#C39E6D', // Los Angeles FC
  Q15214308: '#633492', // Orlando City
  Q16844931: '#F7B5CD', // Inter Miami
  Q216032: '#005BAC', // Genk
  Q185163: '#C8102E', // OGC Nice
  Q1191998: '#005BAC', // Emirates Club
  Q15789: '#DC052D', // Bayern Munich
  Q18747: '#7A263A', // West Ham United
  Q1130: '#EF0107', // Arsenal
  Q1130285: '#C8102E', // Liverpool
  Q631: '#0068A8', // Inter Milan
  Q1543: '#FB090B', // AC Milan
  Q8682000: '#FEBE10',
};

/** Ink, for a club with no colour on file. Never guessed from the crest. */
export const NEUTRAL = '#4d4133';

export const clubColour = (id: string | undefined): string =>
  (id && CLUB_COLOUR[id]) || NEUTRAL;

/**
 * The club a given is best known for. Used for a single-colour ring, which
 * leaks nothing: the givens are on the board from the start.
 */
export const SIGNATURE_CLUB: Record<string, string> = {
  Q615: 'Q7156', // Messi — Barcelona
  Q73360: 'Q8682', // Courtois — Real Madrid
  Q43729: 'Q7156', // Iniesta — Barcelona
  Q1907: 'Q18741', // Lloris — Tottenham
  Q455462: 'Q8701', // Griezmann — Atlético
  Q129027: 'Q18656', // Pogba — Manchester United
};

/**
 * The two clubs that made a player fit, as a diagonal.
 *
 * The hairline is not decoration. Tottenham navy against Beşiktaş black, or
 * Barcelona claret against Everton blue, read as one solid dark border and the
 * split — the whole idea — disappears. A pale line at the boundary keeps it
 * legible whatever two colours land next to each other.
 */
export function splitRing(a: string, b: string, seam = '#f7f2e6'): string {
  if (a === b) return a;
  return `linear-gradient(126deg, ${a} 0 calc(50% - 0.75px), ${seam} calc(50% - 0.75px) calc(50% + 0.75px), ${b} calc(50% + 0.75px) 100%)`;
}
