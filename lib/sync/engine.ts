import { META_KEYS, metaRepo, oublierInstantane } from '@/lib/data';
import { chiffrer, dechiffrer, type Cles } from './crypto';
import { ecrire, lireDepuis, lireUne } from './entites';
import { distanteGagne } from './merge';
import type { Transport } from './transport';
import { PAGE_TIRAGE, SyncErreur, type SyncRow } from './types';

/* L'ORCHESTRATION, ET RIEN D'AUTRE. Toute la logique subtile est ailleurs :
   l'arbitrage dans `merge.ts` (pur), la traduction Dexie dans `entites.ts`, le
   réseau dans `transport.ts`. Ce fichier ne fait que l'enchaînement. */

const EPOQUE = '1970-01-01T00:00:00.000Z';

/** Lignes par envoi. Le relais en accepte 500 ; on reste nettement dessous
 *  pour qu'un lot perdu en route (métro, ascenseur) coûte peu à renvoyer. */
export const LOT_LIGNES = 200;

/** Taille visée d'un envoi, en caractères de chiffré. Le relais plafonne le
 *  corps à 4 Mo (`sync-server/src/logique.ts`) : un lot d'un million plus la
 *  plus grosse ligne admise tiennent dessous. */
export const LOT_CARACTERES = 1_000_000;

/** Au-delà, une ligne ne part pas. D1 refuse toute valeur de plus de 2 Mo, et
 *  un refus ferait échouer le lot ENTIER, à chaque passage, pour toujours.
 *  Mieux vaut une ligne écartée et COMPTÉE (`Bilan.ecartees`) qu'une
 *  synchronisation bloquée par une seule note démesurée. */
export const LIGNE_MAX_CARACTERES = 1_900_000;

export interface Deps {
  transport: Transport;
  cles: Cles;
}

export interface Bilan {
  recus: number;
  envoyes: number;
  /** Lignes trop grosses pour le relais, restées sur l'appareil. Zéro dans
   *  l'immense majorité des cas ; jamais passé sous silence sinon. */
  ecartees: number;
}

/** Même valeur ? Sert à reconnaître l'ÉCHO de nos propres envois : le relais
 *  nous les rend au tirage suivant, avec notre horodatage. Les réécrire serait
 *  sans effet sur la base, mais compterait comme une réception — et l'interface
 *  rechargerait tout l'état pour rien, à chaque passage. */
const memeValeur = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Un aller-retour complet. Sans code d'appairage, ne fait RIEN et n'émet
 *  aucune requête — c'est ce qui garde la promesse intacte pour qui n'active
 *  pas la fonctionnalité.
 *
 *  QUATRE DÉFAUTS CORRIGÉS LE 12 NOVEMBRE 2026, tous silencieux :
 *
 *  1. Le tirage s'arrêtait à la première page. Au-delà de 500 lignes en
 *     attente, le reste n'arrivait qu'aux passages suivants — et un appareil
 *     neuf affichait un historique tronqué en se disant synchronisé.
 *  2. L'envoi partait d'un bloc. Plus de 500 lignes locales — un premier
 *     appairage, un import — et le relais répondait 413, pour toujours.
 *  3. Le curseur avançait jusqu'au `seq` de NOTRE envoi. Tout ce qu'un autre
 *     appareil avait écrit entre notre tirage et notre envoi portait un `seq`
 *     inférieur, et n'était plus jamais redemandé.
 *  4. Le filigrane était posé à la FIN de l'aller-retour. Une saisie faite
 *     pendant l'envoi portait un horodatage antérieur, et n'était jamais
 *     envoyée. */
export async function synchroniser({ transport, cles }: Deps): Promise<Bilan> {
  const code = await metaRepo.get<string>(META_KEYS.syncCode);
  if (!code) return { recus: 0, envoyes: 0, ecartees: 0 };

  const { espace, cle } = cles;
  let curseur = (await metaRepo.get<number>(META_KEYS.syncCursor)) ?? 0;

  /* 1 à 3. TIRER page par page, ARBITRER, ÉCRIRE. Les identifiants appliqués
     sont retenus : ils viennent d'arriver avec un `updatedAt` qui peut être
     postérieur au filigrane, et seraient renvoyés au relais au même tour — un
     aller-retour pour rien. */
  const appliques = new Set<string>();
  let recus = 0;
  let journalRecu = false;

  for (;;) {
    const page = await transport.tirer(espace, curseur);

    /* L'ESPACE A ÉTÉ VIDÉ — effacé depuis un autre appareil, ou purgé après
       six mois de silence. Le relais repart de zéro ; notre curseur, lui,
       pointe des numéros qui n'existent plus, et nous ne recevrions plus rien
       avant que l'espace ne les ait dépassés. On repart donc de zéro aussi, et
       le filigrane tombe : tout ce que cet appareil détient est renvoyé. C'est
       ce qui fait d'un espace expiré un espace qui « se remplit de lui-même ». */
    if (page.tete !== undefined && page.tete < curseur) {
      curseur = 0;
      await metaRepo.set(META_KEYS.syncCursor, 0);
      await metaRepo.remove(META_KEYS.syncWatermark);
      continue;
    }

    for (const distante of page.lignes) {
      const locale = await lireUne(distante.kind, distante.id);

      /* À HORODATAGE ÉGAL, LA DISTANTE GAGNE — et c'est délibéré.
         Le client ne peut pas départager par le chiffré : le vecteur
         d'initialisation est aléatoire, deux chiffrements de la même valeur ne
         se ressemblent pas. Le départage appartient donc au serveur, seul à
         voir des chiffrés comparables (`sync-server/src/logique.ts`, miroir de
         `lib/sync/merge.ts`). En s'inclinant sur les égalités, les deux
         appareils adoptent la même version et convergent ; en gardant chacun
         la sienne, ils divergeraient pour toujours. */
      if (locale && distante.updatedAt < locale.updatedAt) continue;

      try {
        const valeur = await dechiffrer(cle, distante.blob);
        if (
          locale &&
          distante.updatedAt === locale.updatedAt &&
          memeValeur(valeur, locale.valeur)
        ) {
          continue;
        }
        /* `distante.updatedAt` a voyagé AVEC ce chiffré — c'est le même
           horodatage que celui qui a produit `valeur`, pas une approximation.
           L'invariant « valeur.updatedAt === updatedAt passé » tient donc ici,
           mais il n'est garanti par rien d'autre que cet appel : à qui déplace
           cette ligne de l'écrire ailleurs. */
        await ecrire(distante.kind, distante.id, valeur, distante.updatedAt);
        appliques.add(`${distante.kind}|${distante.id}`);
        if (distante.kind === 'logs') journalRecu = true;
        recus += 1;
      } catch (e) {
        /* Un blob illisible signifie un code différent : inutile d'insister,
           mais inutile aussi de perdre les autres lignes. */
        if (!(e instanceof SyncErreur)) throw e;
      }
    }

    /* Le curseur est mémorisé PAGE PAR PAGE : un premier tirage de vingt mille
       lignes coupé à la quinzième page reprend à la quinzième, pas à zéro. */
    const avance = page.seq > curseur;
    if (avance) {
      curseur = page.seq;
      await metaRepo.set(META_KEYS.syncCursor, curseur);
    }

    /* `encore` est dit par le relais ; un relais d'avant le 12 novembre ne le
       dit pas, et une page pleine vaut alors « il en reste peut-être ». Sans
       avancée, on s'arrête quoi qu'il dise : une boucle qui ne progresse pas
       ne doit pas tourner. */
    const encore = page.encore ?? page.lignes.length >= PAGE_TIRAGE;
    if (!encore || !avance) break;
  }

  /* UNE LIGNE DE JOURNAL REÇUE PÉRIME L'INSTANTANÉ D'OUVERTURE. Elle porte
     l'horodatage de l'appareil qui l'a saisie — parfois antérieur au filigrane
     de l'instantané —, et le delta d'ouverture (`updatedAt >= filigrane`) ne
     la verrait jamais : elle serait en base et absente de l'écran. */
  if (journalRecu) await oublierInstantane();

  /* 4. POUSSER ce qui a bougé localement depuis le filigrane.

     L'instant est relevé AVANT la lecture : ce qui s'écrit pendant l'envoi
     porte un horodatage postérieur, et sera relu au passage suivant. */
  const debut = new Date().toISOString();
  const filigrane = (await metaRepo.get<string>(META_KEYS.syncWatermark)) ?? EPOQUE;
  const locales = (await lireDepuis(filigrane)).filter((l) => !appliques.has(`${l.kind}|${l.id}`));

  let envoyes = 0;
  let ecartees = 0;
  let lot: SyncRow[] = [];
  let poids = 0;

  const partir = async (): Promise<void> => {
    if (!lot.length) return;
    await transport.pousser(espace, lot);
    envoyes += lot.length;
    lot = [];
    poids = 0;
  };

  /* Chiffré LOT PAR LOT, jamais d'un bloc : deux cent mille lignes de journal
     chiffrées d'avance tiendraient toutes en mémoire avant le premier envoi. */
  for (const l of locales) {
    const blob = await chiffrer(cle, l.valeur);
    if (blob.length > LIGNE_MAX_CARACTERES) {
      ecartees += 1;
      continue;
    }
    if (lot.length >= LOT_LIGNES || poids + blob.length > LOT_CARACTERES) await partir();
    lot.push({ kind: l.kind, id: l.id, updatedAt: l.updatedAt, blob });
    poids += blob.length;
  }
  await partir();

  /* 5. MÉMORISER — seulement si TOUT est parti. Un envoi coupé au troisième
     lot laisse le filigrane où il était : le passage suivant renvoie tout, et
     le relais écarte ce qu'il détient déjà.

     Le curseur, lui, ne bouge PAS avec l'envoi : il ne suit que ce qui a été
     TIRÉ. Nos propres lignes nous reviendront au prochain tirage, et
     `memeValeur` les reconnaîtra. */
  await metaRepo.set(META_KEYS.syncWatermark, debut);
  await metaRepo.set(META_KEYS.syncLastAt, new Date().toISOString());

  return { recus, envoyes, ecartees };
}

/** Serveur en mémoire — POUR LES TESTS. Applique la même règle que le vrai,
 *  via `distanteGagne` : lui seul voit deux chiffrés comparables et peut
 *  départager une égalité d'horodatage. Il vit ici plutôt que dans les tests
 *  parce que deux fichiers de test au moins en ont besoin, et qu'une
 *  divergence entre deux copies passerait inaperçue.
 *
 *  `page` et `maxLignes` reprennent les deux plafonds du vrai relais : sans
 *  eux, la doublure accepterait tout d'un bloc et les tests ne verraient
 *  jamais ni la pagination ni le 413. */
export function transportMemoire({
  page = PAGE_TIRAGE,
  maxLignes = 500,
}: { page?: number; maxLignes?: number } = {}): Transport {
  const lignes = new Map<string, SyncRow & { seq: number }>();
  let compteur = 0;

  return {
    async tirer(_espace, depuis) {
      const toutes = [...lignes.values()]
        .filter((l) => l.seq > depuis)
        .sort((a, b) => a.seq - b.seq);
      const sorties = toutes.slice(0, page);
      return {
        seq: sorties.length ? sorties[sorties.length - 1]!.seq : depuis,
        lignes: sorties.map(({ seq: _s, ...r }) => r),
        encore: toutes.length > sorties.length,
        ...(sorties.length ? {} : { tete: compteur }),
      };
    },
    async pousser(_espace, entrantes) {
      if (entrantes.length > maxLignes) throw new SyncErreur('serveur', 'HTTP 413');
      for (const e of entrantes) {
        const cle = `${e.kind}|${e.id}`;
        const stockee = lignes.get(cle);
        if (!distanteGagne(stockee, e)) continue;
        compteur += 1;
        lignes.set(cle, { ...e, seq: compteur });
      }
      return { seq: compteur };
    },
    async effacer() {
      /* Le compteur repart de zéro AVEC les lignes : c'est ce que fait le vrai
         serveur, où `seq` est calculé par `MAX(seq) + 1` sur une table vidée.
         Le laisser courir ici ferait diverger la doublure de l'original. */
      lignes.clear();
      compteur = 0;
    },
  };
}
