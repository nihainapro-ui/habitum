import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageArticle } from '@/components/site/pages/article';
import { comparatif } from '@/lib/site/contenu/comparatifs';
import {
  COMPARATIFS,
  cheminComparatif,
  creneauComparatif,
  comparatifDepuisCreneau,
} from '@/lib/site/routes';

/* Vitrine EN — comparatifs, une page par article.
   Route mince : la page est un composant partagé, paramétré par la langue.
   Tout ce qui vit ici est ce qui NE PEUT PAS être partagé — les métadonnées,
   qui sont propres à l'URL. */

const LANGUE = 'en' as const;

/* Les créneaux connus sont générés à la construction, et `dynamicParams`
   coupe le reste : une URL inventée rend un 404 STATIQUE, sans invoquer la
   moindre fonction serveur (D12). */
export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARATIFS.map((id) => ({ creneau: creneauComparatif(id, LANGUE) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creneau: string }>;
}): Promise<Metadata> {
  const { creneau } = await params;
  const id = comparatifDepuisCreneau(creneau, LANGUE);
  if (!id) return {};
  const a = comparatif(id, LANGUE);
  const { metadonneesPage } = await import('@/lib/site/metadonnees');
  return metadonneesPage({
    langue: LANGUE,
    chemin: cheminComparatif(id, LANGUE),
    titre: a.titre,
    description: a.description,
  });
}

export default async function Page({ params }: { params: Promise<{ creneau: string }> }) {
  const { creneau } = await params;
  const id = comparatifDepuisCreneau(creneau, LANGUE);
  if (!id) notFound();

  return (
    <PageArticle
      langue={LANGUE}
      chemin={cheminComparatif(id, LANGUE)}
      article={comparatif(id, LANGUE)}
      rubrique="comparatifs"
      suite={COMPARATIFS.filter((autre) => autre !== id).map((autre) => ({
        titre: comparatif(autre, LANGUE).titre,
        chemin: cheminComparatif(autre, LANGUE),
      }))}
    />
  );
}
