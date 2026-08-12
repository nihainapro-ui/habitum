'use client';

import { useTranslations } from 'next-intl';
import { dateKey, estCochable, type EntreeJour } from '@/lib/domain';
import { useDayRatio } from '@/lib/store';
import { HabitRow } from './HabitRow';
import { TaskRow } from './TaskRow';

/* La file d'exécution : habitudes et tâches du jour, dans l'ordre où la
   journée se vit. L'en-tête porte l'avancement — fait sur planifié. */

export function UnifiedList({ date, entrees }: { date: Date; entrees: EntreeJour[] }) {
  const t = useTranslations('app');
  const { scheduled, done, ratio } = useDayRatio(date);
  const cochable = estCochable(date);
  const jour = dateKey(date);
  /* Composé hors du JSX : `jsx-no-literals` interdit jusqu'aux gabarits, et
     c'est ce qui garantit qu'aucun libellé ne s'y glisse par inadvertance. */
  const avancement = `${done}/${scheduled}`;

  return (
    <section
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
          {t('queueT')}
        </h2>
        <span className="font-mono text-[10px]" style={{ color: 'var(--acc2)' }}>
          {avancement}
        </span>
        <span
          aria-hidden="true"
          className="rounded-pill h-[5px] w-[104px] flex-none overflow-hidden"
          style={{ background: 'var(--panel2)' }}
        >
          <span
            className="block h-full"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              background: 'linear-gradient(90deg, var(--acc), var(--acc2))',
              transition: 'width .5s ease',
            }}
          />
        </span>
      </header>

      {entrees.length === 0 ? (
        <p className="m-0 px-4 py-10 text-center text-[13px]" style={{ color: 'var(--mut)' }}>
          {t('allClear')}
        </p>
      ) : (
        <ul data-queue className="m-0 flex list-none flex-col p-0">
          {entrees.map((e) =>
            e.kind === 'habit' ? (
              <HabitRow key={`h-${e.id}`} entree={e} date={jour} cochable={cochable} />
            ) : (
              <TaskRow key={`t-${e.id}`} entree={e} cochable={cochable} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
