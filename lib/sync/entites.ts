import { db } from '@/lib/data/db';
import { logsRepo } from '@/lib/data';
import type { LogEntry } from '@/lib/domain';
import { SYNC_KINDS, type SyncKind } from './types';

/* LA SEULE PARTIE DE `lib/sync/` QUI CONNAÎT DEXIE.
 *
 * Tout le reste du module est pur ou parle HTTP. Ici on traduit : une table
 * Dexie devient des lignes synchronisables, et inversement.
 *
 * CE QUI NE SE SYNCHRONISE PAS, et pourquoi :
 *   `timer`         un minuteur en cours n'a de sens que sur l'appareil qui le
 *                   fait tourner ; le recevoir ferait démarrer un chrono ailleurs
 *   `logSnapshot`   cache reconstructible — le transporter, c'est transporter
 *                   une copie périmée de ce qu'on transporte déjà
 *   `errors`        journal LOCAL (décision E) ; il décrit CET appareil
 *   `seeded`        drapeau d'amorçage, propre à l'installation
 *   `activeProfile` quel profil on REGARDE ; chacun son écran
 *   `lastExport` / `nagDismissed`  le rappel de sauvegarde est par appareil */

/** Les deux seules clés de `meta` qui voyagent. */
export const CLES_META_SYNCHRONISEES = ['settings', 'occ'] as const;

export interface LigneLocale {
  kind: SyncKind;
  id: string;
  updatedAt: string;
  valeur: unknown;
}

/** Le journal n'a pas d'identifiant propre : sa clé est le couple
 *  [habitId+date]. La barre verticale est sûre — ni un identifiant ni une date
 *  n'en contiennent. */
const cleJournal = (e: LogEntry): string => `${e.habitId}|${e.date}`;

/* Les tables génériques : tout `SyncKind` sauf `meta` (clé/valeur, deux clés
   retenues seulement) et `logs` (clé composite, pas de table `EntityTable`).
   Dérivée de `SYNC_KINDS` — jamais recopiée — pour ne perdre aucun genre si la
   liste bouge un jour (piège n°1 du CLAUDE.md). */
const TABLES = SYNC_KINDS.filter((k) => k !== 'meta' && k !== 'logs');

export async function lireDepuis(filigrane: string): Promise<LigneLocale[]> {
  const lignes: LigneLocale[] = [];

  /* Toutes les tables indexent `updatedAt` (lib/data/db.ts) : la requête de
     plage évite un balayage complet, quelle que soit la taille de la base.
     `aboveOrEqual` (>=) est délibéré, comme dans `logsRepo.since` : une ligne
     écrite dans la même milliseconde que le filigrane doit être relue plutôt
     que ratée — la réappliquer est sans effet, la rater est une perte. */
  for (const kind of TABLES) {
    const rows = await db
      .table(kind)
      .where('updatedAt')
      .aboveOrEqual(filigrane)
      .toArray();
    for (const r of rows) {
      /* Les entités supprimées logiquement (`deletedAt`) NE SONT PAS filtrées
         ici : c'est ainsi que l'autre appareil apprend l'effacement. Ne pas
         les remonter les ressusciterait sur l'appareil distant.
         `makeRepo().list()` les filtre, lui — il ne convient pas ici. */
      lignes.push({ kind, id: String(r.id), updatedAt: String(r.updatedAt), valeur: r });
    }
  }

  for (const e of await logsRepo.since(filigrane)) {
    lignes.push({ kind: 'logs', id: cleJournal(e), updatedAt: e.updatedAt, valeur: e });
  }

  for (const cle of CLES_META_SYNCHRONISEES) {
    const row = await db.meta.get(cle);
    if (row && row.updatedAt >= filigrane) {
      lignes.push({ kind: 'meta', id: cle, updatedAt: row.updatedAt, valeur: row.value });
    }
  }

  return lignes;
}

export async function lireUne(kind: SyncKind, id: string): Promise<LigneLocale | undefined> {
  if (kind === 'meta') {
    const row = await db.meta.get(id);
    return row ? { kind, id, updatedAt: row.updatedAt, valeur: row.value } : undefined;
  }
  if (kind === 'logs') {
    const [habitId, date] = id.split('|');
    const e = await db.logs.get([habitId!, date!]);
    return e ? { kind, id, updatedAt: e.updatedAt, valeur: e } : undefined;
  }
  const row = await db.table(kind).get(id);
  return row ? { kind, id, updatedAt: String(row.updatedAt), valeur: row } : undefined;
}

/** Écrit une ligne REÇUE d'un autre appareil.
 *
 *  DÉCISION : la signature prend `updatedAt` en QUATRIÈME paramètre explicite,
 *  et non trois comme envisagé un temps. Pour `kind === 'meta'`, `valeur` est
 *  le CONTENU stocké (celui de `settings` ou de `occ`), pas la ligne `meta` —
 *  il ne porte aucun `updatedAt` à en extraire. Le déduire aurait forcé un
 *  repli sur `new Date()`, et toute ligne `meta` reçue aurait alors gagné
 *  systématiquement l'arbitrage contre une modification locale plus récente
 *  (voir `distanteGagne` dans `lib/sync/merge.ts`). L'horodatage voyage donc
 *  toujours à part, jamais déduit de la valeur.
 *
 *  Pour les tables génériques, `db.table(kind).put(valeur)` est utilisé
 *  directement plutôt que le `putRaw` de `makeRepo()` : `putRaw` n'est pas
 *  atteignable génériquement depuis un simple `SyncKind` (chaque dépôt est un
 *  objet distinct, pas indexé par genre), et les deux écritures reviennent de
 *  toute façon exactement au même `table.put` — ce n'est pas un oubli. */
export async function ecrire(
  kind: SyncKind,
  id: string,
  valeur: unknown,
  updatedAt: string,
): Promise<void> {
  if (kind === 'meta') {
    await db.meta.put({ key: id, value: valeur, updatedAt });
    return;
  }
  if (kind === 'logs') {
    /* La ligne de journal porte déjà son propre `updatedAt` — inutile de le
       repasser, `LogEntry` le contient. */
    await logsRepo.putRaw(valeur as LogEntry);
    return;
  }
  await db.table(kind).put(valeur);
}
