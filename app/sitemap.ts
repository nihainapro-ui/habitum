import type { MetadataRoute } from 'next';
import { MISE_A_JOUR } from '@/lib/site/contenu/legal';
import { TOUTES_LES_ADRESSES, absolu, cheminPage } from '@/lib/site/routes';

/* sitemap.xml — tâche 7.3.
 *
 * Il est ENGENDRÉ par la table des URL (`lib/site/routes.ts`), jamais rédigé.
 * Un plan de site tenu à la main est un plan de site qui, six mois plus tard,
 * annonce trois pages mortes et en oublie deux vivantes.
 *
 * Il ne contient QUE la vitrine : aucune route applicative, aucune route
 * d'atelier. C'est le pendant de `robots.ts` — dire à un moteur d'explorer
 * `/app` puis lui interdire de l'indexer serait se contredire à voix haute.
 *
 * Chaque entrée porte ses deux alternats de langue, pris de la même table :
 * une page ne peut pas apparaître au plan sans annoncer sa jumelle. */

export const dynamic = 'force-static';

const ACCUEIL_FR = cheminPage('accueil', 'fr');

export default function sitemap(): MetadataRoute.Sitemap {
  const modifieLe = new Date(MISE_A_JOUR);

  return TOUTES_LES_ADRESSES.map((adresse) => ({
    url: absolu(adresse.fr),
    lastModified: modifieLe,
    /* L'accueil est la porte d'entrée ; le reste se vaut. Une échelle de
       priorités plus fine serait du bruit — les moteurs l'ignorent
       massivement, et la remplir finement donne l'illusion d'un réglage. */
    priority: adresse.fr === ACCUEIL_FR ? 1 : 0.7,
    changeFrequency: 'monthly',
    alternates: {
      languages: {
        fr: absolu(adresse.fr),
        en: absolu(adresse.en),
        'x-default': absolu(adresse.fr),
      },
    },
  }));
}
