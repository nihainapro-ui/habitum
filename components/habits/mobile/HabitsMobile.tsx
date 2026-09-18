'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { activeHabits, archivedHabits, resumeSemaine } from '@/lib/domain';
import { useStore } from '@/lib/store';
import { CategoryGlyph, Segmented } from '@/components/ui';
import { habitDepuisSuggestion, SUGGESTIONS } from '@/components/onboarding/StepHabits';
import { LigneHabitude } from './LigneHabitude';

/* Vue « Habitudes » sur TÉLÉPHONE — refonte mobile, PDF p. 6.

   Segments Actives / Archivées avec compteurs → une liste, une seule carte
   → résumé des sept derniers jours. Le « + » vit dans l'en-tête mobile ;
   la vue n'en pose pas un second.

   Le résumé de la semaine ne compte que des jours JOURNALISÉS
   (`resumeSemaine` : jour courant exclu, jours sans rien de planifié
   ignorés) — un compte sans historique lit « aucun jour complet », pas une
   estimation. Il est écrit en toutes lettres : la couleur des pastilles
   au-dessus ne dit jamais seule.

   État vide (PDF p. 6) : « Aucune habitude » et trois suggestions à un
   appui — les mêmes que l'accueil, par `habitDepuisSuggestion`. Aucune n'est
   créée sans un appui. Archivées vides : « Rien d'archivé ». */

type Onglet = 'active' | 'archived';

export function HabitsMobile() {
  const t = useTranslations('app');
  const habits = useStore((s) => s.habits);
  const logIndex = useStore((s) => s.logIndex);
  const createHabit = useStore((s) => s.createHabit);
  const openEditor = useStore((s) => s.openEditor);
  const [onglet, setOnglet] = useState<Onglet>('active');

  const actives = useMemo(() => activeHabits(habits), [habits]);
  const archivees = useMemo(() => archivedHabits(habits), [habits]);
  const resume = useMemo(() => resumeSemaine(logIndex, habits), [logIndex, habits]);
  const liste = onglet === 'active' ? actives : archivees;

  const carte = 'rounded-[22px] overflow-hidden border';
  const styleCarte = { borderColor: 'var(--line)', background: 'var(--panel)' };

  return (
    <div className="flex flex-col gap-3" data-testid="habits-mobile">
      <Segmented<Onglet>
        fill
        label={t('navHabits')}
        value={onglet}
        onChange={setOnglet}
        options={[
          { value: 'active', label: `${t('mobHabActive')} · ${actives.length}` },
          { value: 'archived', label: `${t('mobHabArchived')} · ${archivees.length}` },
        ]}
      />

      {liste.length === 0 ? (
        <section
          data-testid="empty-state"
          className={`${carte} flex flex-col items-center gap-3 px-6 py-8 text-center`}
          style={styleCarte}
        >
          <span className="text-[15px] font-semibold">
            {onglet === 'active' ? t('emHabitsT') : t('mobHabNoneArchived')}
          </span>
          {onglet === 'active' ? (
            <>
              <button
                type="button"
                onClick={() => openEditor({ kind: 'habit', id: null })}
                className="rounded-pill min-h-[44px] cursor-pointer border-0 px-5 text-[13.5px] font-semibold"
                style={{ background: 'var(--acc2)', color: 'var(--bg)' }}
              >
                {t('newHabit')}
              </button>
              <span className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>
                {t('mobHabSuggest')}
              </span>
              <ul className="m-0 flex w-full list-none flex-col gap-1.5 p-0">
                {SUGGESTIONS.map((s) => (
                  <li key={s.cle}>
                    <button
                      type="button"
                      onClick={() => void createHabit(habitDepuisSuggestion(s, t))}
                      className="rounded-field flex min-h-[48px] w-full cursor-pointer items-center gap-3 border px-4 text-left text-[13.5px]"
                      style={{
                        borderColor: 'var(--line)',
                        background: 'var(--panel2)',
                        color: 'var(--txt)',
                      }}
                    >
                      <CategoryGlyph category={s.category} size={26} />
                      {t(s.cle)}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : (
        <section className={carte} style={styleCarte}>
          <ul data-habits className="m-0 flex list-none flex-col p-0">
            {liste.map((h) => (
              <LigneHabitude key={h.id} habit={h} />
            ))}
          </ul>
        </section>
      )}

      {onglet === 'active' && actives.length > 0 ? (
        <section
          data-testid="resume-semaine"
          className={`${carte} flex flex-col gap-1 px-4 py-3`}
          style={styleCarte}
        >
          <span
            className="font-mono text-[9.5px] tracking-[0.16em] uppercase"
            style={{ color: 'var(--mut)' }}
          >
            {t('mobHabWeekSummary')}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--txt)' }}>
            {t('mobHabWeekDetail', { c: resume.complets, p: resume.partiels, m: resume.manques })}
          </span>
        </section>
      ) : null}
    </div>
  );
}
