import { exportToJson, META_KEYS, metaRepo, type HabitumExport } from '@/lib/data';

/* Copie de secours automatique — tâche 5.8.

   Elle est prise AVANT les deux seules opérations qui peuvent tout effacer :
   l'import d'une sauvegarde et la réinitialisation. C'est l'équivalent de
   `habitum.state.bak` du prototype, rangé dans la table `meta`.

   Ce n'est pas une sauvegarde au sens de l'export : elle vit dans le même
   navigateur, donc elle disparaît avec lui. Elle protège d'un geste malheureux,
   pas d'une perte d'appareil — et l'interface ne prétend pas autre chose.

   Une seule copie, la dernière. Un historique de copies dans IndexedDB
   finirait par peser plus que les données qu'il protège. */

export interface CopieDeSecours {
  /** Horodatage ISO de la prise. */
  at: string;
  payload: HabitumExport;
}

/** Prend l'instantané SANS l'écrire.
 *
 *  La séparation compte : la réinitialisation vide la table `meta`, donc la
 *  copie doit être reposée APRÈS l'effacement, sans quoi elle serait effacée
 *  avec le reste — et le garde-fou disparaîtrait au moment précis où il sert. */
export async function construireCopie(): Promise<CopieDeSecours> {
  return { at: new Date().toISOString(), payload: await exportToJson() };
}

export async function ecrireCopie(copie: CopieDeSecours): Promise<void> {
  await metaRepo.set(META_KEYS.backup, copie);
}

export async function lireCopie(): Promise<CopieDeSecours | null> {
  return (await metaRepo.get<CopieDeSecours>(META_KEYS.backup)) ?? null;
}
