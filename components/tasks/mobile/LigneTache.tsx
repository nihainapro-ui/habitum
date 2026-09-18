'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  addDays,
  dateKey,
  estEnRetard,
  parseKey,
  subTaskCount,
  today,
  type Task,
} from '@/lib/domain';
import { useStore } from '@/lib/store';
import { CategoryGlyph, FeuilleConfirmation } from '@/components/ui';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { FeuilleMenu } from '@/components/shell/feuille-menu';
import { FeuilleNote } from '@/components/shell/feuille-note';
import { RowCheck } from '@/components/today/RowCheck';
import { SubList } from '@/components/today/SubList';
import { FeuilleReport } from './FeuilleReport';

/* Une tâche dans la liste, sur téléphone — refonte mobile, PDF p. 8 et 17 :
   « case 44 px · icône catégorie · nom · méta · action droite ».

   La priorité est un carré coloré ET un mot ; la récurrence, ↻ ET un mot ;
   le retard est ÉCRIT en rouge sur la ligne, dans le groupe « Aujourd'hui »
   où le domaine la range (`estEnRetard`, arbitrage du 18/09). La date est
   lisible — « Hier », « Demain », « ven. 18 sept. » — c'est de la mise en
   forme, pas du calcul.

   L'appui sur le nom ouvre la feuille de menu : Modifier · Marquer fait ·
   Reporter · Note · Supprimer (confirmation). Le glissement à gauche vers
   Focus et à droite pour reporter restent ceux d'Aujourd'hui, et ne sont pas
   repris ici : la liste défile, et un geste horizontal sur une liste longue
   se déclenche trop souvent sans le vouloir. */

const TONS = { 1: 'var(--txt2)', 2: 'var(--warn)', 3: 'var(--bad)' } as const;
const CLES_FREQ = { daily: 'repDaily', weekly: 'repWeek', monthly: 'repMonth' } as const;

export function useLibelleDate() {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();
  const format = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
    [locale],
  );
  return (cle: string): string => {
    const now = today();
    if (cle === dateKey(now)) return t('today');
    if (cle === dateKey(addDays(now, -1))) return t('mobYesterday');
    if (cle === dateKey(addDays(now, 1))) return t('grpTomorrow');
    const d = parseKey(cle);
    return d ? format.format(d) : cle;
  };
}

export function LigneTache({ task }: { task: Task }) {
  const t = useTranslations('app');
  const te = useTranslations('editor');
  const tc = useTranslations('cat');
  const libelleDate = useLibelleDate();

  const toggleTaskOn = useStore((s) => s.toggleTaskOnAnnulable);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const updateTask = useStore((s) => s.updateTask);
  const openEditor = useStore((s) => s.openEditor);

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [report, setReport] = useState(false);
  const [note, setNote] = useState(false);
  const [confirmer, setConfirmer] = useState(false);

  const sous = subTaskCount(task);
  const retard = estEnRetard(task);
  const prio = [t('low'), t('mid'), t('high')][task.priority - 1] ?? t('mid');
  const meta = [
    tc(task.category),
    task.time ?? '',
    libelleDate(task.date),
    task.recurrence ? `⟳ ${te(CLES_FREQ[task.recurrence.freq])}` : '',
  ].filter(Boolean);

  const basculer = () => void toggleTaskOn(task.id, task.date);

  return (
    <li
      data-task
      className="flex flex-col border-b last:border-b-0"
      style={{ borderBottomColor: 'var(--line)' }}
    >
      <div className="flex min-h-[64px] items-center gap-2.5 px-3 py-2">
        <RowCheck name={task.name} checked={task.done} onToggle={basculer} size={44} rond />
        <CategoryGlyph category={task.category} size={30} />

        <button
          type="button"
          onClick={() => setMenuOuvert(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOuvert}
          data-name
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 border-0 bg-transparent p-0 text-left"
          style={{ color: 'inherit', font: 'inherit' }}
        >
          <span
            className="text-[14px] leading-snug font-medium"
            style={{
              color: task.done ? 'var(--mut)' : 'var(--txt)',
              textDecoration: task.done ? 'line-through' : 'none',
            }}
          >
            {task.name}
          </span>
          <span
            className="flex flex-wrap items-center gap-x-1.5 font-mono text-[10.5px] leading-snug"
            style={{ color: 'var(--mut)' }}
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ background: TONS[task.priority] }}
              />
              {t('mobPrio', { p: prio.toLowerCase() })}
            </span>
            {meta.map((m) => (
              <span key={m} className="whitespace-nowrap">
                · {m}
              </span>
            ))}
            {retard ? (
              <span
                data-overdue
                className="whitespace-nowrap font-semibold"
                style={{ color: 'var(--bad)' }}
              >
                · {t('mobOverdue')}
              </span>
            ) : null}
          </span>
        </button>

        {sous ? (
          <span
            className="flex-none font-mono text-[12px] whitespace-nowrap"
            style={{ color: 'var(--txt2)' }}
          >
            {sous.done}/{sous.total}
          </span>
        ) : null}
      </div>

      {sous ? (
        <SubList
          items={task.subTasks}
          onToggle={(i) => void toggleSubTask(task.id, i)}
          indent={98}
        />
      ) : null}

      <FeuilleMenu
        open={menuOuvert}
        onOpenChange={setMenuOuvert}
        title={task.name}
        description={t('moreA')}
        items={[
          { label: t('edit'), onSelect: () => openEditor({ kind: 'task', id: task.id }) },
          { label: task.done ? t('mobMarkUndone') : t('markDone'), onSelect: basculer },
          { label: t('mobSnoozeTitle'), onSelect: () => setReport(true) },
          { label: t('addNote'), onSelect: () => setNote(true) },
          { label: t('delete'), tone: 'bad', onSelect: () => setConfirmer(true) },
        ]}
      />

      <FeuilleReport open={report} onOpenChange={setReport} task={task} />

      <FeuilleNote
        open={note}
        onOpenChange={setNote}
        title={task.name}
        value={task.note}
        onSave={(v) => void updateTask(task.id, { note: v })}
      />

      <FeuilleConfirmation
        open={confirmer}
        onOpenChange={setConfirmer}
        question={t('mobDelTaskAsk', { name: task.name })}
        consequence={t('mobDelTaskD')}
        actionLabel={t('delete')}
        keepLabel={t('keep')}
        onConfirm={() => {
          setConfirmer(false);
          void deleteTask(task.id);
        }}
      />
    </li>
  );
}
