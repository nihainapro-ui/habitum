import { imageOpenGraph, tailleOpenGraph, typeOpenGraph } from '@/lib/site/og';

/* Image sociale de la vitrine anglaise — tâche 7.2, étape 3.
 *
 * Jumelle de celle du groupe français, dans l'autre langue : une carte sociale
 * en français partagée depuis une page anglaise est une carte qui ne sera pas
 * cliquée. */

/* `force-static` — exigé par `output: 'export'` (construction empaquetée), et
   déjà vrai sans lui : cette image ne dépend d'aucune requête. Les trois autres
   routes de métadonnées — `manifest.ts`, `robots.ts`, `sitemap.ts` — le
   déclarent depuis toujours ; celles-ci manquaient à l'appel. */
export const dynamic = 'force-static';

export const alt = 'Habitum — the habit tracker that never asks for an account';
export const size = tailleOpenGraph;
export const contentType = typeOpenGraph;

export default function Image() {
  return imageOpenGraph('en');
}
