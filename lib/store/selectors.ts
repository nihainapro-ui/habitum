import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dateKey,
  dayAgenda,
  dayRatio,
  parseKey,
  focusMinutes,
  isScheduled,
  sumValues,
  today,
  type DayRatio,
  type EntreeJour,
  type Habit,
  type Task,
} from '@/lib/domain';
import { useStore } from './store';

/* Sélecteurs dérivés.

   G2 — AUCUN calcul n'est écrit ici : chaque sélecteur assemble des entrées et
   appelle `lib/domain`, qui est testé contre les 62 valeurs de référence. Un
   calcul recopié dans un composant est un calcul que l'oracle ne protège plus.

   `useShallow` est nécessaire dès qu'un sélecteur construit un tableau ou un
   objet : Zustand 5 compare par `Object.is`, et une nouvelle référence à chaque
   rendu boucle indéfiniment. */

/* ⚠ Un sélecteur ne doit JAMAIS construire un objet que `Object.is` ne
   reconnaîtra pas au rendu suivant. `useShallow` ne sauve que les tableaux et
   objets PLATS : dès que les éléments sont eux-mêmes des objets reconstruits,
   la comparaison échoue à chaque appel et React boucle jusqu'à
   « Maximum update depth exceeded ». Dans ces cas-là, on sélectionne les
   entrées — stables, puisque le store ne les remplace qu'à l'écriture — et on
   dérive dans un `useMemo`. */

/** Jour affiché : `ui.day` est un DÉCALAGE en jours, comme `state.day` du
 *  prototype. Le convertir ici, une fois, évite que chaque vue le refasse — et
 *  qu'une vue oublie de le faire. */
export const useJourAffiche = (): Date => {
  const day = useStore((s) => s.ui.day);
  return useMemo(() => addDays(today(), day), [day]);
};

/** File d'exécution de la journée affichée, filtrée par l'onglet courant.
 *  Le filtre est un état d'interface : il s'applique ici, après le domaine. */
export const useDayAgenda = (date: Date): EntreeJour[] => {
  const logIndex = useStore((s) => s.logIndex);
  const habits = useStore((s) => s.habits);
  const tasks = useStore((s) => s.tasks);
  const occurrences = useStore((s) => s.occurrences);
  const filter = useStore((s) => s.ui.filter);
  const jour = dateKey(date);

  return useMemo(() => {
    const d = parseKey(jour);
    if (!d) return [];
    const entrees = dayAgenda(logIndex, habits, tasks, d, today(), occurrences);
    if (filter === 'habits') return entrees.filter((e) => e.kind === 'habit');
    if (filter === 'tasks') return entrees.filter((e) => e.kind === 'task');
    return entrees;
  }, [logIndex, habits, tasks, occurrences, filter, jour]);
};

/** Habitudes planifiées ce jour-là, archivées exclues. */
export const useHabitsOfDay = (date: Date): Habit[] =>
  useStore(useShallow((s) => s.habits.filter((h) => isScheduled(h, date))));

/** Tâches d'une date, quelle que soit leur avancement. */
export const useTasksOfDay = (dateKey: string): Task[] =>
  useStore(useShallow((s) => s.tasks.filter((t) => t.date === dateKey)));

/** Charge et avancement d'une journée — base de l'anneau et de la heatmap. */
export const useDayRatio = (date: Date): DayRatio =>
  useStore(
    useShallow((s) => dayRatio(s.logIndex, s.habits, s.tasks, date, today(), s.occurrences)),
  );

/** Avancement de plusieurs journées — bandeau de dates, heatmap.
 *
 *  Rend un tableau de NOMBRES, pas d'objets : `useShallow` compare les
 *  éléments par `Object.is`, et une liste d'objets reconstruits à chaque appel
 *  ne serait jamais jugée égale — la comparaison échouerait à chaque rendu. */
export const useDayRatios = (dates: readonly Date[]): number[] =>
  useStore(
    useShallow((s) =>
      dates.map((d) => dayRatio(s.logIndex, s.habits, s.tasks, d, today(), s.occurrences).ratio),
    ),
  );

/** Série en cours d'une habitude, seule.
 *
 *  `useHabitMetrics` calcule aussi le record — 365 jours balayés. Une ligne de
 *  la file d'exécution n'affiche que la série : lui faire payer le record
 *  multiplierait le coût du rendu par le nombre de lignes, pour un chiffre
 *  qu'elle ne montre pas. */
export const useHabitStreak = (habitId: string): number =>
  useStore((s) => {
    const h = s.habits.find((x) => x.id === habitId);
    return h ? currentStreak(s.logIndex, h) : 0;
  });

export interface HabitMetrics {
  streak: number;
  best: number;
  pct7: number;
  pct30: number;
  pct90: number;
  sum30: number;
}

/** Les chiffres d'une carte d'habitude. `bestStreak` balaie 365 jours : c'est
 *  le candidat n° 1 du cache dérivé de la phase 5 (tâche 5.9, ADR-0004). */
export const useHabitMetrics = (habitId: string): HabitMetrics | null =>
  useStore(
    useShallow((s) => {
      const h = s.habits.find((x) => x.id === habitId);
      if (!h) return null;
      return {
        streak: currentStreak(s.logIndex, h),
        best: bestStreak(s.logIndex, h),
        pct7: completionRate(s.logIndex, h, 7),
        pct30: completionRate(s.logIndex, h, 30),
        pct90: completionRate(s.logIndex, h, 90),
        sum30: sumValues(s.logIndex, h, 30),
      };
    }),
  );

/** Minutes de focus sur une fenêtre. G3 : agrège les sessions réellement
 *  enregistrées — un compte sans session rend 0, pas une estimation. */
export const useFocusMinutes = (window: number): number =>
  useStore((s) => focusMinutes(s.sessions, window));

export const useSettings = () => useStore((s) => s.settings);
export const useToast = () => useStore((s) => s.ui.toast);
export const useIsDemo = () => useStore((s) => s.isDemo);
export const useActiveProfile = () =>
  useStore((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? null);
