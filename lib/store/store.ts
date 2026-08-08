import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@/lib/data';
import { chargerTout } from './hydrate';
import { createGoalsSlice } from './slices/goals';
import { createHabitsSlice } from './slices/habits';
import { createNotesSlice } from './slices/notes';
import { createSessionsSlice } from './slices/sessions';
import { createSettingsSlice } from './slices/settings';
import { createShoppingSlice } from './slices/shopping';
import { createTasksSlice } from './slices/tasks';
import { createUiSlice, uiInitial } from './slices/ui';
import type { AppState, DataState } from './types';

/** État de données d'un store neuf. Aucune donnée fabriquée : le vide est
 *  l'état honnête tant que l'hydratation n'a pas lu la base (G3). */
const donneesInitiales: DataState = {
  habits: [],
  tasks: [],
  goals: [],
  notes: [],
  sessions: [],
  shopping: [],
  logIndex: new Map(),
  settings: DEFAULT_SETTINGS,
  profiles: [],
  activeProfileId: null,
  isDemo: false,
};

export const useStore = create<AppState>()((...a) => ({
  ...donneesInitiales,
  ui: uiInitial,

  ...createHabitsSlice(...a),
  ...createTasksSlice(...a),
  ...createGoalsSlice(...a),
  ...createNotesSlice(...a),
  ...createSessionsSlice(...a),
  ...createShoppingSlice(...a),
  ...createSettingsSlice(...a),
  ...createUiSlice(...a),

  async hydrate() {
    const [set] = a;
    set((s) => ({ ui: { ...s.ui, loading: true, error: null } }));
    try {
      const donnees = await chargerTout();
      set((s) => ({ ...donnees, ui: { ...s.ui, loading: false } }));
    } catch (err) {
      /* Une lecture qui échoue ne doit pas laisser un écran de chargement
         éternel : l'utilisateur doit pouvoir agir — au minimum exporter ses
         données (phase 5, tâche 5.1). */
      set((s) => ({
        ui: {
          ...s.ui,
          loading: false,
          error: err instanceof Error ? err.message : 'Lecture impossible',
        },
      }));
    }
  },
}));
