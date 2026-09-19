/**
 * What a plate says when it asks for a nationality.
 *
 * The pool carries a nation QID and nothing to print it as, so the label is
 * written here by hand, in the form a plate uses: "a German", "an
 * Argentine". Only nations with a shelf of players worth running through are
 * listed — a clue that names a niche nationality collapses the list to one
 * name and there is no puzzle left — and the generator will not set a clue
 * for a nation that is not here.
 */
export const DEMONYM: Readonly<Record<string, string>> = {
  Q21: 'an Englishman',
  Q22: 'a Scot',
  Q25: 'a Welshman',
  Q27: 'an Irishman',
  Q29: 'a Spaniard',
  Q183: 'a German',
  Q38: 'an Italian',
  Q142: 'a Frenchman',
  Q155: 'a Brazilian',
  Q414: 'an Argentine',
  Q55: 'a Dutchman',
  Q45: 'a Portuguese',
  Q31: 'a Belgian',
  Q224: 'a Croatian',
  Q35: 'a Dane',
  Q77: 'a Uruguayan',
  Q739: 'a Colombian',
  Q34: 'a Swede',
  Q20: 'a Norwegian',
  Q36: 'a Pole',
  Q39: 'a Swiss',
  Q40: 'an Austrian',
  Q403: 'a Serb',
  Q43: 'a Turk',
  Q30: 'an American',
  Q96: 'a Mexican',
  Q17: 'a Japanese player',
  Q884: 'a South Korean',
  Q1008: 'an Ivorian',
  Q1041: 'a Senegalese',
  Q1033: 'a Nigerian',
  Q117: 'a Ghanaian',
  Q1009: 'a Cameroonian',
  Q1028: 'a Moroccan',
  Q79: 'an Egyptian',
  Q262: 'an Algerian',
  Q213: 'a Czech',
  Q41: 'a Greek',
  Q212: 'a Ukrainian',
  Q298: 'a Chilean',
  Q408: 'an Australian',
};
