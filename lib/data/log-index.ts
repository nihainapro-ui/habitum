import type { LogEntry, LogIndex } from '@/lib/domain';
import { addDays, dateKey, logKey, N_STREAK, today } from '@/lib/domain';
import { logsRepo } from './repositories';

/* Joint entre lib/data et lib/domain : le domaine ne connaît que `LogIndex`,
   une ReadonlyMap. Il ne saura jamais qu'IndexedDB existe (G2).
   Une clé absente rend `undefined`, jamais 0 — `isDone` distingue « aucune
   entrée » de « valeur 0 » pour le type `limit` (G9). */

export function buildLogIndex(rows: readonly LogEntry[]): LogIndex {
  const m = new Map<string, number>();
  for (const r of rows) {
    /* Pierre tombale : `deletedAt` distingue « valeur effacée » de « jamais
       saisie » (lib/domain/types.ts). Une valeur effacée doit donc être ABSENTE
       de l'index, pas présente à 0 — sinon une habitude `limit` redeviendrait
       réussie par la seule suppression de son entrée (G9). */
    if (r.deletedAt) continue;
    m.set(logKey(r.habitId, r.date), r.value);
  }
  return m;
}

export async function loadLogIndex(): Promise<LogIndex> {
  return buildLogIndex(await logsRepo.all());
}

/** Profondeur lue à l'OUVERTURE, en jours.
 *
 *  `N_STREAK` (420) est la fenêtre la plus profonde du domaine : aucune
 *  métrique affichée — série, record, taux, cumul, carte de chaleur — ne lit le
 *  journal au-delà. Lire tout le journal à l'ouverture coûtait deux secondes
 *  sur trois ans de données (tâche 5.10) pour des entrées que rien n'affiche
 *  avant que l'utilisateur ne remonte de plus d'un an. */
export const FENETRE_OUVERTURE = N_STREAK;

/** Journal des `FENETRE_OUVERTURE` derniers jours, en UNE requête de plage.
 *
 *  Le reste est chargé ensuite, en fond (`lib/store/hydrate.ts`) : l'index
 *  devient complet une seconde plus tard, sans faire attendre l'écran. */
export async function loadLogIndexRecent(now: Date = today()): Promise<LogIndex> {
  const debut = dateKey(addDays(now, -FENETRE_OUVERTURE));
  return buildLogIndex(await logsRepo.getWindowAll(debut, dateKey(now)));
}

export async function loadLogIndexWindow(
  habitIds: readonly string[],
  from: string,
  to: string,
): Promise<LogIndex> {
  const parts = await Promise.all(habitIds.map((id) => logsRepo.getWindow(id, from, to)));
  return buildLogIndex(parts.flat());
}
