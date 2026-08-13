import { META_KEYS, metaRepo } from '@/lib/data';

/* ============================================================================
   Journal d'erreurs — LOCAL, et rien d'autre.

   Décision E du programme : aucune télémétrie. Ce journal n'ouvre pas de
   connexion, ne construit pas de charge utile, n'a pas de destinataire. Il
   écrit les dernières erreurs dans la table `meta`, où l'utilisateur peut les
   lire depuis les réglages, et où elles partent avec l'export.

   Pourquoi il existe quand même : un écran de reprise sans trace laisse le
   repreneur — utilisateur ou développeur — devant « ça a planté » sans un mot
   de plus. Une erreur qu'on ne peut pas décrire est une erreur qu'on ne peut
   pas corriger.

   Deux garde-fous :

   1. **Il n'échoue jamais.** Journaliser une erreur en levant une erreur ferait
      tomber l'écran de reprise lui-même. Tout est enveloppé.
   2. **Il est borné.** Vingt entrées, les plus récentes d'abord. Un journal qui
      grossit sans limite finit par remplir le quota de stockage — c'est-à-dire
      par causer la panne qu'il est censé documenter.
   ========================================================================= */

export interface ErreurJournalisee {
  /** Horodatage ISO. */
  at: string;
  /** Où l'erreur a été attrapée : `render`, `global`, `hydrate`… */
  where: string;
  message: string;
  /** Empreinte Next.js du rendu serveur, quand il y en a une. */
  digest?: string;
  stack?: string;
}

/** Nombre d'entrées conservées. Au-delà, les plus anciennes tombent. */
export const MAX_ERREURS = 20;

/** Longueur maximale d'une pile conservée. Une pile de production est courte ;
 *  une pile de développement peut faire plusieurs kilo-octets et n'apporte rien
 *  de plus après les premières lignes. */
const MAX_PILE = 2000;

/* Repli mémoire : si la base est justement ce qui est cassé, l'écran de reprise
   doit tout de même pouvoir montrer ce qu'il vient d'attraper. */
let enMemoire: ErreurJournalisee[] = [];

const normaliser = (where: string, err: unknown): ErreurJournalisee => {
  const e = err instanceof Error ? err : undefined;
  return {
    at: new Date().toISOString(),
    where,
    message: e?.message ?? String(err),
    ...(e && 'digest' in e && typeof e.digest === 'string' ? { digest: e.digest } : {}),
    ...(e?.stack ? { stack: e.stack.slice(0, MAX_PILE) } : {}),
  };
};

/** Enregistre une erreur. Ne lève jamais, n'envoie rien. */
export async function logError(where: string, err: unknown): Promise<void> {
  const entree = normaliser(where, err);
  enMemoire = [entree, ...enMemoire].slice(0, MAX_ERREURS);

  try {
    const precedentes = (await metaRepo.get<ErreurJournalisee[]>(META_KEYS.errors)) ?? [];
    await metaRepo.set(META_KEYS.errors, [entree, ...precedentes].slice(0, MAX_ERREURS));
  } catch {
    /* La base est indisponible — c'est précisément un cas où l'on ne veut pas
       d'une seconde erreur. Le repli mémoire a déjà l'entrée. */
  }
}

/** Les dernières erreurs, les plus récentes d'abord. */
export async function readErrorLog(): Promise<ErreurJournalisee[]> {
  try {
    return (await metaRepo.get<ErreurJournalisee[]>(META_KEYS.errors)) ?? enMemoire;
  } catch {
    return enMemoire;
  }
}

/** Vide le journal — geste explicite depuis les réglages. */
export async function clearErrorLog(): Promise<void> {
  enMemoire = [];
  try {
    await metaRepo.remove(META_KEYS.errors);
  } catch {
    /* Rien à faire de plus : le journal mémoire est déjà vide. */
  }
}
