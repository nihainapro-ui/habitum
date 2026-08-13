'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, dateKey, dayAgenda, today, type EntreeJour } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { CategoryGlyph } from '@/components/ui';
import { EmptyState } from '@/components/shell/empty-state';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';

/* Agenda — la période affichée, à plat et dans l'ordre.

   Le mode le plus simple, et souvent le plus lisible : ni grille, ni
   proportions, seulement ce qui vient, quand. C'est aussi la forme que prend
   le calendrier sous 768 px (D6). */

const ETENDUE = 14;

export function AgendaList({ offset }: { offset: number }) {
  const t = useTranslations('app');
  const { locale } = useLocaleSwitcher();

  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const logIndex = useStore((s) => s.logIndex);

  const jours = useMemo(() => {
    const depart = addDays(today(), offset * ETENDUE);
    return Array.from({ length: ETENDUE }, (_, i) => {
      const date = addDays(depart, i);
      return { date, key: dateKey(date), entrees: dayAgenda(logIndex, habits, tasks, date) };
    }).filter((j) => j.entrees.length > 0);
  }, [offset, logIndex, habits, tasks]);

  const format = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  );

  if (jours.length === 0) {
    return <EmptyState titleKey="app.emAgendaT" bodyKey="app.emAgendaD" />;
  }

  const nom = (e: EntreeJour) => (e.kind === 'habit' ? e.habit.name : e.task.name);
  const categorie = (e: EntreeJour) => (e.kind === 'habit' ? e.habit.category : e.task.category);

  return (
    <section
      className="rounded-panel overflow-hidden border"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      aria-label={t('calAgenda')}
    >
      <ul data-agenda className="m-0 flex list-none flex-col p-0">
        {jours.map((j) => (
          <li
            key={j.key}
            className="border-b last:border-b-0"
            style={{ borderColor: 'var(--line)' }}
          >
            <h3
              className="m-0 px-4 py-2 font-mono text-[9.5px] font-normal tracking-[0.18em] uppercase"
              style={{ color: 'var(--txt2)', background: 'var(--panel2)' }}
            >
              {format.format(j.date)}
            </h3>
            <ul className="m-0 flex list-none flex-col p-0">
              {j.entrees.map((e) => (
                <li
                  key={`${e.kind}-${e.id}`}
                  data-agenda-item
                  className="flex items-center gap-3 border-t px-4 py-2.5"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <span
                    className="w-[42px] flex-none font-mono text-[10.5px]"
                    style={{ color: 'var(--mut)' }}
                  >
                    {e.time ?? '—'}
                  </span>
                  <CategoryGlyph category={categorie(e)} size={24} />
                  <span
                    className="min-w-0 flex-1 truncate text-[13px]"
                    style={{
                      color: e.done ? 'var(--mut)' : 'var(--txt)',
                      textDecoration: e.done ? 'line-through' : 'none',
                    }}
                  >
                    {nom(e)}
                  </span>
                  <span className="text-[10.5px]" style={{ color: 'var(--mut)' }}>
                    {e.kind === 'habit' ? t('habit') : t('task')}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
