'use client';

import { useMemo } from 'react';
import { useDayAgenda, useJourAffiche } from '@/lib/store';
import { ViewHeader } from '@/components/shell/view-header';
import { DayNav } from './DayNav';
import { DayStrip } from './DayStrip';
import { FilterBar } from './FilterBar';
import { UnifiedList } from './UnifiedList';

/* Vue « Aujourd'hui » — exécution séquentielle de la journée.
   05-SPEC-VUES.md § 2. */

export function TodayView() {
  const date = useJourAffiche();
  const entrees = useDayAgenda(date);
  /* Le jour affiché sert de clé de rendu à la liste : sans elle, changer de
     jour réutiliserait les lignes en place et une case cochée resterait
     visuellement cochée le temps d'un rendu. */
  const cle = useMemo(() => date.getTime(), [date]);

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader titleKey="navToday" subKey="todaySub" />

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
