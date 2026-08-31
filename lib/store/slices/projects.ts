import type { StateCreator } from 'zustand';
import { projectsRepo, projectTasksRepo } from '@/lib/data';
import { withUndo } from '../undo';
import type { AppState, ProjectsActions } from '../types';

/* Work — projets et tâches de projet.

   RIEN N'EST CALCULÉ ICI. Le groupement par statut, l'avancement et le retard
   vivent dans `lib/domain/projects.ts`, avec leurs tests. Cette tranche ne fait
   qu'écrire en base et refléter l'écriture dans l'état. */

export const createProjectsSlice: StateCreator<AppState, [], [], ProjectsActions> = (set, get) => ({
  async createProject(input) {
    const projet = await projectsRepo.create(input);
    set((s) => ({ projects: [...s.projects, projet] }));
  },

  async updateProject(id, patch) {
    const suivant = await projectsRepo.update(id, patch);
    if (!suivant) return;
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? suivant : p)) }));
  },

  async deleteProject(id) {
    const projet = get().projects.find((p) => p.id === id);
    if (!projet) return;

    /* LES TÂCHES PARTENT AVEC LE PROJET. Une tâche dont le projet n'existe plus
       n'est atteignable par aucune vue : elle occuperait la base, l'export et
       la sauvegarde en silence, et reviendrait à la vie si un projet
       réutilisait un jour le même identifiant. L'annulation les restaure
       toutes — c'est pour cela qu'on note leurs identifiants AVANT. */
    const filles = get().projectTasks.filter((t) => t.projectId === id);

    await withUndo(set, get, { messageKey: 'app.projDeleted', label: projet.name }, async () => {
      await Promise.all(filles.map((t) => projectTasksRepo.softDelete(t.id)));
      await projectsRepo.softDelete(id);
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        projectTasks: s.projectTasks.filter((t) => t.projectId !== id),
      }));
    });
  },

  async createProjectTask(input) {
    const tache = await projectTasksRepo.create(input);
    set((s) => ({ projectTasks: [...s.projectTasks, tache] }));
  },

  async updateProjectTask(id, patch) {
    const suivant = await projectTasksRepo.update(id, patch);
    if (!suivant) return;
    set((s) => ({ projectTasks: s.projectTasks.map((t) => (t.id === id ? suivant : t)) }));
  },

  /* Chemin court du changement de statut : c'est le geste le plus fréquent de
     la vue, et il ne mérite pas d'ouvrir l'éditeur. */
  async setProjectTaskStatus(id, status) {
    await get().updateProjectTask(id, { status });
  },

  async deleteProjectTask(id) {
    const tache = get().projectTasks.find((t) => t.id === id);
    if (!tache) return;
    await withUndo(set, get, { messageKey: 'app.ptaskDeleted', label: tache.name }, async () => {
      await projectTasksRepo.softDelete(id);
      set((s) => ({ projectTasks: s.projectTasks.filter((t) => t.id !== id) }));
    });
  },
});
