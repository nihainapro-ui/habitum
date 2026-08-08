import type { StateCreator } from 'zustand';
import { tasksRepo } from '@/lib/data';
import { withUndo } from '../undo';
import type { AppState, TasksActions } from '../types';

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
});
