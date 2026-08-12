'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { groupTasks, GROUPES_TACHE, type GroupeTache } from '@/lib/domain';
import { useSettings, useStore } from '@/lib/store';
import { EmptyState } from '@/components/shell/empty-state';
import { PrimaryButton } from '@/components/shell/primary-button';
import { ViewHeader } from '@/components/shell/view-header';
import { ShoppingList } from './ShoppingList';
import { TaskItem } from './TaskItem';

/* Vue « Tâches » — 05-SPEC-VUES.md § 6. */

const TITRES: Record<GroupeTache, string> = {
  today: 'today',
  tomorrow: 'nextDay',
  week: 'thisWeek',
  later: 'more',
  done: 'done',
};

export function TasksView() {
  const t = useTranslations('app');
  const tasks = useStore((s) => s.tasks);
  const openEditor = useStore((s) => s.openEditor);
  const { weekStart } = useSettings();

  const groupes = useMemo(() => groupTasks(tasks, weekStart), [tasks, weekStart]);
  const nouveau = (
    <PrimaryButton onClick={() => openEditor({ kind: 'task', id: null })}>
      {t('newItem')}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader titleKey="navTasks" subKey="tasksSub" actions={nouveau} />

      <div className="grid grid-cols-1 items-start gap-4 min-[1060px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {tasks.length === 0 ? (
            <EmptyState titleKey="app.emTasksT" bodyKey="app.emTasksD" action={nouveau} />
          ) : (
            GROUPES_TACHE.filter((cle) => groupes[cle].length > 0).map((cle) => (
              <section
                key={cle}
                aria-label={t(TITRES[cle])}
                className="rounded-panel overflow-hidden border"
                style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
              >
                <header
                  className="flex items-center gap-3 border-b px-4 py-3.5"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <h2
                    className="m-0 flex-1 font-mono text-[9.5px] font-normal tracking-[0.18em] uppercase"
                    style={{ color: 'var(--mut)' }}
                  >
                    {t(TITRES[cle])}
                  </h2>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--acc2)' }}>
                    {groupes[cle].length}
                  </span>
                </header>

                <ul className="m-0 flex list-none flex-col p-0">
                  {groupes[cle].map((k) => (
                    <TaskItem key={k.id} task={k} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <ShoppingList />
      </div>
    </div>
  );
}
