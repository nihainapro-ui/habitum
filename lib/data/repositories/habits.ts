import { db } from '../db';
import { makeRepo } from './base';
import type { Category, Habit } from '@/lib/domain';

const base = makeRepo<Habit>(db.habits);

export const habitsRepo = {
  ...base,
  /** Non supprimées ET non archivées — ce que les vues affichent par défaut. */
  async listActive(): Promise<Habit[]> {
    return (await base.list()).filter((h) => !h.archived);
  },
  async listByCategory(category: Category): Promise<Habit[]> {
    return (await base.list()).filter((h) => h.category === category);
  },
};
