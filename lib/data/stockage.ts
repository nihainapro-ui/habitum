/* ============================================================================
   Protection du stockage local — 12 novembre 2026.

   LE PROBLÈME. Sans compte, IndexedDB EST la base de l'utilisateur. Or un
   navigateur tient par défaut ce stockage pour « au mieux » : quand le disque
   se remplit, il peut l'effacer sans prévenir, et Safari efface au bout de
   sept jours sans visite ce qu'un site non installé a écrit. Trois ans de
   suivi qui disparaissent ainsi ne reviennent pas — et rien, jusqu'ici, ne
   demandait au navigateur de les garder.

   CE QUE FAIT CE FICHIER, et rien de plus :
   - demander le stockage PERSISTANT (`navigator.storage.persist`) ;
   - dire où l'on en est, pour que les réglages l'affichent — des chiffres
     LUS au navigateur, jamais estimés ici (règle 3 du CLAUDE.md) ;
   - reconnaître un quota dépassé, pour qu'une écriture refusée se dise au
     lieu d'échouer en silence.

   Aucune de ces interfaces n'est garantie : chaque appel est gardé, et
   l'absence se dit `null` — « inconnu », jamais « non ».
   ========================================================================= */

export interface EtatStockage {
  /** Le navigateur s'est-il engagé à ne pas effacer ? `null` = il ne le dit pas. */
  persistant: boolean | null;
  /** Octets occupés par l'origine, selon le navigateur. */
  utilise: number | null;
  /** Octets que le navigateur dit accorder à l'origine. */
  quota: number | null;
}

const gestionnaire = (): StorageManager | null =>
  typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null;

export async function etatStockage(): Promise<EtatStockage> {
  const s = gestionnaire();
  if (!s) return { persistant: null, utilise: null, quota: null };

  const [persistant, estimation] = await Promise.all([
    s.persisted ? s.persisted().catch(() => null) : null,
    s.estimate ? s.estimate().catch(() => null) : null,
  ]);

  return {
    persistant,
    utilise: estimation?.usage ?? null,
    quota: estimation?.quota ?? null,
  };
}

/** Demande au navigateur de ne pas effacer la base. Idempotente : déjà
 *  accordée, elle ne redemande rien.
 *
 *  Chrome décide seul, sans rien afficher (site installé, fréquenté, ou
 *  autorisé à notifier) ; Firefox pose la question à l'utilisateur. D'où la
 *  règle d'appel, tenue par l'appelant : pas avant que le compte contienne
 *  quelque chose à protéger. */
export async function demanderPersistance(): Promise<boolean | null> {
  const s = gestionnaire();
  if (!s?.persist) return null;
  try {
    if (s.persisted && (await s.persisted())) return true;
    return await s.persist();
  } catch {
    return null;
  }
}

/** Cette erreur dit-elle « plus de place » ?
 *
 *  Dexie enveloppe l'erreur d'IndexedDB : une transaction avortée faute de
 *  place remonte en `AbortError`, la cause réelle rangée dans `inner`. On
 *  descend donc la chaîne — bornée, une erreur qui se contiendrait elle-même
 *  ne doit pas faire tourner l'écran de reprise. */
export function estQuotaDepasse(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e && typeof e === 'object'; i++) {
    const { name, inner, cause } = e as { name?: unknown; inner?: unknown; cause?: unknown };
    if (name === 'QuotaExceededError') return true;
    e = inner ?? cause;
  }
  return false;
}
