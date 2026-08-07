import { applyLegacyMigrations, readLegacyState } from './legacy';
import { emptyReport, importFromJson, type ImportReport } from './import';

/* Reprise d'un utilisateur du prototype : ses données vivent dans
   localStorage, sous des clés dont les noms sont figés (G1). On les lit, on
   rejoue les migrations du prototype, puis on passe par le MÊME importeur que
   pour un fichier de sauvegarde — il n'existe pas deux chemins d'entrée dans
   la base, donc pas deux listes blanches à tenir à jour. */

/** Lit le stockage hérité, migre, et écrit dans Dexie.
 *  Rend un rapport vide si rien n'a jamais été stocké. */
export async function migrateFromLegacy(storage: Storage): Promise<ImportReport> {
  const brut = readLegacyState(storage);
  if (!brut) return emptyReport();

  const etat = applyLegacyMigrations(brut);

  return importFromJson({
    app: 'Habitum',
    v: etat.v,
    habits: etat.habits ?? [],
    tasks: etat.tasks ?? [],
    obj: etat.obj ?? [],
    sessions: etat.sessions ?? [],
    shop: etat.shop ?? [],
    log: etat.ov ?? {},
    notes: etat.notes ?? {},
  });
}
