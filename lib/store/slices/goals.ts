import type { StateCreator } from 'zustand';
import { goalsRepo } from '@/lib/data';
import { withUndo } from '../undo';
import type { AppState, GoalsActions } from '../types';

export const createGoalsSlice: StateCreator<AppState, [], [], GoalsActions> = (set, get) => ({
  async createGoal(input) {
    const g = await goalsRepo.create(input);
    set((s) => ({ goals: [...s.goals, g] }));
  },

  async updateGoal(id, patch) {
    const suivant = await goalsRepo.update(id, patch);
    if (!suivant) return;
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? suivant : g)) }));
  },

  async deleteGoal(id) {
    const g = get().goals.find((x) => x.id === id);
    if (!g) return;
    await withUndo(set, get, { messageKey: 'app.objDeleted', label: g.name }, async () => {
      await goalsRepo.softDelete(id);
      set((s) => ({ goals: s.goals.filter((x) => x.id !== id) }));
    });
  },
});
