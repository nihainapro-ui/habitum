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
    GENRE.test(b.kind) &&
    typeof b.id === 'string' &&
    b.id !== '' &&
    b.id.length <= MAX_ID &&
    typeof b.updatedAt === 'string' &&
    HORODATAGE.test(b.updatedAt) &&
    b.updatedAt.length <= MAX_HORODATAGE &&
    typeof b.blob === 'string' &&
    b.blob !== '' &&
    b.blob.length <= MAX_BLOB
  );
}

/* --- Limites — 12 novembre 2026 --------------------------------------------

   Le relais n'authentifie personne : connaître un espace suffit, et en inventer
   un aussi. Jusqu'ici, rien ne bornait ce qu'on pouvait y déposer. Ces plafonds
   ne distinguent pas l'abus de l'usage — le serveur ne lit rien — ; ils sont
   posés LARGEMENT au-dessus de tout usage réel, et ferment ce qui restait
   ouvert sans fin.

   CE QU'ILS NE FERMENT PAS, et il faut le dire : la création d'espaces en
   masse. Chaque espace inventé est borné, leur nombre ne l'est pas. Le fermer
   demanderait de compter par adresse IP, que ce serveur s'interdit de
   regarder ; la purge des espaces muets (six mois) reste le seul remède. */

/** Lignes par requête, en lecture comme en écriture. */
export const MAX_LIGNES = 500;

/** Corps d'un envoi, en caractères. Le client vise un million par lot
 *  (`lib/sync/engine.ts`) ; quatre laissent passer le lot et sa plus grosse
 *  ligne. */
export const MAX_CORPS = 4_000_000;

/** Un chiffré. D1 refuse toute valeur de plus de 2 Mo : mieux vaut écarter la
 *  ligne ici que de laisser l'erreur SQL faire échouer le lot entier. Le
 *  client applique le même plafond avant d'envoyer. */
export const MAX_BLOB = 1_900_000;

/** Un identifiant. Le plus long que produit l'application — une entrée de
 *  journal, `uuid|date` — fait 47 caractères. */
export const MAX_ID = 256;

const MAX_HORODATAGE = 40;

/** Un genre : quelques lettres. Le serveur ne connaît pas la liste — elle
 *  appartient au produit — mais il sait à quoi un genre ne ressemble pas. */
const GENRE = /^[A-Za-z]{1,32}$/;

/** Le DÉBUT d'un horodatage ISO 8601. L'arbitrage compare ces chaînes
 *  lexicographiquement : une valeur quelconque (`"~"`) gagnerait tous les
 *  arbitrages à venir et figerait la ligne pour toujours. */
const HORODATAGE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Nombre d'écritures qu'un espace peut recevoir dans sa vie. `seq` les
 *  compte déjà, une par ligne acceptée : le relire coûte une ligne d'index,
 *  quand compter les lignes en coûterait autant qu'il y en a.
 *
 *  Deux millions : trois ans de journal pour deux cents habitudes en font
 *  219 000, et un usage quotidien quelques centaines par jour. Un espace qui
 *  l'atteint n'est pas un utilisateur. Effacer l'espace remet le compte à
 *  zéro — c'est la sortie, et elle appartient à qui connaît le code. */
export const MAX_ECRITURES = 2_000_000;

/** Requêtes par minute et par espace, quand le limiteur est branché
 *  (`wrangler.toml`). Un appareil en fait quelques-unes par ouverture ; un
 *  premier appairage de 219 000 lignes en fait 1 100, étalées par le
 *  chiffrement — d'où une limite large, qui n'arrête que ce qui martèle. */
export const REQUETES_PAR_MINUTE = 600;

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
