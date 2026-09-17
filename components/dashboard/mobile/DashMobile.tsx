'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import {
  aFaireMaintenant,
  bestStreakOverall,
  dateKey,
  dayAgenda,
  daysBack,
  longestCurrentStreak,
  nearestGoal,
  shouldNagExport,
  splitHeuresMinutes,
  today,
  upcomingTasks,
} from '@/lib/domain';
import { useDayRatio, useFocusMinutes, useStore } from '@/lib/store';
import { BarreProgression, Ring } from '@/components/ui';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { LigneJour } from '@/components/today/mobile/LigneJour';

/* Tableau de bord sur TÉLÉPHONE — refonte mobile, PDF p. 4.

   « Répondre en un regard à « où en suis-je aujourd'hui ? » puis passer à
   l'action sans défiler. » Synthèse (une ligne) → indicateurs (une rangée) →
   « À faire maintenant » (cinq lignes au plus) → objectif le plus proche.

   « Observé — l'anneau occupait un tiers de l'écran, à côté d'un vide ; quatre
   tuiles imbriquées dans une grande carte. » Ici : anneau de 52 px sur la
   ligne de synthèse, trois indicateurs sur une rangée, UN niveau de carte. Les
   actions sont dès le premier écran : les lignes sont celles d'Aujourd'hui
   (`LigneJour`), cochables, avec leur pas à pas et leur feuille d'actions.
   « Tout voir » devient « Aujourd'hui › » : le lien nomme sa destination.

   AUCUN CALCUL ICI, et aucun chiffre fabriqué : tout vient des fonctions que
   lisent déjà les vues détaillées. Un compte vierge lit 0/0, 0 j, 0 h 00.

   Rien n'est retiré du tableau de bord d'avant : le rappel de sauvegarde
   (D8), les tâches à venir — une ligne qui mène à Tâches — et la mini-carte
   des trente jours restent, sous l'essentiel. */

const JOURS_MINI = 30;

export function DashMobile() {
  const t = useTranslations('app');
  const ts = useTranslations('system');
  const { locale } = useLocaleSwitcher();

  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);
  const notes = useStore((s) => s.notes);
  const logIndex = useStore((s) => s.logIndex);
  const occurrences = useStore((s) => s.occurrences);
  const lastExport = useStore((s) => s.lastExport);
  const nagDismissed = useStore((s) => s.nagDismissed);
  const dismissExportNag = useStore((s) => s.dismissExportNag);
  const openEditor = useStore((s) => s.openEditor);

  const jour = dateKey(today());
  const { scheduled, done, ratio } = useDayRatio(today());
  const { h, m } = splitHeuresMinutes(useFocusMinutes(7));

  const entrees = useMemo(
    () => dayAgenda(logIndex, habits, tasks, today(), today(), occurrences),
    [logIndex, habits, tasks, occurrences],
  );
  const aFaire = useMemo(() => aFaireMaintenant(entrees), [entrees]);
  const habitudes = entrees.filter((e) => e.kind === 'habit');
  const taches = entrees.filter((e) => e.kind === 'task');
  const habitudesFaites = habitudes.filter((e) => e.done).length;
  const tachesFaites = taches.filter((e) => e.done).length;

  const serie = useMemo(() => longestCurrentStreak(logIndex, habits), [logIndex, habits]);
  const record = useMemo(() => bestStreakOverall(logIndex, habits), [logIndex, habits]);
  const objectif = useMemo(() => nearestGoal(goals, habits, logIndex), [goals, habits, logIndex]);
  const aVenir = useMemo(() => upcomingTasks(tasks, jour, 50).length, [tasks, jour]);
  const mini = useMemo(
    () => daysBack(logIndex, habits, tasks, JOURS_MINI),
    [logIndex, habits, tasks],
  );

  const rappel = shouldNagExport({
    lastExport,
    dismissed: nagDismissed,
    hasData: habits.length + tasks.length + notes.length > 0,
  });

  const dateLongue = useMemo(() => {
    const brut = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(today());
    return brut.charAt(0).toUpperCase() + brut.slice(1);
  }, [locale]);

  /* Composés hors du JSX (`jsx-no-literals`). */
  const avancement = `${done}/${scheduled}`;
  const synthese = [
    t('mobDashHabits', { n: habitudesFaites }),
    t('mobDashTasks', { n: taches.length - tachesFaites }),
    t('mobDashStreak', { n: serie }),
  ].join(' · ');
  const focus = `${h} h ${String(m).padStart(2, '0')}`;
  const compteTaches = `${tachesFaites} / ${taches.length}`;
  const avancementObjectif = objectif
    ? `${objectif.progress.current} / ${objectif.progress.total}`
    : '';
  const parfait = scheduled > 0 && ratio >= 1;
  const vide = entrees.length === 0;

  const indicateurs = [
    {
      cle: 'record',
      href: '/app/stats',
      libelle: t('mobDashRecord'),
      valeur: t('mobDashDays', { n: record }),
    },
    { cle: 'focus', href: '/app/timer', libelle: t('mobDashFocus'), valeur: focus },
    { cle: 'tasks', href: '/app/tasks', libelle: t('mobDashTasksK'), valeur: compteTaches },
  ];

  const carte = 'rounded-[22px] border';
  const styleCarte = { borderColor: 'var(--line)', background: 'var(--panel)' };

  return (
    <div className="flex flex-col gap-3" data-testid="dash-mobile">
      {rappel ? (
        <section
          role="status"
          className={`${carte} flex flex-col gap-2 p-4`}
          style={{ borderColor: 'var(--warn)', background: 'var(--panel)' }}
        >
          <span className="text-[13px] font-semibold">{ts('nagT')}</span>
          <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
            {ts('nagD')}
          </span>
          <div className="flex gap-2">
            <Link
              href="/app/settings"
              className="rounded-pill grid min-h-[44px] flex-1 place-items-center border px-3 text-[13px]"
              style={{ borderColor: 'var(--acc2)', color: 'var(--acc2)' }}
            >
              {ts('nagNow')}
            </Link>
            <button
              type="button"
              onClick={() => void dismissExportNag()}
              className="rounded-pill min-h-[44px] flex-1 cursor-pointer border px-3 text-[13px]"
              style={{
                borderColor: 'var(--line)',
                color: 'var(--txt2)',
                background: 'transparent',
              }}
            >
              {ts('nagLater')}
            </button>
          </div>
        </section>
      ) : null}

      {/* Synthèse : une ligne. */}
      <section className={`${carte} flex items-center gap-3 p-4`} style={styleCarte}>
        <div className="relative grid h-[52px] w-[52px] flex-none place-items-center">
          <Ring
            value={ratio}
            label={`${t('todayProgress')} : ${done} / ${scheduled}`}
            size={52}
            stroke={5}
          />
          <span data-testid="day-ratio" className="absolute font-mono text-[12px] font-bold">
            {avancement}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">{dateLongue}</span>
          <span className="text-[12px] leading-snug" style={{ color: 'var(--txt2)' }}>
            {synthese}
          </span>
        </div>
      </section>

      {/* Indicateurs : une rangée, chacun mène à sa vue. */}
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {indicateurs.map((i) => (
          <li key={i.cle} className="min-w-0">
            <Link
              href={i.href}
              className={`${carte} flex min-h-[64px] flex-col justify-center gap-1 px-3 py-2`}
              style={{ ...styleCarte, color: 'var(--txt)' }}
            >
              <span
                className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
                style={{ color: 'var(--txt2)' }}
              >
                {i.libelle}
              </span>
              <span
                data-testid={`indicateur-${i.cle}`}
                className="font-mono text-[15px] font-bold whitespace-nowrap"
              >
                {i.valeur}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {vide ? (
        <section
          data-testid="empty-state"
          className={`${carte} flex flex-col items-center gap-3 px-6 py-10 text-center`}
          style={styleCarte}
        >
          <span className="text-[15px] font-semibold">{t('mobDashEmptyT')}</span>
          <button
            type="button"
            onClick={() => openEditor({ kind: 'habit', id: null })}
            className="rounded-pill min-h-[44px] cursor-pointer border-0 px-5 text-[13.5px] font-semibold"
            style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
          >
            {t('mobDashEmptyA')}
          </button>
        </section>
      ) : (
        <section className={`${carte} overflow-hidden`} style={styleCarte}>
          <header
            className="flex min-h-[48px] items-center justify-between gap-2 border-b pr-1 pl-4"
            style={{ borderColor: 'var(--line)' }}
          >
            <h2 className="m-0 text-[14px] font-semibold">{t('mobDashNow')}</h2>
            <Link
              href="/app/today"
              className="flex min-h-[44px] flex-none items-center gap-1 px-3 text-[13px] font-semibold"
              style={{ color: 'var(--acc2)' }}
            >
              {t('navToday')}
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </header>
          {aFaire.length === 0 ? (
            <p
              data-testid="journee-parfaite"
              className="m-0 px-4 py-6 text-center text-[13px] font-semibold"
              style={{ color: parfait ? 'var(--acc2)' : 'var(--txt2)' }}
            >
              {parfait ? t('mobPerfect') : t('mobDashAllDone')}
            </p>
          ) : (
            <ul data-queue className="m-0 flex list-none flex-col p-0">
              {aFaire.map((e) => (
                <LigneJour key={`${e.kind}-${e.id}`} entree={e} date={jour} cochable />
              ))}
            </ul>
          )}
        </section>
      )}

      {objectif ? (
        <Link
          href="/app/goals"
          data-testid="objectif-proche"
          className={`${carte} flex min-h-[56px] flex-col justify-center gap-2 px-4 py-3`}
          style={{ ...styleCarte, color: 'var(--txt)' }}
        >
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[13.5px]">
              {t('mobDashGoal', { name: objectif.goal.name })}
            </span>
            <span className="flex-none font-mono text-[12px]" style={{ color: 'var(--txt2)' }}>
              {avancementObjectif}
            </span>
          </span>
          <BarreProgression ratio={objectif.progress.percent / 100} hauteur={4} />
        </Link>
      ) : null}

      <Link
        href="/app/tasks"
        className={`${carte} flex min-h-[48px] items-center justify-between gap-2 px-4 text-[13px]`}
        style={{ ...styleCarte, color: 'var(--txt)' }}
      >
        {t('mobDashUpcoming', { n: aVenir })}
        <ChevronRight size={14} aria-hidden="true" style={{ color: 'var(--mut)' }} />
      </Link>

      <section className={`${carte} flex flex-col gap-2 p-4`} style={styleCarte}>
        <h2
          className="m-0 font-mono text-[9.5px] font-normal tracking-[0.16em] uppercase"
          style={{ color: 'var(--txt2)' }}
        >
          {t('mobDashActivity')}
        </h2>
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
      </section>
    </div>
  );
}
