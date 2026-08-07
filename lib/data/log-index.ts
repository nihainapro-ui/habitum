import type { LogEntry, LogIndex } from '@/lib/domain';
import { logKey } from '@/lib/domain';
import { logsRepo } from './repositories';

/* Joint entre lib/data et lib/domain : le domaine ne connaît que `LogIndex`,
   une ReadonlyMap. Il ne saura jamais qu'IndexedDB existe (G2).
   Une clé absente rend `undefined`, jamais 0 — `isDone` distingue « aucune
   entrée » de « valeur 0 » pour le type `limit` (G9). */

export function buildLogIndex(rows: readonly LogEntry[]): LogIndex {
  const m = new Map<string, number>();
  for (const r of rows) m.set(logKey(r.habitId, r.date), r.value);
  return m;
}

export async function loadLogIndex(): Promise<LogIndex> {
  return buildLogIndex(await logsRepo.all());
}

export async function loadLogIndexWindow(
  habitIds: readonly string[],
  from: string,
  to: string,
): Promise<LogIndex> {
  const parts = await Promise.all(habitIds.map((id) => logsRepo.getWindow(id, from, to)));
  return buildLogIndex(parts.flat());
}
