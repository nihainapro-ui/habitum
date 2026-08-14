import type { LogEntry, LogIndex } from '@/lib/domain';
import { addDays, dateKey, logKey, N_STREAK, today } from '@/lib/domain';
import { logsRepo } from './repositories';
import { ecrireInstantane, lireInstantane } from './log-snapshot';

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

/** Horodatage le plus récent d'un lot de lignes — le filigrane de l'instantané. */
const filigraneDe = (rows: readonly LogEntry[], depuis = ''): string => {
  let max = depuis;
  for (const r of rows) if (r.updatedAt > max) max = r.updatedAt;
  return max;
};

export interface OuvertureJournal {
  index: LogIndex;
  /** L'index couvre-t-il TOUT l'historique ? Faux sur le chemin de repli, où
   *  seule la fenêtre récente est lue et où le reste arrive en fond. */
  complete: boolean;
  /** Filigrane à réécrire dans l'instantané. Vide si l'index n'est pas complet. */
  watermark: string;
  /** L'instantané enregistré est-il déjà à jour ? Sert à ne pas réécrire
   *  219 000 clés pour rien à chaque ouverture. */
  aJour: boolean;
}

/** Lecture d'OUVERTURE du journal — tâche 5.10.
 *
 *  Chemin normal : l'instantané (une ligne de `meta`) plus le DELTA des lignes
 *  modifiées depuis son filigrane. Une désérialisation et une requête d'index,
 *  au lieu de 219 000 lectures de lignes.
 *
 *  Chemin de repli, quand il n'y a pas encore d'instantané : la fenêtre récente
 *  (420 jours), complétée en fond. C'est la toute première ouverture d'une base
 *  importée — elle est lente une fois, puis plus jamais. */
export async function loadLogIndexOuverture(now: Date = today()): Promise<OuvertureJournal> {
  const instantane = await lireInstantane();

  if (!instantane) {
    return { index: await loadLogIndexRecent(now), complete: false, watermark: '', aJour: false };
  }

  const delta = await logsRepo.since(instantane.at);
  const index = new Map(Object.entries(instantane.entries));
  for (const r of delta) {
    const cle = logKey(r.habitId, r.date);
    /* Une pierre tombale RETIRE la clé : la laisser à sa valeur d'avant
       ferait réapparaître une entrée effacée, et `limit` redeviendrait réussie
       par la seule suppression de son entrée (G9). */
    if (r.deletedAt) index.delete(cle);
    else index.set(cle, r.value);
  }

  /* Le delta n'est JAMAIS vide quand le filigrane vient d'une ligne existante :
     la borne est inclusive, donc cette ligne-là revient à chaque ouverture.
     « À jour » ne veut donc pas dire « delta vide », mais « rien de plus récent
     que le filigrane » — sans quoi on réécrirait 219 000 clés à chaque
     ouverture, pour rien. */
  const filigrane = filigraneDe(delta, instantane.at);

  return { index, complete: true, watermark: filigrane, aJour: filigrane === instantane.at };
}

/** Journal COMPLET relu depuis la table, avec son filigrane. */
export async function loadLogIndexComplet(): Promise<{ index: LogIndex; watermark: string }> {
  const rows = await logsRepo.all();
  return { index: buildLogIndex(rows), watermark: filigraneDe(rows) };
}

/** Enregistre l'instantané d'ouverture. Sans filigrane, il n'y a rien à
 *  enregistrer : un instantané sans repère ne pourrait pas être rattrapé. */
export async function memoriserOuverture(index: LogIndex, watermark: string): Promise<void> {
  if (!watermark) return;
  await ecrireInstantane(index, watermark);
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
