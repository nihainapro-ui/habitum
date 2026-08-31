'use client';

import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { subTaskCount, type Task } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { RowCheck } from '@/components/today/RowCheck';
import { SubList } from '@/components/today/SubList';
import { ActionDrawer } from '@/components/today/ActionDrawer';

/* Une tâche dans la liste — 05-SPEC-VUES.md § 6.

   La puce de priorité répète le mot (« Haute »), elle ne se contente pas
   d'être rouge : trois barres colorées ne disent rien à qui ne distingue pas
   les teintes, et le prototype n'affichait que `❚❚❚`. */

/* Priorité basse en `--txt2` et non `--mut` : sur `--panel2`, plus clair que
   le fond, `--mut` mesure 4,29 à 10,5 px — sous AA. */
const TONS = { 1: 'var(--txt2)', 2: 'var(--warn)', 3: 'var(--bad)' } as const;

export function TaskItem({ task }: { task: Task }) {
  const t = useTranslations('app');
  const tc = useTranslations('cat');

  const toggleTask = useStore((s) => s.toggleTask);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const snoozeTask = useStore((s) => s.snoozeTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const openEditor = useStore((s) => s.openEditor);

  const sous = subTaskCount(task);
  const avancement = sous ? `${sous.done}/${sous.total}` : '';
  const priorite = [t('low'), t('mid'), t('high')][task.priority - 1] ?? t('mid');
  /* Segments SÉPARÉS, et non une chaîne jointe. Jointe, elle se repliait
     n'importe où sur un écran étroit — la capture du 31/08 montre « 2026-08- »
     puis « 31 » à la ligne suivante. Chaque segment porte maintenant
     `whitespace-nowrap` : le retour ne peut tomber qu'ENTRE deux segments. */
  const meta = [tc(task.category), task.time ? `⏰ ${task.time}` : '', task.date].filter(
    Boolean,
  ) as string[];

  return (
    <li
      data-task
      className="flex flex-col border-b px-3 py-3 last:border-b-0 md:px-4"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="flex items-center gap-3">
        <RowCheck name={task.name} checked={task.done} onToggle={() => void toggleTask(task.id)} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[13.5px] font-medium"
              style={{
                color: task.done ? 'var(--mut)' : 'var(--txt)',
                textDecoration: task.done ? 'line-through' : 'none',
              }}
            >
              {task.name}
            </span>
            <span
              className="rounded-chip px-1.5 py-px text-[10.5px] font-semibold"
              style={{ color: TONS[task.priority], background: 'var(--panel2)' }}
            >
              {priorite}
            </span>
          </div>
          <span
            className="flex flex-wrap items-center gap-x-2 font-mono text-[10.5px]"
            style={{ color: 'var(--mut)' }}
          >
            {meta.map((segment, i) => (
              <span key={segment} className="whitespace-nowrap">
                {segment}
                {/* Séparateur EN FIN de segment : placé en tête, il ouvrait la
                    ligne suivante par un point isolé quand le retour tombait
                    là. */}
                {i < meta.length - 1 ? <span aria-hidden="true">&nbsp;·</span> : null}
              </span>
            ))}
          </span>
        </div>

        {sous ? (
          <span
            className="font-mono text-[11px] whitespace-nowrap"
            style={{ color: 'var(--txt2)' }}
          >
            {avancement}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => openEditor({ kind: 'task', id: task.id })}
          aria-label={t('editFor', { name: task.name })}
          className="rounded-btn-sm grid h-7 w-7 flex-none cursor-pointer place-items-center border"
          style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>

        <ActionDrawer
          name={task.name}
          actions={{
            onComplete: () => void toggleTask(task.id),
            onSnooze: () => void snoozeTask(task.id),
            onDelete: () => void deleteTask(task.id),
            note: task.note,
            onNote: (valeur) => void updateTask(task.id, { note: valeur }),
          }}
        />
      </div>

      {sous ? (
        <SubList items={task.subTasks} onToggle={(i) => void toggleSubTask(task.id, i)} />
      ) : null}
    </li>
  );
}
