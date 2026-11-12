'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useEstMobile } from '@/lib/features/mobile';
import { LoadingState } from './loading-state';

/* Une vue, DEUX FORMES, une seule dans le document — refonte mobile.

   Sous 768 px la forme du PDF « Refonte mobile Habitum », au-dessus la forme
   portée du prototype, inchangée. Le choix se fait APRÈS montage : les pages
   sont prérendues (D12) et `matchMedia` n'existe pas côté serveur. D'ici là,
   la vue montre son squelette de chargement.

   POURQUOI PAS LES DEUX FORMES MASQUÉES PAR LE CSS, comme la coque le fait
   pour ses deux en-têtes : une vue rendue deux fois double son DOM — quatre
   cents lignes pour deux cents habitudes — et chaque texte y existe en double
   pour la recette et les outils d'assistance. La coque ne porte que trois
   boutons ; une vue porte tout le journal.

   Le squelette d'avant montage ne se voit pas dans le socle visuel, pris
   après hydratation. Les éléments sont passés déjà construits : React ne
   monte que celui qui est rendu. */
export function Forme({ mobile, bureau }: { mobile: ReactNode; bureau: ReactNode }) {
  const estMobile = useEstMobile();
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  if (!monte) return <LoadingState />;
  return <>{estMobile ? mobile : bureau}</>;
}
