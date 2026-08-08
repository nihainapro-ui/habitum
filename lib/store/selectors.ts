import { useShallow } from 'zustand/react/shallow';
import {
  bestStreak,
  completionRate,
  currentStreak,
  dayRatio,
  focusMinutes,
  isScheduled,
  sumValues,
  type DayRatio,
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

/** Habitudes planifiées ce jour-là, archivées exclues. */
export const useHabitsOfDay = (date: Date): Habit[] =>
  useStore(useShallow((s) => s.habits.filter((h) => isScheduled(h, date))));

/** Tâches d'une date, quelle que soit leur avancement. */
export const useTasksOfDay = (dateKey: string): Task[] =>
  useStore(useShallow((s) => s.tasks.filter((t) => t.date === dateKey)));

/** Charge et avancement d'une journée — base de l'anneau et de la heatmap. */
export const useDayRatio = (date: Date): DayRatio =>
  useStore(useShallow((s) => dayRatio(s.logIndex, s.habits, s.tasks, date)));

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
