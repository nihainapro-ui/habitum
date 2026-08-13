'use client';

import { useTranslations } from 'next-intl';
import {
  goalDaysLeft,
  goalProgress,
  goalStatus,
  goalTrail,
  requiredPace,
  type Goal,
  type GoalStatus,
} from '@/lib/domain';
import { useStore } from '@/lib/store';
import { Chip } from '@/components/ui';
import { GoalTrail } from './GoalTrail';

/* Carte d'objectif — 05-SPEC-VUES.md § 7.

   Piège de la vue : `reduce` compte les ÉCHECS. `goalProgress` porte
   l'inversion (`1 − current/total`) et son test la verrouille ; la carte ne
   fait qu'afficher ce qu'elle reçoit. Une barre qui recalculerait ici
   afficherait l'inverse de la réalité. */

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

const POINTS_COURBE = 24;

export function GoalCard({ goal }: { goal: Goal }) {
  const t = useTranslations('app');
  const tc = useTranslations('cat');

  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const openEditor = useStore((s) => s.openEditor);

  const { current, total, percent, unit } = goalProgress(goal, habits, logIndex);
  const statut = goalStatus(goal, habits, logIndex);
  const rythme = requiredPace(goal, habits, logIndex);
  const restant = goalDaysLeft(goal, undefined);
  const courbe = goalTrail(goal, habits, logIndex, POINTS_COURBE);
  const source = goal.sourceHabitId ? habits.find((h) => h.id === goal.sourceHabitId) : undefined;

  const CLE_TYPE = { cumul: 'kCumul', reduce: 'kReduce', milestones: 'kMile' } as const;
  const sousTitre = `${tc(goal.category)} · ${t(CLE_TYPE[goal.kind])}`;
  const avancement = `${current} / ${total}${unit ? ` ${unit}` : ''}`;
  const pourcentage = `${percent} %`;
  const rythmeTexte = rythme === null ? null : `${rythme} ${unit} ${t('perDay')}`;
  const echeance =
    restant === null ? null : restant >= 0 ? `${restant} ${t('objLeft')}` : t('objOver');

  return (
    <article
      aria-label={goal.name}
      data-goal
      className="rounded-panel flex flex-col gap-3 border p-4"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <button
            type="button"
            onClick={() => openEditor({ kind: 'goal', id: goal.id })}
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-[14px] font-semibold"
            style={{ color: 'var(--txt)' }}
          >
            {goal.name}
          </button>
          <span className="font-mono text-[10.5px]" style={{ color: 'var(--mut)' }}>
            {sousTitre}
          </span>
        </div>
        <Chip tone={TONS[statut]} size="sm">
          {t(CLES[statut])}
        </Chip>
      </div>

      <div className="flex items-baseline gap-2">
        <span data-testid="percent" className="font-mono text-[20px] font-bold">
          {pourcentage}
        </span>
        <span
          data-testid="progress"
          className="font-mono text-[11px]"
          style={{ color: 'var(--txt2)' }}
        >
          {avancement}
        </span>
      </div>

      <span
        aria-hidden="true"
        className="rounded-pill block h-[7px] overflow-hidden"
        style={{ background: 'var(--panel2)' }}
      >
        <span
          className="block h-full"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, var(--acc), var(--acc2))',
            transition: 'width .6s ease',
          }}
        />
      </span>

      <GoalTrail points={courbe} percent={percent} />

      {goal.milestones?.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {goal.milestones.map((m, i) => (
            <li key={`${m.label}-${i}`} className="flex items-center gap-2 text-[12px]">
              <span aria-hidden="true" style={{ color: m.done ? 'var(--ok)' : 'var(--mut)' }}>
                {m.done ? '◉' : '·'}
              </span>
              <span
                style={{
                  color: m.done ? 'var(--mut)' : 'var(--txt2)',
                  textDecoration: m.done ? 'line-through' : 'none',
                }}
              >
                {m.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
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
        {echeance ? (
          <>
            <dt style={{ color: 'var(--mut)' }}>{t('objDue')}</dt>
            <dd className="m-0 text-right font-mono" style={{ color: 'var(--txt2)' }}>
              {echeance}
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
    </article>
  );
}
