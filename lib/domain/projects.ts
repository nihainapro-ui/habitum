import { PROJECT_STATUSES, type DateKey, type ProjectStatus, type ProjectTask } from './types';

/* Work — le calcul, et rien d'autre.

   Ce fichier n'importe ni React, ni Next, ni la persistance (règle 2 du
   CLAUDE.md). Les vues lisent ces trois fonctions ; elles ne recalculent rien
   chez elles. */

/** Tâches d'un projet, rangées par statut.
 *
 *  LES TROIS CLÉS SONT TOUJOURS PRÉSENTES, vides comprises. C'est ce qui fait
 *  que la vue n'a pas à se demander si une colonne existe : une clé absente
 *  ferait disparaître une colonne sans bruit — variante exacte du piège n°1.
 *  Elles sont construites depuis `PROJECT_STATUSES`, jamais écrites à la main :
 *  ajouter un statut un jour ajoutera sa colonne ici, sans rien oublier. */
export function groupProjectTasks(
  tasks: readonly ProjectTask[],
): Record<ProjectStatus, ProjectTask[]> {
  const groupes = Object.fromEntries(
    PROJECT_STATUSES.map((s) => [s, [] as ProjectTask[]]),
  ) as Record<ProjectStatus, ProjectTask[]>;
  for (const t of tasks) groupes[t.status].push(t);
  return groupes;
}

/** Sous-tâches d'une étape, absence comprise.
 *
 *  LE SEUL `?? []` DU PRODUIT SUR CE CHAMP. Recopié dans chaque vue, il
 *  finirait par manquer dans une — et cette vue-là planterait sur la première
 *  étape d'avant le lot B, c'est-à-dire sur toutes celles des utilisateurs
 *  actuels. */
export const projectSubItems = (t: ProjectTask): readonly { label: string; done: boolean }[] =>
  t.subItems ?? [];

export interface AvancementProjet {
  done: number;
  total: number;
  /** Entier de 0 à 100. */
  pct: number;
}

/** Avancement RÉEL d'un projet : ce que le journal contient, rien de plus.
 *
 *  Un projet SANS tâche rend 0 %, jamais 100. La division 0/0 tenterait de dire
 *  « tout est fait » d'un projet où rien n'existe — c'est un chiffre fabriqué,
 *  ce que la règle 3 du CLAUDE.md interdit. */
export function projectProgress(tasks: readonly ProjectTask[]): AvancementProjet {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Une tâche est-elle en retard ?
 *
 *  UNE TÂCHE TERMINÉE N'EST JAMAIS EN RETARD, même livrée après l'échéance :
 *  elle est faite, et signaler en rouge un travail achevé n'apprend rien à
 *  personne. Sans échéance, rien n'est en retard non plus — l'absence de date
 *  n'est pas une date passée. */
export function isOverdue(task: ProjectTask, today: DateKey): boolean {
  if (task.deadline === '' || task.status === 'done') return false;
  return task.deadline < today;
}

/** Tâches d'un projet en retard, pour la carte de la liste. */
export const countOverdue = (tasks: readonly ProjectTask[], today: DateKey): number =>
  tasks.filter((t) => isOverdue(t, today)).length;
