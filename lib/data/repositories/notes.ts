import { db } from '../db';
import { makeRepo } from './base';
import type { DateKey, Note } from '@/lib/domain';

const base = makeRepo<Note>(db.notes);

export const notesRepo = {
  ...base,
  async journalOf(date: DateKey): Promise<Note | undefined> {
    return (await base.list()).find((n) => n.kind === 'journal' && n.date === date);
  },
  async forHabit(habitId: string): Promise<Note[]> {
    return (await base.list()).filter((n) => n.kind === 'habit' && n.habitId === habitId);
  },
  /** Recherche plein texte — la vue Notes en dépend (T3.16). */
  async search(query: string): Promise<Note[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (await base.list()).filter((n) => n.body.toLowerCase().includes(q));
  },
};
