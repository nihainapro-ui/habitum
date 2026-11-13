'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { partagerObjectifs } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { Segmented } from '@/components/ui';
import { CarteObjectif } from './CarteObjectif';

/* Vue « Objectifs » sur TÉLÉPHONE — refonte mobile, P3 lot 2
   (`docs/handoff/10-ECARTS-P3-MOBILE.md` § 4).

   Segments En cours / Atteints avec compteurs → une carte par objectif. Le
   « + » vit dans l'en-tête mobile, où il crée directement un objectif ; la vue
   n'en pose pas un second, sauf dans l'état vide où il est le seul geste
   utile.

   « Atteint » se lit dans `goalProgress` (100 %), jamais dans un drapeau : un
   objectif cumulatif redescend sous la cible si l'on corrige son journal, et
   il doit alors revenir de lui-même dans « En cours ». Un objectif à
   l'échéance dépassée y reste aussi — il n'est pas atteint. */

type Onglet = 'active' | 'done';

export function GoalsMobile() {
  const t = useTranslations('app');
  const goals = useStore((s) => s.goals);
  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const openEditor = useStore((s) => s.openEditor);
  const [onglet, setOnglet] = useState<Onglet>('active');

  const { enCours, atteints } = useMemo(
    () => partagerObjectifs(goals, habits, logIndex),
    [goals, habits, logIndex],
  );
  const liste = onglet === 'active' ? enCours : atteints;

  const carte = 'rounded-[22px] overflow-hidden border';
  const styleCarte = { borderColor: 'var(--line)', background: 'var(--panel)' };

  /* Trois vides, trois phrases : aucun objectif du tout (on explique et on
     propose), aucun en cours alors qu'il y en a d'atteints, aucun d'atteint. */
  const titreVide =
    goals.length === 0
      ? t('emGoalsT')
      : onglet === 'active'
        ? t('mobGoalNoneActive')
        : t('mobGoalNoneDone');

  return (
    <div className="flex flex-col gap-3" data-testid="goals-mobile">
      <Segmented<Onglet>
        fill
        label={t('navGoals')}
        value={onglet}
        onChange={setOnglet}
        options={[
          { value: 'active', label: `${t('mobGoalActive')} · ${enCours.length}` },
          { value: 'done', label: `${t('mobGoalDone')} · ${atteints.length}` },
        ]}
      />

      {liste.length === 0 ? (
        <section
          data-testid="empty-state"
          className={`${carte} flex flex-col items-center gap-3 px-6 py-8 text-center`}
          style={styleCarte}
        >
          <span className="text-[15px] font-semibold">{titreVide}</span>
          {goals.length === 0 ? (
            <span className="text-[12.5px] leading-relaxed" style={{ color: 'var(--txt2)' }}>
              {t('emGoalsD')}
            </span>
          ) : null}
          {onglet === 'active' ? (
            <button
              type="button"
              onClick={() => openEditor({ kind: 'goal', id: null })}
              className="rounded-pill min-h-[44px] cursor-pointer border-0 px-5 text-[13.5px] font-semibold"
              style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
            >
              {t('objNew')}
            </button>
          ) : null}
        </section>
      ) : (
        <ul data-goals className="m-0 flex list-none flex-col gap-3 p-0">
          {liste.map((g) => (
            <li key={g.id}>
              <CarteObjectif goal={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
