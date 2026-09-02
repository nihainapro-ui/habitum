'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { habitWeek, type Habit } from '@/lib/domain';
import { useHabitMetrics, useSettings, useStore } from '@/lib/store';
import { CategoryGlyph, Ring } from '@/components/ui';
import { useHabitLabels } from './labels';
import { WeekDots } from './WeekDots';

/* Carte d'habitude — 05-SPEC-VUES.md § 4.

   Les trois chiffres (série, record, taux 30 j) viennent de `useHabitMetrics`,
   donc de `lib/domain`, donc des 62 valeurs de référence. Aucun n'est recalculé
   ici : c'est ce qui permet au test e2e de comparer l'écran à `golden.json`. */

export function HabitCard({ habit }: { habit: Habit }) {
  const t = useTranslations('app');
  const tc = useTranslations('cat');
  const { frequence, objectif } = useHabitLabels();
  const metriques = useHabitMetrics(habit.id);
  const { weekStart } = useSettings();
  const logIndex = useStore((s) => s.logIndex);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const openEditor = useStore((s) => s.openEditor);

  const semaine = habitWeek(logIndex, habit, weekStart);
  const but = objectif(habit);
  const pct = metriques?.pct30 ?? 0;
  const pourcentage = `${pct} %`;
  const sousTitre = `${tc(habit.category)} · ${frequence(habit)}`;

  return (
    <article
      aria-label={habit.name}
      className="rounded-panel flex flex-col overflow-hidden border"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <CategoryGlyph category={habit.category} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <button
            type="button"
            onClick={() => openEditor({ kind: 'habit', id: habit.id })}
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold"
            style={{ color: 'var(--txt)' }}
          >
            {habit.name}
          </button>
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
            {sousTitre}
          </span>
          {but ? (
            <span className="text-[11.5px]" style={{ color: 'var(--acc2)' }}>
              {but}
            </span>
          ) : null}
          {habit.archived ? (
            <span className="text-[11px]" style={{ color: 'var(--warn)' }}>
              {t('archived')}
            </span>
          ) : null}
        </div>

        <div className="relative grid h-[52px] w-[52px] flex-none place-items-center">
          <Ring value={pct / 100} label={`${t('colPct')} : ${pourcentage}`} size={52} stroke={5} />
          <span
            data-testid="pct30"
            className="absolute font-mono text-[11.5px] font-bold"
            aria-hidden="true"
          >
            {pourcentage}
          </span>
        </div>

        {/* Le nom cliquable ouvrait déjà l'éditeur (ci-dessus) mais rien ne le
            signalait. Dessin repris à l'identique de ProjectCard.tsx:61-69 —
            même geste, même repère visuel, dans les trois onglets. */}
        <button
          type="button"
          onClick={() => openEditor({ kind: 'habit', id: habit.id })}
          aria-label={t('editFor', { name: habit.name })}
          className="rounded-btn-sm grid h-7 w-7 flex-none cursor-pointer place-items-center border"
          style={{ borderColor: 'var(--line)', color: 'var(--mut)' }}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <WeekDots
          name={habit.name}
          jours={semaine}
          onToggle={(cle) => void toggleHabit(habit.id, cle)}
        />
      </div>

      {/* Sur `--panel2`, plus clair que le fond, `--mut` tombe sous AA pour un
          texte de 8,5 px : les micro-libellés y passent en `--txt2`. */}
      <footer
        className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-4 py-3"
        style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
      >
        <span className="flex items-baseline gap-1.5">
          <span
            data-testid="streak"
            className="font-mono text-[11px]"
            style={{ color: 'var(--warn)' }}
          >
            {metriques?.streak ?? 0}
          </span>
          <span
            className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
            style={{ color: 'var(--txt2)' }}
          >
            {t('streak')}
          </span>
        </span>

        <span className="flex items-baseline gap-1.5">
          <span
            data-testid="best"
            className="font-mono text-[11px]"
            style={{ color: 'var(--acc2)' }}
          >
            {metriques?.best ?? 0}
          </span>
          <span
            className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
            style={{ color: 'var(--txt2)' }}
          >
            {t('colBest')}
          </span>
        </span>

        <span className="flex-1" />

        <Link
          href="/app/stats"
          aria-label={t('statsFor', { name: habit.name })}
          className="rounded-btn border px-3 py-1.5 text-[11px]"
          style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
        >
          {t('statsA')}
        </Link>
      </footer>
    </article>
  );
}
