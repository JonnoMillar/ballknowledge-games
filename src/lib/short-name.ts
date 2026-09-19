/**
 * What goes on a nameplate.
 *
 * Last word by default, which is right for most European names and wrong for
 * exactly the ones football cares about: Diego Ribas da Cunha is Diego, not
 * "Cunha", and Marcelo Antônio Guedes Filho is Marcelo, not "Filho".
 *
 * The proper fix is alias data, and ZERO of the 11,741 players in the pool
 * carry an alias — a known gap in the pipeline. Until it is filled, the names
 * that actually reach a board are listed here. This is a stopgap and should
 * shrink to nothing once aliases land.
 */
const PLATE: Record<string, string> = {
  Q109428: 'Diego', // Diego Ribas da Cunha
  Q721804: 'Marcelo', // Marcelo Antônio Guedes Filho
  Q368441: 'James', // James Rodríguez
  Q15113616: 'André Silva', // distinguishing him from every other Silva
  Q10553748: 'Dele Alli',
  Q18719633: 'Borré', // Rafael Santos Borré
  Q603190: 'Júlio César',
  Q1988686: 'Douglas',
  Q94850: 'Adriano', // Adriano Correia Claro
};

export function plateName(id: string, name: string): string {
  const override = PLATE[id];
  if (override) return override;
  const parts = name.split(' ');
  return parts[parts.length - 1] ?? name;
}
