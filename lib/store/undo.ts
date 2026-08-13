import {
  logKey,
  type Goal,
  type Habit,
  type LogIndex,
  type Note,
  type Session,
  type ShoppingItem,
  type Task,
} from '@/lib/domain';
import {
  goalsRepo,
  habitsRepo,
  logsRepo,
  notesRepo,
  sessionsRepo,
  shoppingRepo,
  tasksRepo,
} from '@/lib/data';
import type { AppState, DataState } from './types';

/* ============================================================================
   Annulation.

   Le prototype prenait un `snapshot()` de tout l'état avant une action
   destructrice et l'exposait dans un toast. On garde ce principe, avec une
   exigence de plus, écrite noir sur blanc dans le plan : **l'instantané couvre
   l'entité ET ses dépendances**. Supprimer une habitude sans restaurer son
   journal serait une perte de données déguisée en annulation.

   L'annulation réécrit dans les DÉPÔTS avant de remettre le store à jour : une
   annulation qui ne rétablit que l'écran se découvre au rechargement suivant.

   Écart assumé au plan : sa signature était `withUndo(label, action)`. Ici
   `set` et `get` sont passés explicitement — sans quoi ce module importerait le
   store, que le store importe déjà par ses tranches, et le cycle se refermerait.
   ========================================================================= */

type Set = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
type Get = () => AppState;

/** Durée d'affichage d'un toast annulable, en millisecondes. */
export const UNDO_MS = 6000;

/** Les données restaurables. L'interface (`ui`) n'en fait pas partie : annuler
 *  une suppression ne doit pas ramener l'utilisateur sur l'écran d'avant. */
export type Snapshot = DataState;

let minuterie: ReturnType<typeof setTimeout> | null = null;

export function capturer(s: AppState): Snapshot {
  return {
    habits: [...s.habits],
    tasks: [...s.tasks],
    goals: [...s.goals],
    notes: [...s.notes],
    sessions: [...s.sessions],
    shopping: [...s.shopping],
    profiles: [...s.profiles],
    logIndex: new Map(s.logIndex),
    occurrences: new Set(s.occurrences),
    settings: { ...s.settings },
    activeProfileId: s.activeProfileId,
    isDemo: s.isDemo,
    lastExport: s.lastExport,
    nagDismissed: s.nagDismissed,
    onboarded: s.onboarded,
  };
}

interface RepoRestaurable<T> {
  restore(id: string): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<T | undefined>;
  softDelete(id: string): Promise<void>;
}

/** Ramène une collection à son état d'avant : ce qui a été supprimé revient,
 *  ce qui a été créé depuis repart, ce qui a été modifié reprend ses valeurs. */
async function restaurerCollection<T extends { id: string }>(
  repo: RepoRestaurable<T>,
  avant: readonly T[],
  apres: readonly T[],
): Promise<void> {
  const idsAvant = new Set(avant.map((r) => r.id));
  for (const r of apres) {
    if (!idsAvant.has(r.id)) await repo.softDelete(r.id);
  }
  for (const r of avant) {
    await repo.restore(r.id);
    await repo.update(r.id, r);
  }
}

/** Ramène le journal à son état d'avant. Les entrées apparues depuis reçoivent
 *  une pierre tombale ; celles d'avant sont réécrites telles quelles. */
async function restaurerJournal(avant: LogIndex): Promise<void> {
  for (const ligne of await logsRepo.all()) {
    if (!avant.has(logKey(ligne.habitId, ligne.date))) {
      await logsRepo.tombstone(ligne.habitId, ligne.date);
    }
  }
  for (const [cle, valeur] of avant) {
    const i = cle.indexOf('|');
    await logsRepo.setValue(cle.slice(0, i), cle.slice(i + 1), valeur);
  }
}

async function restaurer(instantane: Snapshot, actuel: AppState): Promise<void> {
  await restaurerCollection<Habit>(habitsRepo, instantane.habits, actuel.habits);
  await restaurerCollection<Task>(tasksRepo, instantane.tasks, actuel.tasks);
  await restaurerCollection<Goal>(goalsRepo, instantane.goals, actuel.goals);
  await restaurerCollection<Note>(notesRepo, instantane.notes, actuel.notes);
  await restaurerCollection<Session>(sessionsRepo, instantane.sessions, actuel.sessions);
  await restaurerCollection<ShoppingItem>(shoppingRepo, instantane.shopping, actuel.shopping);
  await restaurerJournal(instantane.logIndex);
}

/** Exécute une action réversible et pose le toast qui permet de la défaire.
 *
 *  Un seul toast à la fois : le précédent est remplacé et sa minuterie annulée.
 *  Deux toasts empilés, c'est une annulation qu'on croit avoir et qu'on n'a pas. */
export async function withUndo<T>(
  set: Set,
  get: Get,
  toast: { messageKey: string; label: string },
  action: () => Promise<T>,
): Promise<T> {
  const avant = capturer(get());
  const resultat = await action();

  if (minuterie) clearTimeout(minuterie);

  get().showToast({
    ...toast,
    undo: async () => {
      if (minuterie) {
        clearTimeout(minuterie);
        minuterie = null;
      }
      await restaurer(avant, get());
      set({
        habits: avant.habits,
        tasks: avant.tasks,
        goals: avant.goals,
        notes: avant.notes,
        sessions: avant.sessions,
        shopping: avant.shopping,
        logIndex: avant.logIndex,
      });
      get().dismissToast();
    },
  });

  minuterie = setTimeout(() => {
    minuterie = null;
    get().dismissToast();
  }, UNDO_MS);
  /* Un toast en attente ne doit pas maintenir le processus en vie sous Node
     (tests, rendu serveur). Sans effet dans un navigateur. */
  (minuterie as { unref?: () => void }).unref?.();

  return resultat;
}
