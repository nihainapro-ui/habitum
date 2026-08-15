import { imageOpenGraph, tailleOpenGraph, typeOpenGraph } from '@/lib/site/og';

/* Image sociale de la vitrine française — tâche 7.2, étape 3.
 *
 * Placée au niveau du layout RACINE du groupe : elle sert de repli à toutes les
 * pages françaises, sans qu'aucune ait à la redéclarer. */

export const alt = 'Habitum — le suivi d’habitudes qui ne demande pas de compte';
export const size = tailleOpenGraph;
export const contentType = typeOpenGraph;

export default function Image() {
  return imageOpenGraph('fr');
}
