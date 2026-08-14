import type { LogIndex } from '@/lib/domain';
import { metaRepo } from './repositories';
import { META_KEYS } from './seed';

/* ============================================================================
   Instantané du journal — tâche 5.10.

   LE PROBLÈME. Le journal est une TABLE : trois ans de suivi pour deux cents
   habitudes font 219 000 lignes, et IndexedDB en lit ~40 000 par seconde. Cinq
   secondes avant le premier écran, pour des données qui n'ont pas bougé depuis
   la dernière ouverture.

   LA SOLUTION. Un instantané : UNE ligne de `meta` qui contient l'index déjà
   construit, plus un FILIGRANE — l'horodatage le plus récent qu'il prend en
   compte. À l'ouverture, on lit cette ligne (une seule désérialisation) et on
   ne relit de la table que ce qui a changé depuis (`updatedAt >= filigrane`),
   c'est-à-dire presque rien.

   CE QUE CE N'EST PAS : une seconde source de vérité. La table `logs` reste la
   seule ; l'instantané est un cache reconstructible, et trois règles le
   garantissent :

   1. **Le filigrane est inclusif** (`>=`). Deux écritures dans la même
      milliseconde que le filigrane sont relues plutôt que ratées ; réappliquer
      une entrée est sans effet, en rater une est une donnée perdue.
   2. **Les pierres tombales sont appliquées** : une entrée supprimée depuis
      l'instantané est RETIRÉE de l'index, jamais laissée à sa valeur d'avant.
   3. **Toute suppression DURE oublie l'instantané** — réinitialisation,
      effacement du journal d'une habitude. Un effacement ne laisse pas de
      trace dans `updatedAt` : le delta ne peut pas le voir, donc l'instantané
      ressusciterait ce qu'on vient d'effacer. C'est le seul cas dangereux, et
      il est traité à la source.
   ========================================================================= */

export interface InstantaneJournal {
  /** Filigrane : `updatedAt` le plus récent pris en compte. */
  at: string;
  /** Index sérialisé — `{"habitId|date": valeur}`, entrées vivantes seulement. */
  entries: Record<string, number>;
}

export async function lireInstantane(): Promise<InstantaneJournal | null> {
  const brut = await metaRepo.get<InstantaneJournal>(META_KEYS.logSnapshot);
  /* Un instantané mal formé est un instantané qu'on jette : reconstruire coûte
     une ouverture lente, servir des chiffres faux coûte la confiance (G3). */
  if (!brut || typeof brut.at !== 'string' || typeof brut.entries !== 'object') return null;
  return brut;
}

export async function ecrireInstantane(index: LogIndex, at: string): Promise<void> {
  const entries: Record<string, number> = {};
  for (const [cle, valeur] of index) entries[cle] = valeur;
  await metaRepo.set(META_KEYS.logSnapshot, { at, entries } satisfies InstantaneJournal);
}

/** Oublie l'instantané. À appeler après toute suppression DURE de journal. */
export async function oublierInstantane(): Promise<void> {
  await metaRepo.remove(META_KEYS.logSnapshot);
}
