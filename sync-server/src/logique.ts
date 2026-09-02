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

/* --- Expiration des espaces abandonnés ------------------------------------

   POURQUOI UN ESPACE ENTIER, ET JAMAIS UNE LIGNE ISOLÉE.

   Effacer « les lignes de plus de six mois » paraît plus fin. C'est un piège :
   une habitude créée il y a deux ans et jamais modifiée depuis a un
   `updatedAt` ancien, alors qu'elle est parfaitement vivante. On l'effacerait,
   et le prochain appareil appairé ne la recevrait JAMAIS — une synchronisation
   incomplète, silencieuse, impossible à diagnostiquer depuis l'appareil.

   En raisonnant par espace, ce piège disparaît : un espace vivant garde tout,
   un espace abandonné part en entier.

   ET RIEN N'EST PERDU pour autant. Le relais est une boîte aux lettres, pas un
   coffre-fort : les données vivent sur les appareils. Un espace expiré qui
   redevient actif se remplit de lui-même à la synchronisation suivante — le
   filigrane local n'a pas bougé, mais un appareil qui repousse tout ce qu'il a
   reconstitue l'espace. */

/** Six mois. Assez long pour qu'un usage saisonnier — on décroche l'été, on
 *  reprend en septembre — ne soit jamais coupé ; assez court pour que le
 *  stockage d'un essai sans lendemain ne pèse pas éternellement. */
export const RETENTION_JOURS = 180;

const JOUR_MS = 86_400_000;

/** Horodatage en deçà duquel un espace est considéré comme abandonné. */
export function seuilExpiration(maintenant: number): number {
  return maintenant - RETENTION_JOURS * JOUR_MS;
}

/** Faut-il réécrire la date de dernier accès ?
 *
 *  Toute lecture prouve qu'un espace sert, et devrait donc le maintenir en
 *  vie. Mais écrire à CHAQUE lecture doublerait le nombre d'écritures du
 *  serveur — or c'est précisément le quota que cette fonctionnalité cherche à
 *  ménager. Une fois par jour suffit : la précision demandée est de six mois,
 *  pas de la seconde. */
export function doitRafraichir(toucheLe: number | undefined, maintenant: number): boolean {
  if (toucheLe === undefined) return true;
  return maintenant - toucheLe >= JOUR_MS;
}
