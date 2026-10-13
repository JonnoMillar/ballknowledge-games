/**
 * Manual corrections applied after normalisation.
 *
 * Wikidata is community-edited and these are live defacements, not bugs in our
 * pipeline. The players are real and belong in the pool; only their labels are
 * wrong, so the fix is a name override rather than exclusion. Spec 8.2.
 *
 * Every entry here was surfaced by `npm run review:names`. Re-run that after
 * any snapshot refresh: entries may become unnecessary when Wikidata is
 * repaired upstream, and new ones will appear.
 */
export const NAME_OVERRIDES: Readonly<Record<string, string>> = {
  Q3779221: 'Guido Carrillo',   // was "Guido Carrillo EL GOAT"
  Q222151: 'João Moutinho',     // was "João Moutinh0" (zero for the letter o)
  Q22082660: 'Roberto Arboleda', // was "Robert0 Arboleda" (zero for the letter o)
  Q44977: 'Pierre-Emerick Aubameyang', // was "Pierre Cardin picha grande"
  Q186330: 'Rafael Márquez',    // was "Rafael Márquez El piojo"
  // Found 2026-09-25 by comparing every name with the enwiki title and the mul
  // label; each confirmed by the player's clubs.
  Q168740: 'Juan Mata',         // was "Juan Mata Pata"
  Q108159340: 'Arda Güler',     // was "Αrda Güler" with a Greek capital alpha, so "Arda" found nothing
  Q22082505: 'Marc Cucurella',  // was "Marc Hagit Cucurella"
  Q310625: 'Marc Bartra',       // was "Ronaldo": a second Ronaldo in search, judged on Bartra's clubs
  Q294204: 'Joaquín',           // was "elpisha"
  Q208436: 'Martín Palermo',    // was "Martín Palermo Dacquino Guillermo"
  Q1392235: 'Anthony Lopes',    // was "Anthony Lopez maresca"
  Q361694: 'Christian Bolaños', // was "Cristian Gamboa", a different player
  Q2118086: 'Alfredo Talavera', // was "Alfredito Olivas"
  Q17086753: 'Sergio Rochet',   // was "Zergio Roquet"
  Q10557534: 'Kahraba',         // was "Kehriba nene"
  Q742136: 'Ali Dia',           // was "mipi lin"
  Q17490: 'Jean Marie Dongou',  // was "Miguel Gordillo", a different player
  Q1845684: 'Lucas Pratto',     // was "Lucas El Oso Pratto"
  Q16582459: 'Nicolás Orsini',  // was "Nicolás Orsigoat"
  Q133760: 'Jordan Spence',     // was "Sebastián romero", a different player
  Q110486192: 'Nestory Irankunda', // was "Nestor Irankunda"
  Q19116103: 'André Onana',     // was "Andrcu Onana" (found 2026-10-12, enwiki title checked)
};

export function applyNameOverride(id: string, name: string): string {
  return NAME_OVERRIDES[id] ?? name;
}
