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
};

export function applyNameOverride(id: string, name: string): string {
  return NAME_OVERRIDES[id] ?? name;
}
