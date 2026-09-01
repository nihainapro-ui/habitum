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
