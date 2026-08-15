import type { Metadata } from 'next';
import { PageLegale } from '@/components/site/pages/legale';
import { metadonneesPage } from '@/lib/site/metadonnees';
import { cheminPage } from '@/lib/site/routes';
import { textes } from '@/lib/site/textes';

/* Vitrine EN — mentions.
   Route mince : la page est un composant partagé, paramétré par la langue.
   Tout ce qui vit ici est ce qui NE PEUT PAS être partagé — les métadonnées,
   qui sont propres à l'URL. */

const LANGUE = 'en' as const;
const t = textes(LANGUE).mentions;

export const metadata: Metadata = metadonneesPage({
  langue: LANGUE,
  chemin: cheminPage('mentions', LANGUE),
  titre: t.titreOnglet,
  description: t.description,
});

export default function Page() {
  return <PageLegale langue={LANGUE} page="mentions" />;
}
