'use client';

import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { EmptyState } from '@/components/shell/empty-state';
import { Forme } from '@/components/shell/forme';
import { PrimaryButton } from '@/components/shell/primary-button';
import { ViewActions } from '@/components/shell/view-actions';
import { GoalCard } from './GoalCard';
import { GoalsMobile } from './mobile/GoalsMobile';

/* Vue « Objectifs » — 05-SPEC-VUES.md § 7.

   Deux formes : sous 768 px `mobile/GoalsMobile.tsx` (refonte mobile, P3
   lot 2) ; au-dessus, la forme portée du prototype, inchangée — à un geste
   près, commun aux deux : les jalons se cochent. */

export function GoalsView() {
  return <Forme mobile={<GoalsMobile />} bureau={<GoalsBureau />} />;
}

function GoalsBureau() {
  const t = useTranslations('app');
  const goals = useStore((s) => s.goals);
  const openEditor = useStore((s) => s.openEditor);

  const nouveau = (
    <PrimaryButton onClick={() => openEditor({ kind: 'goal', id: null })}>
      {t('objNew')}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <ViewActions>{nouveau}</ViewActions>

      {goals.length === 0 ? (
        <EmptyState titleKey="app.emGoalsT" bodyKey="app.emGoalsD" action={nouveau} />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[1060px]:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
