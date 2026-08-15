import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageArticle } from '@/components/site/pages/article';
import { guide } from '@/lib/site/contenu/guides';
import { GUIDES, cheminGuide, creneauGuide, guideDepuisCreneau } from '@/lib/site/routes';

/* Vitrine EN — guides, une page par article.
   Route mince : la page est un composant partagé, paramétré par la langue.
   Tout ce qui vit ici est ce qui NE PEUT PAS être partagé — les métadonnées,
   qui sont propres à l'URL. */

const LANGUE = 'en' as const;

/* Les créneaux connus sont générés à la construction, et `dynamicParams`
   coupe le reste : une URL inventée rend un 404 STATIQUE, sans invoquer la
   moindre fonction serveur (D12). */
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((id) => ({ creneau: creneauGuide(id, LANGUE) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creneau: string }>;
}): Promise<Metadata> {
  const { creneau } = await params;
  const id = guideDepuisCreneau(creneau, LANGUE);
  if (!id) return {};
  const a = guide(id, LANGUE);
  const { metadonneesPage } = await import('@/lib/site/metadonnees');
  return metadonneesPage({
    langue: LANGUE,
    chemin: cheminGuide(id, LANGUE),
    titre: a.titre,
    description: a.description,
  });
}

export default async function Page({ params }: { params: Promise<{ creneau: string }> }) {
  const { creneau } = await params;
  const id = guideDepuisCreneau(creneau, LANGUE);
  if (!id) notFound();

  return (
    <PageArticle
      langue={LANGUE}
      chemin={cheminGuide(id, LANGUE)}
      article={guide(id, LANGUE)}
      rubrique="guides"
      suite={GUIDES.filter((autre) => autre !== id).map((autre) => ({
        titre: guide(autre, LANGUE).titre,
        chemin: cheminGuide(autre, LANGUE),
      }))}
    />
  );
}
