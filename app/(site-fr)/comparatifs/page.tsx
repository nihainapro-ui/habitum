import type { Metadata } from 'next';
import { PageRubrique } from '@/components/site/pages/rubrique';
import { metadonneesPage } from '@/lib/site/metadonnees';
import { cheminPage } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Vitrine FR — comparatifs.
   Route mince : la page est un composant partagé, paramétré par la langue.
   Tout ce qui vit ici est ce qui NE PEUT PAS être partagé — les métadonnées,
   qui sont propres à l'URL. */

const LANGUE = 'fr' as const;
const t = textes(LANGUE).comparatifs;

export const metadata: Metadata = metadonneesPage({
  langue: LANGUE,
  chemin: cheminPage('comparatifs', LANGUE),
  titre: t.titreOnglet,
  description: t.description,
});

export default function Page() {
  return <PageRubrique langue={LANGUE} rubrique="comparatifs" />;
}
