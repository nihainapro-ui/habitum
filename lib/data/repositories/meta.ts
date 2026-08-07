import { db } from '../db';
import { nowIso } from './base';

/** Table clé/valeur : drapeaux (démonstration, amorçage), version de schéma,
 *  cache dérivé. Une clé absente rend `undefined`, jamais une valeur par défaut. */
export const metaRepo = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await db.meta.get(key))?.value as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await db.meta.put({ key, value, updatedAt: nowIso() });
  },
  async remove(key: string): Promise<void> {
    await db.meta.delete(key);
  },
};
