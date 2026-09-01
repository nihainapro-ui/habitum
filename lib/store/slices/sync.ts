import type { StateCreator } from 'zustand';
import { META_KEYS, metaRepo } from '@/lib/data';
import { logError } from '@/lib/logger';
import {
  codeValide,
  deriverCles,
  normaliserCode,
  SyncErreur,
  synchroniser,
  syncDisponible,
  transportHttp,
  urlSync,
  type Cles,
} from '@/lib/sync';
import { rechargerDonnees } from '../hydrate';
import type { AppState, SyncActions, SyncState } from '../types';

/* La tranche « synchronisation » : elle branche le moteur au produit, et ne
   décide rien que le moteur décide déjà.

   TROIS CHOIX QUI SE VOIENT ICI.

   1. **Les clés vivent dans un cache de module, pas dans l'état.** Les dériver
      coûte ~0,3 s (PBKDF2, 600 000 itérations) : les redériver à chaque
      aller-retour rendrait la synchronisation périodique visiblement coûteuse
      sur téléphone. Et `CryptoKey` n'a rien à faire dans un état par ailleurs
      sérialisable, recopié par chaque instantané d'annulation.

   2. **Après réception, on RECHARGE tout l'état.** Le moteur écrit directement
      dans Dexie, sous le store : rapiécer l'état entité par entité demanderait
      de rejouer ici l'arbitrage qui vient d'avoir lieu là-bas. Une écriture
      massive suivie d'une mise à jour partielle est exactement ce qui laisse
      une interface qui n'affiche plus ce que contient la base — c'est déjà la
      règle de `importJson` et de `resetAccount`.

   3. **Un échec ne fait jamais tomber l'application.** Il se range dans
      `echec`, et l'interface le traduit. Le genre est conservé tel quel :
      confondre « pas de réseau » et « mauvais code » ferait retaper un code
      pendant une panne Wi-Fi. */

/** Clés dérivées du code courant. Conservées hors de l'état — voir ci-dessus. */
let cache: { code: string; cles: Cles } | null = null;

async function clesPour(code: string): Promise<Cles> {
  if (cache?.code === code) return cache.cles;
  const cles = await deriverCles(code);
  cache = { code, cles };
  return cles;
}

export const syncInitial: SyncState = {
  /* Lu à la construction du store. La valeur est figée à la compilation côté
     navigateur : elle ne peut pas changer en cours de session. */
  disponible: syncDisponible(),
  actif: false,
  code: null,
  enCours: false,
  lastAt: null,
  echec: null,
};

export const createSyncSlice: StateCreator<AppState, [], [], SyncActions> = (set, get) => ({
  async chargerSync(): Promise<void> {
    const code = await metaRepo.get<string>(META_KEYS.syncCode);
    const lastAt = (await metaRepo.get<string>(META_KEYS.syncLastAt)) ?? null;
    set((s) => ({ sync: { ...s.sync, actif: Boolean(code), code: code ?? null, lastAt } }));
  },

  async activerSync(saisi: string): Promise<boolean> {
    /* La normalisation AVANT la validation : l'utilisateur colle un code avec
       ses tirets, ou tape « O » là où le code porte un zéro (`code.ts`).
       Refuser sa saisie pour cela seul serait une brimade. */
    const code = normaliserCode(saisi);
    if (!codeValide(code)) return false;

    await metaRepo.set(META_KEYS.syncCode, code);
    set((s) => ({ sync: { ...s.sync, actif: true, code, echec: null } }));
    await get().synchroniserMaintenant();
    return true;
  },

  async desactiverSync(effacerRelais = false): Promise<boolean> {
    const { sync } = get();

    /* L'EFFACEMENT PASSE AVANT L'OUBLI, et s'il échoue on n'oublie rien.
       Désappairer d'abord jetterait le code ; or c'est le code qui dérive
       l'espace à effacer. L'utilisateur se retrouverait déconnecté ET
       incapable de reprendre ses octets — exactement ce qu'il demandait à
       éviter. En cas d'échec on rend `false` en laissant tout en place : il
       peut réessayer, ou désappairer sans effacer en connaissance de cause. */
    if (effacerRelais && sync.code) {
      try {
        const cles = await clesPour(sync.code);
        await transportHttp(urlSync()).effacer(cles.espace);
      } catch (e) {
        const echec = e instanceof SyncErreur ? e.genre : 'serveur';
        if (!(e instanceof SyncErreur)) void logError('sync', e);
        set((s) => ({ sync: { ...s.sync, echec } }));
        return false;
      }
    }

    /* Les quatre clés partent ENSEMBLE. Garder le curseur d'un code oublié
       ferait manquer, au réappairage, tout ce qui a transité entre-temps : le
       serveur ne renverrait que ce qui suit un numéro sans rapport. */
    await metaRepo.remove(META_KEYS.syncCode);
    await metaRepo.remove(META_KEYS.syncCursor);
    await metaRepo.remove(META_KEYS.syncWatermark);
    await metaRepo.remove(META_KEYS.syncLastAt);
    cache = null;
    set((s) => ({
      sync: { ...s.sync, actif: false, code: null, lastAt: null, echec: null, enCours: false },
    }));
    return true;
  },

  async synchroniserMaintenant(): Promise<void> {
    const { sync } = get();
    /* Trois refus muets, et aucun n'est une erreur : pas de serveur configuré,
       pas de code, ou un aller-retour déjà en vol. Le dernier compte le plus —
       la synchronisation est déclenchée par plusieurs sources (montage, retour
       d'onglet, bouton), et deux passes concurrentes poseraient deux filigranes
       dont le second effacerait le premier. */
    if (!sync.disponible || !sync.actif || !sync.code || sync.enCours) return;

    set((s) => ({ sync: { ...s.sync, enCours: true } }));
    try {
      const cles = await clesPour(sync.code);
      const bilan = await synchroniser({ transport: transportHttp(urlSync()), cles });

      /* On ne recharge QUE si quelque chose est arrivé. Sans cette garde, une
         synchronisation périodique qui ne rapporte rien relirait toute la base
         à chaque passage — et ferait clignoter les listes pour rien. */
      const donnees = bilan.recus > 0 ? await rechargerDonnees() : null;
      const lastAt = (await metaRepo.get<string>(META_KEYS.syncLastAt)) ?? null;

      set((s) => ({
        ...(donnees ?? {}),
        sync: { ...s.sync, enCours: false, lastAt, echec: null },
      }));
    } catch (e) {
      /* `SyncErreur` porte un genre traduisible ; tout le reste est un vrai
         défaut, qui part au journal local pour être diagnosticable. */
      const echec = e instanceof SyncErreur ? e.genre : 'serveur';
      if (!(e instanceof SyncErreur)) void logError('sync', e);
      set((s) => ({ sync: { ...s.sync, enCours: false, echec } }));
    }
  },
});

/** Vide le cache de clés. RÉSERVÉ AUX TESTS : sans lui, un fichier de test qui
 *  change de code hériterait des clés du test précédent. */
export function _viderCacheCles(): void {
  cache = null;
}
