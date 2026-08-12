import type { Task } from './types';
import { addDays, dateKey, startOfWeek, today, type WeekStart } from './date';

/* Regroupement des tâches — 05-SPEC-VUES.md § 6.

   Une tâche EN RETARD tombe dans « Aujourd'hui », comme dans le prototype
   (`off <= 0`). C'est délibéré : un groupe « en retard » séparé se replie et
   s'oublie, alors qu'une tâche non faite d'hier est le premier travail du jour.

   Écart assumé au prototype : « cette semaine » s'arrête à la FIN DE LA SEMAINE
   COURANTE, et non sept jours après aujourd'hui. Le prototype utilisait une
   fenêtre glissante, qui ignore `Settings.weekStart` — dimanche, elle annonçait
   « cette semaine » pour des jours qui appartiennent à la suivante. Le plan 5
   § 5.5 le désigne explicitement comme le piège de cette vue. */

export const GROUPES_TACHE = ['today', 'tomorrow', 'week', 'later', 'done'] as const;
export type GroupeTache = (typeof GROUPES_TACHE)[number];

export function taskGroup(t: Task, weekStart: WeekStart = 'mon', now: Date = today()): GroupeTache {
  if (t.done) return 'done';
  const aujourdhui = dateKey(now);
  if (t.date <= aujourdhui) return 'today';
  if (t.date === dateKey(addDays(now, 1))) return 'tomorrow';
  return t.date <= dateKey(addDays(startOfWeek(now, weekStart), 6)) ? 'week' : 'later';
}

/** Tâches par groupe, triées par date puis par priorité décroissante — l'ordre
 *  du prototype : ce qui vient en premier, et à date égale ce qui pèse le plus. */
export function groupTasks(
  tasks: readonly Task[],
  weekStart: WeekStart = 'mon',
  now: Date = today(),
): Record<GroupeTache, Task[]> {
  const groupes = {
    today: [] as Task[],
    tomorrow: [] as Task[],
    week: [] as Task[],
    later: [] as Task[],
    done: [] as Task[],
  };

  for (const t of tasks) groupes[taskGroup(t, weekStart, now)].push(t);
  for (const cle of GROUPES_TACHE) {
    groupes[cle].sort((a, b) => a.date.localeCompare(b.date) || b.priority - a.priority);
  }
  return groupes;
}

/** Nombre de sous-tâches faites sur le total. `null` s'il n'y en a pas :
 *  « 0/0 » afficherait un avancement là où il n'y a rien à avancer. */
export const subTaskCount = (t: Task): { done: number; total: number } | null =>
  t.subTasks.length
    ? { done: t.subTasks.filter((s) => s.done).length, total: t.subTasks.length }
    : null;
