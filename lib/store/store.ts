import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@/lib/data';
import { timerInitial } from '@/lib/domain';
import { cacheDerive } from './derived';
import { chargerTout, completerJournal } from './hydrate';
import { createAccountSlice } from './slices/account';
import { createGoalsSlice } from './slices/goals';
import { createHabitsSlice } from './slices/habits';
import { createNotesSlice } from './slices/notes';
import { createSessionsSlice } from './slices/sessions';
import { createSettingsSlice } from './slices/settings';
import { createShoppingSlice } from './slices/shopping';
import { createTasksSlice } from './slices/tasks';
import { createTimerSlice } from './slices/timer';
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
  occurrences: new Set(),
  logIndexComplete: false,
  settings: DEFAULT_SETTINGS,
  profiles: [],
  activeProfileId: null,
  isDemo: false,
  lastExport: null,
  nagDismissed: false,
  backupAt: null,
  /* `true` tant que la base n'a pas parlé : on ne renvoie personne vers
     l'accueil sur la foi d'un état non lu. La lecture, elle, dit la vérité. */
  onboarded: true,
};

export const useStore = create<AppState>()((...a) => ({
  ...donneesInitiales,
  ui: uiInitial,
  timer: timerInitial,

  ...createHabitsSlice(...a),
  ...createTasksSlice(...a),
  ...createGoalsSlice(...a),
  ...createNotesSlice(...a),
  ...createSessionsSlice(...a),
  ...createShoppingSlice(...a),
  ...createSettingsSlice(...a),
  ...createTimerSlice(...a),
  ...createAccountSlice(...a),
  ...createUiSlice(...a),

  async hydrate() {
    const [set] = a;
    set((s) => ({ ui: { ...s.ui, loading: true, error: null } }));
    /* Relire la base, c'est repartir d'un état qu'on ne connaissait pas : rien
       de ce qui était mémorisé ne peut être présumé vrai (tâche 5.9). */
    cacheDerive.clear();
    try {
      /* Ouverture en DEUX TEMPS (tâche 5.10) : la fenêtre récente d'abord —
         c'est tout ce que les métriques affichées lisent — puis le journal
         complet en fond, pour que remonter à trois ans en arrière reste exact.
         Sur 200 habitudes et 84 000 entrées, l'écran passe de 2,2 s à 0,3 s. */
      const donnees = await chargerTout(true);
      set((s) => ({ ...donnees, ui: { ...s.ui, loading: false } }));

      void completerJournal().then((complet) => {
        /* On ne réécrase que si rien n'a été journalisé entre-temps : une coche
           faite pendant le chargement de fond ne doit pas être perdue. La
           fenêtre récente fait autorité sur ce qu'elle contient. */
        set((s) => ({
          logIndex: new Map([...complet, ...s.logIndex]),
          logIndexComplete: true,
        }));
      });
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
