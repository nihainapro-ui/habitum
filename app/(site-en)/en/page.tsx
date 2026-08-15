import type { Metadata } from 'next';
import { Accueil } from '@/components/site/pages/accueil';
import { metadonneesPage } from '@/lib/site/metadonnees';
import { cheminPage } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Vitrine EN — accueil.
   Route mince : la page est un composant partagé, paramétré par la langue.
   Tout ce qui vit ici est ce qui NE PEUT PAS être partagé — les métadonnées,
   qui sont propres à l'URL. */

const LANGUE = 'en' as const;
const t = textes(LANGUE).accueil;

export const metadata: Metadata = metadonneesPage({
  langue: LANGUE,
  chemin: cheminPage('accueil', LANGUE),
  titre: t.titreOnglet,
  description: t.description,
  titreEntier: true,
});

export default function Page() {
  return <Accueil langue={LANGUE} />;
}
