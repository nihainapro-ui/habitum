'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDayAgenda, useJourAffiche } from '@/lib/store';
import { useEstMobile } from '@/lib/features/mobile';
import { LoadingState } from '@/components/shell/loading-state';
import { DayNav } from './DayNav';
import { DayStrip } from './DayStrip';
import { FilterBar } from './FilterBar';
import { UnifiedList } from './UnifiedList';
import { TodayMobile } from './mobile/TodayMobile';

/* Vue « Aujourd'hui » — exécution séquentielle de la journée.
   05-SPEC-VUES.md § 2.

   DEUX FORMES, une seule dans le document. Sous 768 px, la forme de la
   refonte mobile (`mobile/TodayMobile.tsx`, PDF p. 5) ; au-dessus, la forme
   portée du prototype, inchangée. Le choix se fait APRÈS montage
   (`useEstMobile`), et d'ici là la vue montre son squelette de chargement —
   les pages sont prérendues (D12), et `matchMedia` n'existe pas côté serveur.

   POURQUOI PAS LES DEUX FORMES MASQUÉES PAR LE CSS, comme la coque le fait
   pour ses deux en-têtes : une liste rendue deux fois double le DOM de la vue
   la plus chargée du produit — deux cents habitudes, quatre cents lignes — et
   chaque texte y existe en double pour la recette et les outils d'assistance.
   La coque ne porte que trois boutons ; la vue porte tout le journal du jour.

   Le squelette d'avant montage ne se voit pas dans le socle visuel, pris
   après hydratation, et `DayStrip` attendait déjà le montage pour la même
   raison : la date. */

export function TodayView() {
  const date = useJourAffiche();
  const entrees = useDayAgenda(date);
  const mobile = useEstMobile();
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  /* Le jour affiché sert de clé de rendu à la liste : sans elle, changer de
     jour réutiliserait les lignes en place et une case cochée resterait
     visuellement cochée le temps d'un rendu. */
  const cle = useMemo(() => date.getTime(), [date]);

  if (!monte) return <LoadingState />;

  if (mobile) return <TodayMobile date={date} entrees={entrees} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <DayNav />
        <div className="flex-1" />
        <FilterBar />
      </div>

      <DayStrip />
      <UnifiedList key={cle} date={date} entrees={entrees} />
    </div>
  );
}
