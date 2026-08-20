import type { StateCreator } from 'zustand';
import { dailyTarget, isDone, logKey, parseKey, type LogIndex } from '@/lib/domain';
import { goalsRepo, habitsRepo, logsRepo, notesRepo } from '@/lib/data';
import { cacheDerive } from '../derived';
import { withUndo } from '../undo';
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

  /* Changer la DÉFINITION change les métriques : une habitude qui passe de
     « tous les jours » à « le lundi » n'a plus la même série. */
  async updateHabit(id, patch) {
    const suivant = await habitsRepo.update(id, patch);
    if (!suivant) return;
    cacheDerive.invalidateHabit(id);
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? suivant : h)) }));
  },

  /* Supprimer une habitude emporte ses dépendances :
     - son JOURNAL reçoit des pierres tombales — le laisser en place ferait
       ressortir des chiffres d'une habitude qui n'existe plus ;
     - ses NOTES d'habitude partent avec elle ;
     - les OBJECTIFS qui la référencent SURVIVENT ; seul le lien vers la source
       disparaît. Un objectif appartient à l'utilisateur, pas à l'habitude, et
       le supprimer serait une décision qu'il n'a pas prise.
     L'instantané de `withUndo` couvre les quatre : sans cela, l'annulation
     rendrait l'habitude et perdrait son historique. */
  async deleteHabit(id) {
    const h = get().habits.find((x) => x.id === id);
    if (!h) return;

    await withUndo(set, get, { messageKey: 'app.hDeleted', label: h.name }, async () => {
      const prefixe = `${id}|`;
      for (const cle of get().logIndex.keys()) {
        if (cle.startsWith(prefixe)) await logsRepo.tombstone(id, cle.slice(prefixe.length));
      }
      for (const n of get().notes.filter((x) => x.kind === 'habit' && x.habitId === id)) {
        await notesRepo.softDelete(n.id);
      }
      for (const g of get().goals.filter((x) => x.sourceHabitId === id)) {
        await goalsRepo.update(g.id, { sourceHabitId: undefined });
      }
      await habitsRepo.softDelete(id);
      cacheDerive.invalidateHabit(id);

      set((s) => ({
        habits: s.habits.filter((x) => x.id !== id),
        notes: s.notes.filter((n) => !(n.kind === 'habit' && n.habitId === id)),
        /* Le store doit refléter EXACTEMENT ce que le dépôt vient d'écrire :
           la clé est RETIRÉE, pas posée à `undefined` (D23, voir le contrat de
           `UpdatePatch`). Sans ce soin, l'objet en mémoire et la ligne en base
           divergeraient sur la seule chose qui les distingue — et c'est
           précisément ce que la synchronisation lira un jour. */
        goals: s.goals.map((g) => {
          if (g.sourceHabitId !== id) return g;
          const { sourceHabitId: _detache, ...reste } = g;
          return reste;
        }),
        logIndex: new Map([...s.logIndex].filter(([cle]) => !cle.startsWith(prefixe))),
      }));
    });
  },

  async archiveHabit(id, archived) {
    await get().updateHabit(id, { archived });
  },

  /* ADR-0004 — l'invalidation est CIBLÉE : les métriques d'une habitude ne
     dépendent que de son journal. Cocher `h1` ne recalcule pas `h2`. C'est
     exactement le défaut B3 du prototype, qui vidait tout le cache. */
  async setLogValue(habitId, date, value) {
    await logsRepo.setValue(habitId, date, value);
    cacheDerive.invalidateHabit(habitId);
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

  async bumpHabit(habitId, date, delta) {
    const actuel = get().logIndex.get(logKey(habitId, date)) ?? 0;
    await get().setLogValue(habitId, date, Math.max(0, actuel + delta));
  },

  /* « Passer » n'est pas « ne rien faire » : c'est un zéro ÉCRIT. Sans lui,
     une habitude à plafond resterait indécidable sur le jour courant (G9), et
     l'utilisateur ne pourrait pas dire « aujourd'hui, non ». */
  async skipHabit(habitId, date) {
    const h = get().habits.find((x) => x.id === habitId);
    if (!h) return;
    await withUndo(set, get, { messageKey: 'app.tSkipped', label: h.name }, async () => {
      await get().setLogValue(habitId, date, 0);
    });
  },
});
