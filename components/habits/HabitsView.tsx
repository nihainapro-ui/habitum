'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { sortHabitsCatalog } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { EmptyState } from '@/components/shell/empty-state';
import { PrimaryButton } from '@/components/shell/primary-button';
import { ViewActions } from '@/components/shell/view-actions';
import { Forme } from '@/components/shell/forme';
import { HabitCard } from './HabitCard';
import { HabitsMobile } from './mobile/HabitsMobile';

/* Vue « Habitudes » — le catalogue. 05-SPEC-VUES.md § 4.

   Deux formes : sous 768 px `mobile/HabitsMobile.tsx` (refonte mobile, PDF
   p. 6) ; au-dessus, la forme portée du prototype, inchangée.

   Les archivées passent en fin de liste plutôt que de disparaître : elles ne
   sont plus planifiées, mais leur historique existe et doit rester atteignable
   (c'est la différence entre archiver et supprimer). */

export function HabitsView() {
  return <Forme mobile={<HabitsMobile />} bureau={<HabitsBureau />} />;
}

function HabitsBureau() {
  const t = useTranslations('app');
  const habits = useStore((s) => s.habits);
  const openEditor = useStore((s) => s.openEditor);

  const triees = useMemo(() => sortHabitsCatalog(habits), [habits]);

  const nouveau = (
    <PrimaryButton onClick={() => openEditor({ kind: 'habit', id: null })}>
      {t('newHabit')}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <ViewActions>{nouveau}</ViewActions>

      {triees.length === 0 ? (
        <EmptyState titleKey="app.emHabitsT" bodyKey="app.emHabitsD" action={nouveau} />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[1060px]:grid-cols-2">
          {triees.map((h) => (
            <HabitCard key={h.id} habit={h} />
          ))}
        </div>
      )}
    </div>
  );
}
