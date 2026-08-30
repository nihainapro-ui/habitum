'use client';

import type { ReactNode } from 'react';

/* Barre d'actions d'une vue.
 *
 * REMPLACE `ViewHeader`, qui portait aussi le titre et le sous-titre. Ceux-ci
 * sont remontés dans l'en-tête de la coque (`header.tsx`), là où le prototype
 * les place : `<h1>{{ head.title }}</h1>` vit dans `data-topbar`, pas dans la
 * vue. Les onze vues commencent donc par leur donnée.
 *
 * Ce qui reste ici est ce qui est PROPRE à la vue : le sélecteur de mode du
 * calendrier, la fenêtre des statistiques, le bouton « Nouvelle habitude ».
 * Aligné à droite, comme dans le prototype ; une vue sans action n'en pose
 * simplement pas. */

export function ViewActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
