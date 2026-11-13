'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  aUneDuree,
  goalDaysLeft,
  goalElapsed,
  goalProgress,
  goalStatus,
  goalTrail,
  parseKey,
  requiredPace,
  today,
  type Goal,
  type GoalStatus,
} from '@/lib/domain';
import { useStore } from '@/lib/store';
import { BarreProgression, Chip } from '@/components/ui';
import { FeuilleMenu } from '@/components/shell/feuille-menu';
import { useLocaleSwitcher } from '@/components/shell/locale-provider';
import { GoalTrail } from '../GoalTrail';

/* Un objectif, sur téléphone — refonte mobile, P3 lot 2.

   Tout ce que la carte de bureau montre est là (rien n'est retiré) : type et
   catégorie, avancement chiffré, verdict, rythme requis, habitude source,
   courbe, jalons. Ce qui change est la FORME :

   - la barre est UNIE (PDF p. 17), le dégradé de la carte de bureau reste au
     bureau ;
   - un repère dit où en est le TEMPS, avec son texte — la barre seule serait
     une couleur seule. Il n'apparaît que si l'objectif a un début et une
     échéance : sans eux, `goalElapsed` rend une valeur de convention, pas une
     mesure, et l'afficher serait fabriquer un chiffre ;
   - les jalons se cochent sur des lignes de 44 px, trois d'abord, le reste
     derrière « + n » ;
   - l'appui sur le NOM ouvre la feuille d'actions (pas d'appui long,
     arbitrage du 18/09) : Modifier · Supprimer. La suppression reste
     annulable, comme sur le bureau.

   Piège de la vue, inchangé : `reduce` compte les ÉCHECS. `goalProgress`
   porte l'inversion ; rien n'est recalculé ici. */

const TONS: Record<GoalStatus, 'ok' | 'warn' | 'bad' | 'neutral'> = {
  done: 'ok',
  ahead: 'ok',
  ontime: 'neutral',
  late: 'warn',
  over: 'bad',
};

const CLES: Record<GoalStatus, string> = {
  done: 'objDone',
  ahead: 'objAhead',
  ontime: 'objOnTrack',
  late: 'objBehind',
  over: 'objOver',
};

const CLE_TYPE = { cumul: 'kCumul', reduce: 'kReduce', milestones: 'kMile' } as const;

const POINTS_COURBE = 24;
const JALONS_VISIBLES = 3;

export function CarteObjectif({ goal }: { goal: Goal }) {
  const t = useTranslations('app');
  const tc = useTranslations('cat');
  const { locale } = useLocaleSwitcher();

  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const openEditor = useStore((s) => s.openEditor);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const toggleMilestone = useStore((s) => s.toggleMilestone);

  const [menuOuvert, setMenuOuvert] = useState(false);
  const [toutVoir, setToutVoir] = useState(false);

  const { current, total, percent, unit } = goalProgress(goal, habits, logIndex);
  const statut = goalStatus(goal, habits, logIndex);
  const rythme = requiredPace(goal, habits, logIndex);
  const restant = goalDaysLeft(goal);
  const courbe = goalTrail(goal, habits, logIndex, POINTS_COURBE);
  const source = goal.sourceHabitId ? habits.find((h) => h.id === goal.sourceHabitId) : undefined;
  const ecoule = aUneDuree(goal) ? Math.round(goalElapsed(goal) * 100) : null;

  /* L'année n'est écrite que si elle n'est pas l'année en cours : à 360 px,
     « 1 mai 2026 · échéance 11 oct. 2026 » se coupait sur un « 2026 » orphelin. */
  const jour = useMemo(() => {
    const court = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    const complet = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const annee = today().getFullYear();
    return { format: (d: Date) => (d.getFullYear() === annee ? court : complet).format(d) };
  }, [locale]);
  const debut = parseKey(goal.start);
  const fin = parseKey(goal.deadline);
  const dates =
    debut && fin
      ? t('mobGoalDates', { from: jour.format(debut), to: jour.format(fin) })
      : debut
        ? t('mobGoalSince', { from: jour.format(debut) })
        : fin
          ? t('mobGoalUntil', { to: jour.format(fin) })
          : null;

  /* Composés hors du JSX — `jsx-no-literals` y interdit jusqu'aux gabarits. */
  const sousTitre = `${t(CLE_TYPE[goal.kind])} · ${tc(goal.category)}`;
  const avancement = `${current} / ${total}${unit ? ` ${unit}` : ''}`;
  const pourcentage = `${percent} %`;
  const rythmeTexte = rythme === null ? null : `${rythme} ${unit} ${t('perDay')}`;
  const echeance =
    restant === null || statut === 'done' || restant < 0
      ? null
      : t('mobGoalDaysLeft', { n: restant });

  const jalons = goal.milestones ?? [];
  const visibles = toutVoir ? jalons : jalons.slice(0, JALONS_VISIBLES);
  const caches = jalons.length - JALONS_VISIBLES;

  return (
    <article
      aria-label={goal.name}
      data-goal
      className="flex flex-col gap-3 rounded-[22px] border px-4 py-3.5"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <div className="flex min-h-[44px] items-start gap-3">
        <button
          type="button"
          onClick={() => setMenuOuvert(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOuvert}
          data-name
          className="flex min-h-[44px] min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 border-0 bg-transparent p-0 text-left"
          style={{ color: 'inherit', font: 'inherit' }}
        >
          <span className="text-[15px] leading-snug font-semibold" style={{ color: 'var(--txt)' }}>
            {goal.name}
          </span>
          <span className="font-mono text-[10.5px] leading-snug" style={{ color: 'var(--mut)' }}>
            {sousTitre}
          </span>
          {dates ? (
            <span className="font-mono text-[10.5px] leading-snug" style={{ color: 'var(--mut)' }}>
              {dates}
            </span>
          ) : null}
        </button>
        <span
          data-testid="percent"
          className="flex-none font-mono text-[22px] leading-none font-bold"
          style={{ color: 'var(--txt)' }}
        >
          {pourcentage}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Le repère de temps est posé SUR la barre ; son sens est écrit juste
            dessous. Ni l'un ni l'autre n'existe sans début et échéance. */}
        <span className="relative block">
          <BarreProgression ratio={percent / 100} hauteur={6} />
          {ecoule !== null ? (
            <span
              aria-hidden="true"
              data-repere-temps
              className="absolute top-[-3px] block h-[12px] w-[2px]"
              style={{ left: `calc(${ecoule}% - 1px)`, background: 'var(--txt2)' }}
            />
          ) : null}
        </span>
        <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
          <span data-testid="progress" style={{ color: 'var(--txt2)' }}>
            {avancement}
          </span>
          {ecoule !== null ? (
            <span data-testid="elapsed" style={{ color: 'var(--mut)' }}>
              {t('mobGoalElapsed', { p: ecoule })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={TONS[statut]} size="sm">
          {t(CLES[statut])}
        </Chip>
        {echeance ? (
          <span className="text-[12px]" style={{ color: 'var(--txt2)' }}>
            {echeance}
          </span>
        ) : null}
      </div>

      <GoalTrail points={courbe} percent={percent} />

      {jalons.length ? (
        <ul data-jalons className="m-0 flex list-none flex-col p-0">
          {visibles.map((m, i) => (
            <li key={`${m.label}-${i}`}>
              <button
                type="button"
                role="checkbox"
                aria-checked={m.done}
                aria-label={t('msA', { label: m.label })}
                onClick={() => void toggleMilestone(goal.id, i)}
                className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-[13.5px]"
                style={{ font: 'inherit', fontSize: 13.5, color: 'inherit' }}
              >
                {/* La case porte une coche, pas seulement une couleur. */}
                <span
                  aria-hidden="true"
                  className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] border text-[13px] leading-none font-bold"
                  style={{
                    borderColor: m.done ? 'var(--ok)' : 'var(--line2)',
                    background: m.done ? 'var(--ok)' : 'transparent',
                    color: 'var(--bg)',
                  }}
                >
                  {m.done ? '✓' : ''}
                </span>
                <span
                  className="min-w-0 flex-1"
                  style={{
                    color: m.done ? 'var(--mut)' : 'var(--txt)',
                    textDecoration: m.done ? 'line-through' : 'none',
                  }}
                >
                  {m.label}
                </span>
              </button>
            </li>
          ))}
          {caches > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setToutVoir((v) => !v)}
                aria-expanded={toutVoir}
                className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-left text-[12.5px] font-medium"
                style={{ color: 'var(--acc2)' }}
              >
                {toutVoir ? t('mobGoalLess') : t('mobGoalMore', { n: caches })}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      {rythmeTexte || source ? (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
          {rythmeTexte ? (
            <>
              <dt style={{ color: 'var(--mut)' }}>{t('objPace')}</dt>
              <dd
                data-testid="pace"
                className="m-0 text-right font-mono"
                style={{ color: 'var(--txt2)' }}
              >
                {rythmeTexte}
              </dd>
            </>
          ) : null}
          {source ? (
            <>
              <dt style={{ color: 'var(--mut)' }}>{t('objFrom')}</dt>
              <dd className="m-0 truncate text-right" style={{ color: 'var(--txt2)' }}>
                {source.name}
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}

      <FeuilleMenu
        open={menuOuvert}
        onOpenChange={setMenuOuvert}
        title={goal.name}
        description={t('moreA')}
        items={[
          { label: t('edit'), onSelect: () => openEditor({ kind: 'goal', id: goal.id }) },
          { label: t('delete'), tone: 'bad', onSelect: () => void deleteGoal(goal.id) },
        ]}
      />
    </article>
  );
}
