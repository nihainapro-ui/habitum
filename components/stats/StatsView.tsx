'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  bestStreakOverall,
  categoryBreakdown,
  daysOfMonth,
  globalScore,
  habitRanking,
  perfectDays,
  splitHeuresMinutes,
  sumValues,
  type Habit,
} from '@/lib/domain';
import { useFocusMinutes, useStore, type Range } from '@/lib/store';
import { COULEURS_CATEGORIE, Panel, Ring, Segmented } from '@/components/ui';
import { EmptyState } from '@/components/shell/empty-state';
import { ViewActions } from '@/components/shell/view-actions';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { Heatmap } from './Heatmap';

/* Vue « Statistiques » — 05-SPEC-VUES.md § 8.

   Aucun agrégat n'est calculé ici : `lib/domain/stats.ts` les porte tous, et
   ses tests les comparent aux 62 valeurs de référence. */

const FENETRES: Range[] = [7, 30, 90, 365];

/** Le focus est plafonné à 120 jours dans le prototype : au-delà, la somme
 *  cesse d'être une mesure de rythme. On conserve ce plafond. */
const PLAFOND_FOCUS = 120;

export function StatsView() {
  const t = useTranslations('app');
  const tc = useTranslations('cat');
  const { locale } = useLocaleSwitcher();

  const logIndex = useStore((s) => s.logIndex);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const range = useStore((s) => s.ui.range);
  const setRange = useStore((s) => s.setRange);
  const focus = useFocusMinutes(Math.min(range, PLAFOND_FOCUS));

  const cumul = useMemo(
    () => (h: Habit) => (h.goal.kind === 'check' ? 0 : sumValues(logIndex, h, range)),
    [logIndex, range],
  );

  const score = useMemo(
    () => globalScore(logIndex, habits, tasks, range),
    [logIndex, habits, tasks, range],
  );
  const parfaits = useMemo(
    () => perfectDays(logIndex, habits, tasks, range),
    [logIndex, habits, tasks, range],
  );
  const record = useMemo(() => bestStreakOverall(logIndex, habits), [logIndex, habits]);
  const classement = useMemo(
    () => habitRanking(logIndex, habits, range, undefined, cumul),
    [logIndex, habits, range, cumul],
  );
  const parts = useMemo(
    () => categoryBreakdown(logIndex, habits, range),
    [logIndex, habits, range],
  );
  const mois = useMemo(() => daysOfMonth(logIndex, habits, tasks), [logIndex, habits, tasks]);

  const { h, m } = splitHeuresMinutes(focus);
  /* Composé hors du JSX : `jsx-no-literals` interdit jusqu'aux gabarits. */
  const pourcentage = (n: number) => `${n} %`;
  const moisLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date()),
    [locale],
  );

  const indicateurs = [
    {
      cle: 'score',
      valeur: pourcentage(score),
      libelle: t('overallScore'),
      couleur: 'var(--acc2)',
    },
    { cle: 'parfaits', valeur: String(parfaits), libelle: t('perfectDays'), couleur: 'var(--ok)' },
    { cle: 'record', valeur: String(record), libelle: t('colBest'), couleur: 'var(--warn)' },
    { cle: 'focus', valeur: `${h} h ${m}`, libelle: t('focusTime'), couleur: 'var(--acc)' },
  ];

  if (habits.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState titleKey="system.emStatsT" bodyKey="system.emStatsD" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ViewActions>
        <Segmented<string>
          label={t('activitySub')}
          value={String(range)}
          onChange={(v) => setRange(Number(v) as Range)}
          options={FENETRES.map((f) => ({ value: String(f), label: `${f} ${t('days')}` }))}
        />
      </ViewActions>

      <section
        className="rounded-panel flex flex-wrap items-center gap-6 border p-5"
        style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
      >
        <div className="relative grid h-[132px] w-[132px] flex-none place-items-center">
          <Ring
            value={score / 100}
            label={`${t('habitScore')} : ${score} %`}
            size={132}
            stroke={9}
          />
          <span className="absolute flex flex-col items-center">
            <span data-testid="score" className="font-mono text-[30px] font-bold">
              {score}
            </span>
            <span
              className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
              style={{ color: 'var(--txt2)' }}
            >
              {t('habitScore')}
            </span>
          </span>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 min-[1060px]:grid-cols-4">
          {indicateurs.map((i) => (
            <div
              key={i.cle}
              className="rounded-field border p-3"
              style={{ borderColor: 'var(--line)', background: 'var(--panel2)' }}
            >
              <div
                className="font-mono text-[8.5px] tracking-[0.18em] uppercase"
                style={{ color: 'var(--txt2)' }}
              >
                {i.libelle}
              </div>
              <div
                data-testid={`kpi-${i.cle}`}
                className="mt-1 font-mono text-[22px] font-bold"
                style={{ color: i.couleur }}
              >
                {i.valeur}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Panel
        title={t('monthProgress')}
        actions={
          <span className="text-[11px]" style={{ color: 'var(--txt2)' }}>
            {moisLabel}
          </span>
        }
      >
        <div className="flex h-[120px] items-end gap-[3px]">
          {mois.map((j) => (
            <span
              key={j.key}
              title={`${j.date.getDate()} · ${j.future ? '—' : `${j.done}/${j.scheduled}`}`}
              className="min-w-[5px] flex-1 rounded-t-[3px]"
              style={{
                height: `${Math.max(3, Math.round((j.future ? 0 : j.ratio) * 112))}px`,
                background: j.future
                  ? 'var(--panel2)'
                  : j.ratio >= 0.8
                    ? 'var(--ok)'
                    : j.ratio >= 0.4
                      ? 'color-mix(in srgb, var(--ok) 55%, var(--panel2))'
                      : 'var(--bad)',
              }}
            />
          ))}
        </div>
      </Panel>

      <Heatmap />

      <div className="grid grid-cols-1 items-start gap-4 min-[1060px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={t('perHabit')} padding={0}>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ color: 'var(--txt2)' }}>
                  {[t('colHabit'), t('colPct'), t('colStreak'), t('colBest'), t('colTotal')].map(
                    (titre, i) => (
                      <th
                        key={titre}
                        scope="col"
                        className="border-b px-3 py-2.5 text-left font-mono text-[9px] tracking-[0.14em] uppercase"
                        style={{
                          borderColor: 'var(--line)',
                          textAlign: i === 0 ? 'left' : 'right',
                        }}
                      >
                        {titre}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {classement.map((l) => (
                  <tr key={l.habit.id} data-score-row>
                    <th
                      scope="row"
                      className="border-b px-3 py-2.5 text-left font-normal"
                      style={{ borderColor: 'var(--line)' }}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="block h-2 w-2 flex-none rounded-full"
                          style={{ background: COULEURS_CATEGORIE[l.habit.category] }}
                        />
                        {l.habit.name}
                      </span>
                    </th>
                    {[
                      `${l.pct} %`,
                      String(l.streak),
                      String(l.best),
                      l.total ? `${l.total} ${l.habit.goal.unit}` : '—',
                    ].map((valeur, i) => (
                      <td
                        key={i}
                        className="border-b px-3 py-2.5 text-right font-mono"
                        style={{ borderColor: 'var(--line)', color: 'var(--txt2)' }}
                      >
                        {valeur}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* « Focus par cible » désignait autre chose : ce panneau montre le taux
            de réussite PAR CATÉGORIE, pas des sessions de focus. Titre corrigé
            en comparant la vue à sa capture de référence. */}
        <Panel title={t('byCategory')}>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {parts.map((p) => (
              <li key={p.category} className="flex flex-col gap-1.5">
                <span className="flex items-baseline gap-2 text-[12px]">
                  <span className="flex-1">{tc(p.category)}</span>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--txt2)' }}>
                    {pourcentage(p.pct)}
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
                      width: `${p.pct}%`,
                      background: COULEURS_CATEGORIE[p.category],
                      transition: 'width .5s ease',
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
