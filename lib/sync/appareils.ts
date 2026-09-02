import { ALPHABET } from './code';

/* Qui est appairé avec qui — la partie PURE.
 *
 * Rien ici ne touche Dexie ni le réseau : `entites.ts` reste la seule porte
 * vers la base, comme son en-tête le promet. Ce fichier ne sait que fabriquer
 * un identifiant, deviner une famille d'appareil, et dire ce qu'on affiche.
 *
 * POURQUOI CETTE FONCTIONNALITÉ EXISTE. « Dernière synchronisation : 15 h 22 »
 * s'affiche exactement pareil qu'un aller-retour ait tout échangé ou n'ait rien
 * trouvé. L'utilisateur qui vient d'appairer son téléphone n'a AUCUN moyen de
 * savoir si ça a marché — il doit aller vérifier ses habitudes une par une.
 * Une présence par appareil, et le compte de ce qui a transité, répondent à la
 * seule question qu'il se pose vraiment : « est-ce que les deux se parlent ? »
 *
 * CE QUE LE RELAIS EN APPREND : rien. Une présence est une ligne comme les
 * autres, chiffrée sur l'appareil avant de partir. Le serveur voit une ligne de
 * plus, pas un parc d'appareils. */

/** Préfixe des clés `meta` qui portent une présence. Une clé PAR APPAREIL —
 *  c'est ce qui évite que deux appareils s'écrasent l'un l'autre, puisque
 *  chacun n'écrit jamais que la sienne. */
export const PREFIXE_APPAREIL = 'sync.device.';

/** Familles d'appareil. Volontairement GROSSIÈRES : « téléphone » ou
 *  « ordinateur » suffit à se reconnaître, là où « Chrome 151 sur Windows 10 »
 *  serait un identifiant d'empreinte déguisé en confort. */
export type Famille = 'mobile' | 'bureau';

export interface Presence {
  /** Identifiant local, tiré au sort. Ne dit rien de l'appareil ni de son
   *  propriétaire — il ne sert qu'à distinguer deux lignes. */
  id: string;
  famille: Famille;
  /** Dernier échange connu, ISO. */
  at: string;
}

export const LONGUEUR_ID_APPAREIL = 10;

/** Un identifiant d'appareil, tiré au sort comme le code d'appairage et sur le
 *  même alphabet — un identifiant lu dans un journal reste alors lisible. Il
 *  n'est PAS un secret : il ne dérive aucune clé, et ne quitte l'appareil que
 *  chiffré avec le reste. */
export function engendrerIdAppareil(): string {
  const octets = crypto.getRandomValues(new Uint8Array(LONGUEUR_ID_APPAREIL));
  return Array.from(octets, (o) => ALPHABET[o % ALPHABET.length]).join('');
}

/** La famille de CET appareil.
 *
 *  `userAgentData.mobile` quand il existe — c'est la seule réponse que le
 *  navigateur donne franchement. Sinon un repli sur la chaîne d'agent, qui
 *  suffit pour un choix binaire. Se tromper n'a aucune conséquence : personne
 *  ne perd de données parce qu'un appareil s'est annoncé « bureau ». */
export function familleCourante(): Famille {
  const nav = globalThis.navigator as
    (Navigator & { userAgentData?: { mobile?: boolean } }) | undefined;
  if (!nav) return 'bureau';
  if (typeof nav.userAgentData?.mobile === 'boolean') {
    return nav.userAgentData.mobile ? 'mobile' : 'bureau';
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent ?? '') ? 'mobile' : 'bureau';
}

/** Vrai s'il faut réécrire sa propre présence.
 *
 *  Une présence rafraîchie à CHAQUE synchronisation ferait une ligne poussée à
 *  chaque aller-retour, pour une information dont la précision utile est
 *  l'heure, pas la seconde. Une fois par heure suffit — et c'est autant de
 *  requêtes épargnées au palier gratuit. */
export const PERIODE_PRESENCE_MS = 3_600_000;

export function doitAnnoncer(precedente: string | undefined, maintenant: number): boolean {
  if (!precedente) return true;
  const t = Date.parse(precedente);
  if (Number.isNaN(t)) return true;
  return maintenant - t >= PERIODE_PRESENCE_MS;
}

/** Trie les présences pour l'affichage : cet appareil d'abord — on se cherche
 *  soi-même en premier pour se repérer — puis les autres, du plus récemment vu
 *  au plus ancien. */
export function ordonner(presences: readonly Presence[], moi: string | null): Presence[] {
  return [...presences].sort((a, b) => {
    if (a.id === moi) return -1;
    if (b.id === moi) return 1;
    return b.at.localeCompare(a.at);
  });
}
