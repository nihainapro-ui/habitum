/* L'ARBITRAGE, ET RIEN D'AUTRE.
 *
 * Ce fichier est PUR : pas de réseau, pas de base, pas de React, aucun import.
 * C'est délibéré — la convergence de deux appareils est la seule chose subtile
 * de toute la synchronisation, et elle doit pouvoir être prouvée par des tests
 * qui tournent en millisecondes.
 *
 * LA MÊME RÈGLE EST APPLIQUÉE PAR LE SERVEUR (`sync-server/src/logique.ts`).
 * Si l'une des deux change sans l'autre, un appareil poussera indéfiniment une
 * ligne que le serveur refuse. */

export interface Arbitrable {
  updatedAt: string;
  blob: string;
}

/** Vrai si la ligne distante doit remplacer la locale.
 *
 *  Les horodatages sont des chaînes ISO 8601 en UTC : la comparaison
 *  lexicographique EST la comparaison chronologique, sans passer par `Date`.
 *
 *  À égalité d'horodatage, le blob départage. Ce n'est pas arbitraire : les
 *  deux appareils comparent les deux mêmes chaînes et retiennent la même. Sans
 *  ce départage, chacun garderait sa version et la divergence serait
 *  permanente. */
export function distanteGagne(locale: Arbitrable | undefined, distante: Arbitrable): boolean {
  if (!locale) return true;
  if (distante.updatedAt !== locale.updatedAt) return distante.updatedAt > locale.updatedAt;
  return distante.blob > locale.blob;
}
