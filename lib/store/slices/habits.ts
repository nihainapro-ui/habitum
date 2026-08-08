import type { StateCreator } from 'zustand';
import { dailyTarget, isDone, logKey, parseKey, type LogIndex } from '@/lib/domain';
import { habitsRepo, logsRepo } from '@/lib/data';
import type { AppState, HabitsActions } from '../types';

/* Toute action écrit D'ABORD au dépôt, ensuite au store. Jamais l'inverse :
   une écriture qui échoue ne doit pas laisser une interface qui affiche ce que
   la base ne contient pas. */

/** Nouvel index avec une entrée modifiée.
 *
 *  Le plan disait « reconstruit par `buildLogIndex` après toute écriture ».
 *  Écart assumé : `buildLogIndex(await logsRepo.all())` relit TOUT le journal à
 *  chaque coche — 219 000 lignes à la charge visée en tâche 7.5, pour un objectif
 *  de « clic < 100 ms ». On recopie la Map et on modifie l'entrée concernée :
 *  même immuabilité, même type, sans le trajet en base. Aucune dérive possible,
 *  puisque le store n'est mis à jour qu'après une écriture réussie. */
const avecEntree = (index: LogIndex, habitId: string, date: string, value: number): LogIndex => {
  const suivant = new Map(index);
  suivant.set(logKey(habitId, date), value);
  return suivant;
};

export const createHabitsSlice: StateCreator<AppState, [], [], HabitsActions> = (set, get) => ({
  async createHabit(input) {
    const h = await habitsRepo.create(input);
    set((s) => ({ habits: [...s.habits, h] }));
  },

  async updateHabit(id, patch) {
    const suivant = await habitsRepo.update(id, patch);
    if (!suivant) return;
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? suivant : h)) }));
  },

  async deleteHabit(id) {
    await habitsRepo.softDelete(id);
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
  },

  async archiveHabit(id, archived) {
    await get().updateHabit(id, { archived });
  },

  async setLogValue(habitId, date, value) {
    await logsRepo.setValue(habitId, date, value);
    set((s) => ({ logIndex: avecEntree(s.logIndex, habitId, date, value) }));
  },

  /* Bascule « fait / pas fait ». La décision appartient au domaine : `isDone`
     porte la sémantique inversée de `limit` et la tolérance du jour courant,
     `dailyTarget` porte les sept types. Rien n'est décidé ici.
     Les types à compteur (`count`, `time`, `total`, `limit`) passent plutôt par
     `setLogValue` depuis les boutons −/+ de la vue du jour. */
  async toggleHabit(habitId, date) {
    const h = get().habits.find((x) => x.id === habitId);
    const jour = parseKey(date);
    if (!h || !jour) return;
    const fait = isDone(get().logIndex, h, jour);
    await get().setLogValue(habitId, date, fait ? 0 : dailyTarget(h));
  },
});
