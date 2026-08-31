import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '@/lib/data';
import { timerInitial } from '@/lib/domain';
import { logError } from '@/lib/logger';
import { cacheDerive } from './derived';
import { chargerTout, completerJournal, memoriserJournal } from './hydrate';
import { createAccountSlice } from './slices/account';
import { createGoalsSlice } from './slices/goals';
import { createHabitsSlice } from './slices/habits';
import { createNotesSlice } from './slices/notes';
import { createSessionsSlice } from './slices/sessions';
import { createSettingsSlice } from './slices/settings';
import { createShoppingSlice } from './slices/shopping';
import { createProjectsSlice } from './slices/projects';
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
  projects: [],
  projectTasks: [],
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
  ...createProjectsSlice(...a),
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
      /* Ouverture par INSTANTANÉ (tâche 5.10) : une ligne de `meta` porte
         l'index déjà construit, et seules les lignes modifiées depuis sont
         relues. Sur 200 habitudes × 3 ans — 219 000 entrées — l'ouverture passe
         de 5 s à moins d'une seconde, sans rien approximer : l'index est
         COMPLET dès le premier écran. */
      const { watermark, aJour, ...donnees } = await chargerTout();
      set((s) => ({ ...donnees, ui: { ...s.ui, loading: false } }));

      /* Le travail de fond ne doit JAMAIS faire tomber l'application : il n'a
         aucune conséquence visible s'il échoue — l'index affiché est déjà bon,
         seule l'ouverture suivante sera plus lente. Un onglet fermé pendant
         l'écriture ferme la base sous les pieds de la promesse ; c'est le cas
         normal, pas une anomalie. */
      const enFond = (p: Promise<unknown>) => {
        void p.catch((e: unknown) => void logError('journal', e));
      };

      if (donnees.logIndexComplete) {
        /* Instantané déjà à jour : on ne réécrit pas 219 000 clés pour rien. */
        if (!aJour) enFond(memoriserJournal(donnees.logIndex, watermark));
        return;
      }

      /* Repli — aucun instantané enregistré : la fenêtre récente est déjà
         affichée, on complète en fond puis on mémorise. C'est la toute première
         ouverture d'une base importée : lente une fois, plus jamais. */
      enFond(
        completerJournal().then(({ index, watermark: filigrane }) => {
          /* On ne réécrase que si rien n'a été journalisé entre-temps : une
             coche faite pendant le chargement de fond ne doit pas être perdue.
             La fenêtre récente fait autorité sur ce qu'elle contient. */
          const complet = new Map([...index, ...useStore.getState().logIndex]);
          set({ logIndex: complet, logIndexComplete: true });
          return memoriserJournal(complet, filigrane);
        }),
      );
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
