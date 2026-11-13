import type { StateCreator } from 'zustand';
import { goalsRepo } from '@/lib/data';
import { basculerJalon } from '@/lib/domain';
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

  /* Un jalon se coche SUR LA CARTE (arbitrage n° 5 du 18 septembre 2026,
     `docs/handoff/10-ECARTS-P3-MOBILE.md`). Annulable : c'est un appui d'un
     doigt sur une ligne de 44 px, exactement le geste qu'on fait par erreur.
     La décision — quel jalon, quelle liste — appartient au domaine. */
  async toggleMilestone(id, index) {
    const g = get().goals.find((x) => x.id === id);
    if (!g) return;
    const jalons = basculerJalon(g, index);
    if (!jalons) return;
    const jalon = jalons[index]!;
    await withUndo(
      set,
      get,
      { messageKey: jalon.done ? 'app.msChecked' : 'app.msUnchecked', label: jalon.label },
      () => get().updateGoal(id, { milestones: jalons }),
    );
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
