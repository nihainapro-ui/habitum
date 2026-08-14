import { db } from '../db';
import { nowIso } from './base';
import type { DateKey, LogEntry } from '@/lib/domain';

/* Le journal n'a pas d'identifiant propre : sa clé est le couple
   [habitId+date]. Il ne passe donc pas par makeRepo(). */
export const logsRepo = {
  async all(): Promise<LogEntry[]> {
    return db.logs.toArray();
  },

  async get(habitId: string, date: DateKey): Promise<LogEntry | undefined> {
    return db.logs.get([habitId, date]);
  },

  /** Fenêtre bornée, bornes incluses. Passe par l'index composite :
   *  aucun balayage complet, quelle que soit la taille du journal. */
  async getWindow(habitId: string, from: DateKey, to: DateKey): Promise<LogEntry[]> {
    return db.logs
      .where('[habitId+date]')
      .between([habitId, from], [habitId, to], true, true)
      .toArray();
  },

  /** Fenêtre bornée TOUTES HABITUDES CONFONDUES, par l'index `date`.
   *
   *  C'est la lecture d'ouverture (tâche 5.10) : une seule requête de plage au
   *  lieu d'une par habitude — avec 200 habitudes, la différence est de deux
   *  cents allers-retours. */
  async getWindowAll(from: DateKey, to: DateKey): Promise<LogEntry[]> {
    return db.logs.where('date').between(from, to, true, true).toArray();
  },

  /** Lignes modifiées depuis un filigrane, bornes INCLUSES.
   *
   *  Le `>=` est délibéré : deux écritures faites dans la même milliseconde que
   *  le filigrane doivent être relues plutôt que ratées. Réappliquer une entrée
   *  est sans effet ; en rater une est une donnée perdue (tâche 5.10). */
  async since(filigrane: string): Promise<LogEntry[]> {
    return db.logs.where('updatedAt').aboveOrEqual(filigrane).toArray();
  },

  async setValue(habitId: string, date: DateKey, value: number): Promise<void> {
    await db.logs.put({ habitId, date, value, updatedAt: nowIso() });
  },

  /* Effacement DUR : la ligne disparaît sans laisser de trace dans `updatedAt`.
     L'instantané d'ouverture ne peut donc pas le voir par son delta — il est
     oublié, et sera reconstruit (tâche 5.10). */
  async clear(habitId: string, date: DateKey): Promise<void> {
    await db.logs.delete([habitId, date]);
    await db.meta.delete('logSnapshot');
  },

  /** Efface une valeur en gardant la trace de l'effacement.
   *  `deletedAt` distingue « valeur effacée » de « jamais saisie » — la
   *  distinction est vitale pour le type `limit` (G9), et c'est ce qui
   *  permettra à deux appareils de converger sans ressusciter l'entrée. */
  async tombstone(habitId: string, date: DateKey): Promise<void> {
    const at = nowIso();
    const ligne = await db.logs.get([habitId, date]);
    if (!ligne) return;
    await db.logs.put({ ...ligne, deletedAt: at, updatedAt: at });
  },

  /** Journal complet d'une habitude — utilisé à la suppression définitive. */
  async deleteForHabit(habitId: string): Promise<void> {
    await db.logs.where('habitId').equals(habitId).delete();
    await db.meta.delete('logSnapshot');
  },

  async bulkPut(rows: LogEntry[]): Promise<void> {
    await db.logs.bulkPut(rows);
  },
};
