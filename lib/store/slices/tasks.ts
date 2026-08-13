import type { StateCreator } from 'zustand';
import { addDays, borneDuree, dateKey, parseKey, redimensionner, type DateKey } from '@/lib/domain';
import { tasksRepo } from '@/lib/data';
import { withUndo } from '../undo';
import type { AppState, TasksActions } from '../types';

/* File d'attente des ajustements de durée.

   Chaque ajustement lit la durée courante DANS LE STORE, mais l'écriture est
   asynchrone : dix frappes lancées coup sur coup liraient toutes la même
   valeur, avant que la première n'ait été écrite, et neuf se perdraient. Les
   enchaîner garantit que chacune part de l'état que la précédente a laissé.
   C'est le cas d'un utilisateur qui MAINTIENT la touche enfoncée — pas un cas
   de test. */
let fileDurees: Promise<unknown> = Promise.resolve();

export const createTasksSlice: StateCreator<AppState, [], [], TasksActions> = (set, get) => ({
  async createTask(input) {
    const t = await tasksRepo.create(input);
    set((s) => ({ tasks: [...s.tasks, t] }));
  },

  async updateTask(id, patch) {
    const suivant = await tasksRepo.update(id, patch);
    if (!suivant) return;
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? suivant : t)) }));
  },

  async deleteTask(id) {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    await withUndo(set, get, { messageKey: 'app.tDeleted', label: t.name }, async () => {
      await tasksRepo.softDelete(id);
      set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
    });
  },

  async toggleTask(id) {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    await get().updateTask(id, { done: !t.done });
  },

  async snoozeTask(id) {
    const t = get().tasks.find((x) => x.id === id);
    const jour = parseKey(t?.date);
    if (!t || !jour) return;
    await withUndo(set, get, { messageKey: 'app.tSnoozed', label: t.name }, async () => {
      await get().updateTask(id, { date: dateKey(addDays(jour, 1)) });
    });
  },

  /* Déplacement et redimensionnement sont ANNULABLES : ce sont les deux seuls
     gestes du produit qu'on peut déclencher par accident, d'un glissement de
     souris de trois pixels. */
  async moveTask(id, date: DateKey, time?: string) {
    const t = get().tasks.find((x) => x.id === id);
    if (!t || (t.date === date && (time === undefined || t.time === time))) return;

    await withUndo(set, get, { messageKey: 'app.calMoved', label: t.name }, async () => {
      await get().updateTask(id, { date, ...(time === undefined ? {} : { time }) });
    });
  },

  async resizeTask(id, duration) {
    const t = get().tasks.find((x) => x.id === id);
    const suivante = borneDuree(duration);
    if (!t || t.duration === suivante) return;

    await withUndo(set, get, { messageKey: 'app.calResized', label: t.name }, async () => {
      await get().updateTask(id, { duration: suivante });
    });
  },

  async nudgeTaskDuration(id, deltaMin) {
    fileDurees = fileDurees.then(async () => {
      const t = get().tasks.find((x) => x.id === id);
      if (!t) return;
      await get().resizeTask(id, redimensionner(t.duration, deltaMin));
    });
    await fileDurees;
  },

  async toggleSubTask(id, index) {
    const t = get().tasks.find((x) => x.id === id);
    if (!t || !t.subTasks[index]) return;
    await get().updateTask(id, {
      subTasks: t.subTasks.map((s, i) => (i === index ? { ...s, done: !s.done } : s)),
    });
  },
});
