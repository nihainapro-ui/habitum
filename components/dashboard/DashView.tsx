'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  bestStreakOverall,
  dateKey,
  dayAgenda,
  daysBack,
  goalProgress,
  shouldNagExport,
  splitHeuresMinutes,
  today,
} from '@/lib/domain';
import { useDayRatio, useFocusMinutes, useStore } from '@/lib/store';
import { CategoryGlyph, Panel, Ring } from '@/components/ui';
import { EmptyState } from '@/components/shell/empty-state';
import { ViewHeader } from '@/components/shell/view-header';
import { RowCheck } from '@/components/today/RowCheck';

/* Vue « Tableau de bord » — 05-SPEC-VUES.md § 1.

   Elle n'introduit AUCUN calcul : anneau, compteurs, mini-carte et objectifs
   lisent les mêmes fonctions que les vues détaillées. Un tableau de bord qui
   recalculerait à sa façon afficherait tôt ou tard un autre chiffre que la vue
   qu'il résume. */

const JOURS_MINI = 30;
const MAX_TACHES = 5;

export function DashView() {
  const t = useTranslations('app');
  const ts = useTranslations('system');

  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);
  const notes = useStore((s) => s.notes);
  const logIndex = useStore((s) => s.logIndex);
  const lastExport = useStore((s) => s.lastExport);
  const nagDismissed = useStore((s) => s.nagDismissed);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const toggleTask = useStore((s) => s.toggleTask);
  const dismissExportNag = useStore((s) => s.dismissExportNag);

  const jour = dateKey(today());
  const { scheduled, done, ratio } = useDayRatio(today());
  const focus = useFocusMinutes(30);
  const { h, m } = splitHeuresMinutes(focus);

  const entrees = useMemo(
    () => dayAgenda(logIndex, habits, tasks, today()),
    [logIndex, habits, tasks],
  );
  const habitudesDuJour = entrees.filter((e) => e.kind === 'habit');
  const restantes = tasks.filter((k) => !k.done && k.date >= jour).length;
  const record = useMemo(() => bestStreakOverall(logIndex, habits), [logIndex, habits]);
  const mini = useMemo(
    () => daysBack(logIndex, habits, tasks, JOURS_MINI),
    [logIndex, habits, tasks],
  );

  const prochaines = useMemo(
    () =>
      tasks
        .filter((k) => !k.done && k.date >= jour)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
        .slice(0, MAX_TACHES),
    [tasks, jour],
  );

  const rappel = shouldNagExport({
    lastExport,
    dismissed: nagDismissed,
    hasData: habits.length + tasks.length + notes.length > 0,
  });

  const compteurs = [
    { cle: 'habits', libelle: t('habitsToday'), valeur: `${done}/${scheduled}` },
    { cle: 'tasks', libelle: t('prioTasks'), valeur: String(restantes) },
    { cle: 'streak', libelle: t('colBest'), valeur: String(record) },
    { cle: 'focus', libelle: t('focusTime'), valeur: `${h} h ${m}` },
  ];

  /* Composés hors du JSX : `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const avancement = `${done}/${scheduled}`;
  const pourcentage = (n: number) => `${n} %`;
  const vide = habits.length === 0 && tasks.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <ViewHeader titleKey="navDash" subKey="dashSub" />

      {/* D8 — refusable, et il ne revient pas. */}
      {rappel ? (
        <section
          role="status"
          className="rounded-panel flex flex-wrap items-center gap-3 border p-4"
          style={{ borderColor: 'var(--warn)', background: 'var(--panel)' }}
        >
          <div className="flex min-w-[240px] flex-1 flex-col">
            <span className="text-[13px] font-semibold">{ts('nagT')}</span>
            <span className="text-[12px]" style={{ color: 'var(--mut)' }}>
              {ts('nagD')}
            </span>
          </div>
          <Link
            href="/app/settings"
            className="rounded-btn border px-3 py-1.5 text-[12px]"
            style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
          >
            {ts('nagNow')}
          </Link>
          <button
            type="button"
            onClick={() => void dismissExportNag()}
            className="rounded-btn cursor-pointer border px-3 py-1.5 text-[12px]"
            style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
          >
            {ts('nagLater')}
          </button>
        </section>
      ) : null}

      <section
        className="rounded-panel flex flex-wrap items-center gap-5 border p-5"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      >
        <div className="relative grid h-[108px] w-[108px] flex-none place-items-center">
          <Ring
            value={ratio}
            label={`${t('todayProgress')} : ${done} / ${scheduled}`}
            size={108}
            stroke={8}
          />
          <span data-testid="day-ratio" className="absolute font-mono text-[20px] font-bold">
            {avancement}
          </span>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 min-[1060px]:grid-cols-4">
          {compteurs.map((c) => (
            <div
              key={c.cle}
              className="rounded-field border p-3"
              style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
            >
              <div
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--txt2)' }}
              >
                {c.libelle}
              </div>
              <div
                data-testid={`compteur-${c.cle}`}
                className="mt-1 font-mono text-[20px] font-bold"
              >
                {c.valeur}
              </div>
            </div>
          ))}
        </div>
      </section>

      {vide ? (
        <EmptyState titleKey="app.emHabitsT" bodyKey="app.emHabitsD" />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 min-[1060px]:grid-cols-2">
          <Panel
            title={t('habitsToday')}
            padding={0}
            actions={
              <Link href="/app/today" className="text-[11.5px]">
                {t('seeAll')}
              </Link>
            }
          >
            {habitudesDuJour.length === 0 ? (
              <p
                className="m-0 px-4 py-8 text-center text-[12.5px]"
                style={{ color: 'var(--mut)' }}
              >
                {t('allClear')}
              </p>
            ) : (
              <ul data-dash-habits className="m-0 flex list-none flex-col p-0">
                {habitudesDuJour.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <RowCheck
                      size={22}
                      name={e.habit.name}
                      checked={e.done}
                      onToggle={() => void toggleHabit(e.id, jour)}
                    />
                    <CategoryGlyph category={e.habit.category} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{e.habit.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={t('upcoming')}
            padding={0}
            actions={
              <Link href="/app/tasks" className="text-[11.5px]">
                {t('seeAll')}
              </Link>
            }
          >
            {prochaines.length === 0 ? (
              <p
                className="m-0 px-4 py-8 text-center text-[12.5px]"
                style={{ color: 'var(--mut)' }}
              >
                {t('emTasksT')}
              </p>
            ) : (
              <ul data-dash-tasks className="m-0 flex list-none flex-col p-0">
                {prochaines.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <RowCheck
                      size={22}
                      name={k.name}
                      checked={k.done}
                      onToggle={() => void toggleTask(k.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{k.name}</span>
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
                      {k.date}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t('activity')}>
            <div data-mini-heatmap className="flex flex-wrap gap-[3px]">
              {mini.map((j) => (
                <span
                  key={j.key}
                  title={`${j.key} · ${j.done}/${j.scheduled}`}
                  className="block h-[14px] w-[14px] rounded-[3px] border"
                  style={{
                    borderColor: j.scheduled === 0 ? 'var(--line)' : 'transparent',
                    background:
                      j.scheduled === 0
                        ? 'transparent'
                        : j.ratio <= 0
                          ? 'var(--panel2)'
                          : `color-mix(in srgb, var(--ok) ${Math.round(28 + j.ratio * 72)}%, transparent)`,
                  }}
                />
              ))}
            </div>
          </Panel>

          <Panel
            title={t('navGoals')}
            actions={
              <Link href="/app/goals" className="text-[11.5px]">
                {t('seeAll')}
              </Link>
            }
          >
            {goals.length === 0 ? (
              <p className="m-0 text-[12.5px]" style={{ color: 'var(--mut)' }}>
                {t('emGoalsT')}
              </p>
            ) : (
              <ul data-dash-goals className="m-0 flex list-none flex-col gap-3 p-0">
                {goals.slice(0, 4).map((g) => {
                  const { percent } = goalProgress(g, habits, logIndex);
                  return (
                    <li key={g.id} className="flex flex-col gap-1.5">
                      <span className="flex items-baseline gap-2 text-[12.5px]">
                        <span className="min-w-0 flex-1 truncate">{g.name}</span>
                        <span className="font-mono text-[11px]" style={{ color: 'var(--txt2)' }}>
                          {pourcentage(percent)}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="rounded-pill block h-[6px] overflow-hidden"
                        style={{ background: 'var(--panel2)' }}
                      >
                        <span
                          className="block h-full"
                          style={{
                            width: `${percent}%`,
                            background: 'linear-gradient(90deg, var(--acc), var(--acc2))',
                          }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
