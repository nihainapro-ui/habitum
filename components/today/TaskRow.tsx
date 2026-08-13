'use client';

import { useTranslations } from 'next-intl';
import { subTaskCount, type EntreeTache } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { ActionDrawer } from './ActionDrawer';
import { RowCheck } from './RowCheck';
import { RowShell } from './RowShell';
import { SubList } from './SubList';

/* Une tâche dans la file d'exécution du jour. */

export function TaskRow({ entree, cochable }: { entree: EntreeTache; cochable: boolean }) {
  const t = useTranslations('app');
  /* Les libellés de récurrence appartiennent à l'éditeur : les redéclarer dans
     l'espace `app` créerait deux vérités pour le même mot. */
  const te = useTranslations('editor');
  const tc = useTranslations('cat');
  const k = entree.task;

  const toggleTask = useStore((s) => s.toggleTask);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const snoozeTask = useStore((s) => s.snoozeTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);

  const sous = subTaskCount(k);
  const repetition = k.recurrence
    ? `⟳ ${k.recurrence.freq === 'daily' ? te('repDaily') : te('repMonth')}`
    : '';

  const meta = [
    tc(k.category),
    k.time ? `⏰ ${k.time}` : '',
    repetition,
    cochable ? '' : t('futureLocked'),
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <RowShell
      category={k.category}
      name={k.name}
      done={k.done}
      tag={t('task')}
      meta={meta || undefined}
      amount={sous ? `${sous.done}/${sous.total}` : undefined}
      ratio={sous ? sous.done / sous.total : null}
      check={
        <RowCheck
          name={k.name}
          checked={k.done}
          disabled={!cochable}
          onToggle={() => void toggleTask(k.id)}
        />
      }
      drawer={
        <ActionDrawer
          name={k.name}
          actions={{
            onComplete: () => void toggleTask(k.id),
            onSnooze: () => void snoozeTask(k.id),
            onDelete: () => void deleteTask(k.id),
            note: k.note,
            onNote: (valeur) => void updateTask(k.id, { note: valeur }),
          }}
        />
      }
      sub={
        k.subTasks.length ? (
          <SubList
            items={k.subTasks}
            disabled={!cochable}
            onToggle={(i) => void toggleSubTask(k.id, i)}
          />
        ) : null
      }
    />
  );
}
