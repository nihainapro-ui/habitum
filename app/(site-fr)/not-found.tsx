import type { Metadata } from 'next';
import { Introuvable } from '@/components/site/pages/introuvable';
import { textes } from '@/lib/site/textes';

/* 404 de la vitrine française.

   Un `not-found.tsx` PAR groupe racine : avec plusieurs layouts racines, Next
   ne peut pas en choisir un pour une URL qui ne correspond à rien. Le relais
   est pris par le fourre-tout `[...introuvable]`, qui rend un 404 statique. */

const LANGUE = 'fr' as const;

export const metadata: Metadata = {
  title: textes(LANGUE).introuvable.titreOnglet,
  // Une page d'erreur n'a rien à faire dans un index.
  robots: { index: false, follow: true },
};

export default function NonTrouve() {
  return <Introuvable langue={LANGUE} />;
}
