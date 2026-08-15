import type { Metadata } from 'next';
import { Fonctionnalites } from '@/components/site/pages/fonctionnalites';
import { metadonneesPage } from '@/lib/site/metadonnees';
import { cheminPage } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Vitrine EN — fonctionnalites.
   Route mince : la page est un composant partagé, paramétré par la langue.
   Tout ce qui vit ici est ce qui NE PEUT PAS être partagé — les métadonnées,
   qui sont propres à l'URL. */

const LANGUE = 'en' as const;
const t = textes(LANGUE).fonctionnalites;

export const metadata: Metadata = metadonneesPage({
  langue: LANGUE,
  chemin: cheminPage('fonctionnalites', LANGUE),
  titre: t.titreOnglet,
  description: t.description,
});

export default function Page() {
  return <Fonctionnalites langue={LANGUE} />;
}
