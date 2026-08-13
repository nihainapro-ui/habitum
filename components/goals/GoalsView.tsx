'use client';

import { useTranslations } from 'next-intl';
import { useStore } from '@/lib/store';
import { EmptyState } from '@/components/shell/empty-state';
import { PrimaryButton } from '@/components/shell/primary-button';
import { ViewHeader } from '@/components/shell/view-header';
import { GoalCard } from './GoalCard';

/* Vue « Objectifs » — 05-SPEC-VUES.md § 7. */

export function GoalsView() {
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
      <ViewHeader titleKey="navGoals" subKey="goalsSub" actions={nouveau} />

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
