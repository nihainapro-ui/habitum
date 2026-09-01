/* La règle d'arbitrage du serveur.
 *
 * Elle est IDENTIQUE à celle du client (`lib/sync/merge.ts`), et un test le
 * vérifie cas par cas. Le serveur ne fait pas confiance aux clients : sans ce
 * filtre, un appareil resté hors ligne une semaine écraserait au retour tout
 * ce qui a été fait entre-temps.
 *
 * Le serveur ne peut PAS lire les blobs. Il n'arbitre que sur des
 * horodatages qu'il ne comprend pas et une chaîne opaque. */

export interface Arbitrable {
  updatedAt: string;
  blob: string;
}

export function accepterLigne(stockee: Arbitrable | undefined, entrante: Arbitrable): boolean {
  if (!stockee) return true;
  if (entrante.updatedAt !== stockee.updatedAt) return entrante.updatedAt > stockee.updatedAt;
  return entrante.blob > stockee.blob;
}

/** Une ligne, une fois validée : les quatre champs que le serveur manipule,
 *  garantis présents et non vides. */
export interface LigneValidee {
  kind: string;
  id: string;
  updatedAt: string;
  blob: string;
}

/** Vrai si `brute` a la forme d'une ligne exploitable.
 *
 *  `brute` vient du corps JSON d'une requête : sa forme réelle est
 *  arbitraire — `null`, un nombre, un objet sans `kind`... Sans ce filtre,
 *  une ligne malformée lève au premier accès à `.kind` ou `.id` et fait
 *  sortir l'exception de `fetch`, ce qui perd les en-têtes CORS de la
 *  réponse. Elle doit être ignorée (`continue`), pas plantée dessus — comme
 *  n'importe quelle autre ligne invalide. */
export function ligneValide(brute: unknown): brute is LigneValidee {
  if (typeof brute !== 'object' || brute === null) return false;
  const b = brute as Record<string, unknown>;
  return (
    typeof b.kind === 'string' &&
    b.kind !== '' &&
    typeof b.id === 'string' &&
    b.id !== '' &&
    typeof b.updatedAt === 'string' &&
    b.updatedAt !== '' &&
    typeof b.blob === 'string' &&
    b.blob !== ''
  );
}
