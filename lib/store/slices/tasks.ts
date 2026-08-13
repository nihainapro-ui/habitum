import type { StateCreator } from 'zustand';
import {
  addDays,
  borneDuree,
  dateKey,
  nextOccurrence,
  occurrenceKey,
  parseKey,
  redimensionner,
  type DateKey,
} from '@/lib/domain';
import { META_KEYS, metaRepo, tasksRepo } from '@/lib/data';
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

/** Écrit les occurrences accomplies au format persisté — `{ clé: 1 }`, nom et
 *  forme figés (G1). L'ensemble sert à l'interface, l'objet à la base. */
const ecrireOccurrences = async (occurrences: ReadonlySet<string>): Promise<void> => {
  const objet: Record<string, number> = {};
  for (const cle of occurrences) objet[cle] = 1;
  await metaRepo.set(META_KEYS.occ, objet);
};

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
    await get().toggleTaskOn(id, t.date);
  },

  /* Cocher une tâche RÉCURRENTE ne la termine pas : elle revient.
     Ce que le produit affichait — « ⟳ Quotidienne » — était donc une promesse
     que rien ne tenait : la tâche cochée disparaissait pour toujours.

     Trois écritures, dans cet ordre : l'occurrence du jour est mémorisée
     (`occ`, format figé G1), la tâche avance à son échéance suivante, et
     l'affichage garde la trace de ce qui a été fait ce jour-là. Décocher
     défait exactement cela — l'échéance revient au jour décoché. */
  async toggleTaskOn(id, date) {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;

    if (!t.recurrence) {
      await get().updateTask(id, { done: !t.done });
      return;
    }

    const cle = occurrenceKey(id, date);
    const faite = get().occurrences.has(cle);
    const suivantes = new Set(get().occurrences);

    if (faite) {
      suivantes.delete(cle);
      /* On rouvre le jour décoché : la série reprend là où l'utilisateur vient
         de dire qu'elle n'était pas faite. */
      await get().updateTask(id, { date, done: false });
    } else {
      suivantes.add(cle);
      const prochaine = nextOccurrence(t, date, suivantes);
      /* Sans occurrence suivante, la série est finie : la tâche se termine
         comme une tâche ordinaire, plutôt que de rester due indéfiniment. */
      await get().updateTask(id, prochaine ? { date: prochaine, done: false } : { done: true });
    }

    await ecrireOccurrences(suivantes);
    set({ occurrences: suivantes });
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
