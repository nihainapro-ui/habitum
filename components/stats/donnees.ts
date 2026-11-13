'use client';

import { useMemo } from 'react';
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

/* Les agrégats de la vue « Statistiques », pour ses DEUX formes.

   Aucun n'est calculé ici : `lib/domain/stats.ts` les porte tous, et ses tests
   les comparent aux 62 valeurs de référence. Ce fichier ne fait que les
   appeler une fois, au même endroit — deux formes qui appelleraient chacune
   le domaine finiraient par ne plus passer les mêmes arguments, et afficher
   deux scores pour le même compte. */

export const FENETRES: Range[] = [7, 30, 90, 365];

/** Le focus est plafonné à 120 jours dans le prototype : au-delà, la somme
 *  cesse d'être une mesure de rythme. On conserve ce plafond. */
const PLAFOND_FOCUS = 120;

export function useStatistiques() {
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

  return {
    aucuneHabitude: habits.length === 0,
    range,
    setRange,
    score,
    parfaits,
    record,
    /** « 2 h 18 » — composé ici, `jsx-no-literals` l'interdit dans le JSX. */
    focusTexte: `${h} h ${m}`,
    classement,
    parts,
    mois,
  };
}
