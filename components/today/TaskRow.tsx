'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { subTaskCount, type EntreeTache } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { ActionDrawer } from './ActionDrawer';
import { RowCheck } from './RowCheck';
import { RowShell } from './RowShell';
import { SubList } from './SubList';

/* Une tâche dans la file d'exécution du jour. */

interface ProprietesLigne {
  entree: EntreeTache;
  cochable: boolean;
}

/* Même raison que pour `HabitRow` (tâche 5.10) : les entrées sont
   reconstruites à chaque écriture, et seules ces quatre valeurs décident de ce
   qui s'affiche. */
const memesValeurs = (a: ProprietesLigne, b: ProprietesLigne): boolean =>
  a.cochable === b.cochable &&
  a.entree.done === b.entree.done &&
  a.entree.date === b.entree.date &&
  a.entree.task === b.entree.task;

function LigneTache({ entree, cochable }: ProprietesLigne) {
  const t = useTranslations('app');
  /* Les libellés de récurrence appartiennent à l'éditeur : les redéclarer dans
     l'espace `app` créerait deux vérités pour le même mot. */
  const te = useTranslations('editor');
  const tc = useTranslations('cat');
  const k = entree.task;

  /* Cocher une tâche, c'est la cocher POUR CE JOUR : une tâche récurrente
     n'est pas terminée, elle est faite aujourd'hui (tâche 5.6). */
  const toggleTaskOn = useStore((s) => s.toggleTaskOn);
  const openEditor = useStore((s) => s.openEditor);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const snoozeTask = useStore((s) => s.snoozeTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);

  const sous = subTaskCount(k);
  const CLES_FREQ = { daily: 'repDaily', weekly: 'repWeek', monthly: 'repMonth' } as const;
  const repetition = k.recurrence ? `⟳ ${te(CLES_FREQ[k.recurrence.freq])}` : '';

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
      done={entree.done}
      tag={t('task')}
      meta={meta || undefined}
      amount={sous ? `${sous.done}/${sous.total}` : undefined}
      ratio={sous ? sous.done / sous.total : null}
      check={
        <RowCheck
          name={k.name}
          checked={entree.done}
          disabled={!cochable}
          onToggle={() => void toggleTaskOn(k.id, entree.date)}
        />
      }
      drawer={
        <ActionDrawer
          name={k.name}
          actions={{
            onComplete: () => void toggleTaskOn(k.id, entree.date),
            onEdit: () => openEditor({ kind: 'task', id: k.id }),
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

export const TaskRow = memo(LigneTache, memesValeurs);
