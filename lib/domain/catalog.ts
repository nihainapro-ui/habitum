import type { DateKey, Habit, Task } from './types';
import { today } from './date';
import { isScheduled } from './schedule';

/* Catalogue : quelles habitudes comptent, dans quel ordre, et sur quoi on peut
   se concentrer maintenant. */

/** Habitudes actives — les archivées ne sont plus planifiées mais gardent leur
 *  historique : elles ne se comptent pas, elles ne disparaissent pas. */
export const activeHabits = (habits: readonly Habit[]): Habit[] =>
  habits.filter((h) => !h.archived);

/** Ordre du catalogue : les archivées en fin de liste plutôt que masquées.
 *  Les masquer rendrait leur historique inatteignable — c'est la différence
 *  entre archiver et supprimer. */
export const sortHabitsCatalog = (habits: readonly Habit[]): Habit[] =>
  [...habits].sort((a, b) => Number(a.archived) - Number(b.archived));

export interface CibleFocus {
  kind: 'h' | 't';
  id: string;
  label: string;
}

/** Ce sur quoi une session de focus peut porter aujourd'hui : les habitudes
 *  PLANIFIÉES du jour, et les tâches du jour NON FAITES. Proposer une tâche
 *  déjà cochée, ou une habitude qui n'est pas au programme, c'est proposer de
 *  créditer du temps là où il ne compte pas. */
export function focusTargets(
  habits: readonly Habit[],
  tasks: readonly Task[],
  jour: DateKey,
  now: Date = today(),
): CibleFocus[] {
  return [
    ...habits
      .filter((h) => isScheduled(h, now, now))
      .map((h) => ({ kind: 'h' as const, id: h.id, label: h.name })),
    ...tasks
      .filter((k) => !k.done && k.date === jour)
      .map((k) => ({ kind: 't' as const, id: k.id, label: k.name })),
  ];
}
