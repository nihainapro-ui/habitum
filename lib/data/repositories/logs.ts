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

  async setValue(habitId: string, date: DateKey, value: number): Promise<void> {
    await db.logs.put({ habitId, date, value, updatedAt: nowIso() });
  },

  async clear(habitId: string, date: DateKey): Promise<void> {
    await db.logs.delete([habitId, date]);
  },

  /** Journal complet d'une habitude — utilisé à la suppression définitive. */
  async deleteForHabit(habitId: string): Promise<void> {
    await db.logs.where('habitId').equals(habitId).delete();
  },

  async bulkPut(rows: LogEntry[]): Promise<void> {
    await db.logs.bulkPut(rows);
  },
};
