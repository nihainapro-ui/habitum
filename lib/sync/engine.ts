import { META_KEYS, metaRepo } from '@/lib/data';
import { chiffrer, dechiffrer, type Cles } from './crypto';
import { ecrire, lireDepuis, lireUne } from './entites';
import { distanteGagne } from './merge';
import type { Transport } from './transport';
import { SyncErreur, type SyncRow } from './types';

/* L'ORCHESTRATION, ET RIEN D'AUTRE. Toute la logique subtile est ailleurs :
   l'arbitrage dans `merge.ts` (pur), la traduction Dexie dans `entites.ts`, le
   réseau dans `transport.ts`. Ce fichier ne fait que l'enchaînement, et c'est
   pour cela qu'il tient en une page. */

const EPOQUE = '1970-01-01T00:00:00.000Z';

export interface Deps {
  transport: Transport;
  cles: Cles;
}

export interface Bilan {
  recus: number;
  envoyes: number;
}

/** Un aller-retour complet. Sans code d'appairage, ne fait RIEN et n'émet
 *  aucune requête — c'est ce qui garde la promesse intacte pour qui n'active
 *  pas la fonctionnalité. */
export async function synchroniser({ transport, cles }: Deps): Promise<Bilan> {
  const code = await metaRepo.get<string>(META_KEYS.syncCode);
  if (!code) return { recus: 0, envoyes: 0 };

  const { espace, cle } = cles;
  const curseur = (await metaRepo.get<number>(META_KEYS.syncCursor)) ?? 0;

  /* 1. TIRER. */
  const { seq, lignes } = await transport.tirer(espace, curseur);

  /* 2 & 3. ARBITRER puis ÉCRIRE. Les identifiants appliqués sont retenus : ils
     viennent d'arriver avec un `updatedAt` postérieur au filigrane, et seraient
     donc renvoyés au serveur au même tour — un aller-retour pour rien. */
  const appliques = new Set<string>();
  let recus = 0;

  for (const distante of lignes) {
    const locale = await lireUne(distante.kind, distante.id);

    /* À HORODATAGE ÉGAL, LA DISTANTE GAGNE — et c'est délibéré.
       Le client ne peut pas départager par le chiffré : le vecteur d'initialisation
       est aléatoire, deux chiffrements de la même valeur ne se ressemblent pas. Le
       départage appartient donc au serveur, seul à voir des chiffrés comparables
       (`sync-server/src/logique.ts`, miroir de `lib/sync/merge.ts`). En s'inclinant
       sur les égalités, les deux appareils adoptent la même version et convergent ;
       en gardant chacun la sienne, ils divergeraient pour toujours. */
    if (locale && distante.updatedAt < locale.updatedAt) continue;

    try {
      const valeur = await dechiffrer(cle, distante.blob);
      /* `distante.updatedAt` a voyagé AVEC ce chiffré — c'est le même horodatage
         que celui qui a produit `valeur`, pas une approximation. L'invariant
         « valeur.updatedAt === updatedAt passé » tient donc ici, mais il n'est
         garanti par rien d'autre que cet appel : à qui déplace cette ligne de
         l'écrire ailleurs. */
      await ecrire(distante.kind, distante.id, valeur, distante.updatedAt);
      appliques.add(`${distante.kind}|${distante.id}`);
      recus += 1;
    } catch (e) {
      /* Un blob illisible signifie un code différent : inutile d'insister,
         mais inutile aussi de perdre les autres lignes. */
      if (!(e instanceof SyncErreur)) throw e;
    }
  }

  /* 4. POUSSER ce qui a bougé localement depuis le filigrane. */
  const filigrane = (await metaRepo.get<string>(META_KEYS.syncWatermark)) ?? EPOQUE;
  const locales = (await lireDepuis(filigrane)).filter((l) => !appliques.has(`${l.kind}|${l.id}`));

  const aEnvoyer: SyncRow[] = [];
  for (const l of locales) {
    aEnvoyer.push({
      kind: l.kind,
      id: l.id,
      updatedAt: l.updatedAt,
      blob: await chiffrer(cle, l.valeur),
    });
  }

  const apres = aEnvoyer.length ? await transport.pousser(espace, aEnvoyer) : { seq };

  /* 5. MÉMORISER. Le filigrane est posé à MAINTENANT et non au plus grand
     `updatedAt` envoyé : une écriture faite pendant l'aller-retour porterait un
     horodatage antérieur et serait sautée pour toujours. */
  await metaRepo.set(META_KEYS.syncCursor, Math.max(seq, apres.seq));
  await metaRepo.set(META_KEYS.syncWatermark, new Date().toISOString());
  await metaRepo.set(META_KEYS.syncLastAt, new Date().toISOString());

  return { recus, envoyes: aEnvoyer.length };
}

/** Serveur en mémoire — POUR LES TESTS. Applique la même règle que le vrai,
 *  via `distanteGagne` : lui seul voit deux chiffrés comparables et peut
 *  départager une égalité d'horodatage. Il vit ici plutôt que dans les tests
 *  parce que deux fichiers de test au moins en ont besoin, et qu'une
 *  divergence entre deux copies passerait inaperçue. */
export function transportMemoire(): Transport {
  const lignes = new Map<string, SyncRow & { seq: number }>();
  let compteur = 0;

  return {
    async tirer(_espace, depuis) {
      const sorties = [...lignes.values()]
        .filter((l) => l.seq > depuis)
        .sort((a, b) => a.seq - b.seq);
      return {
        seq: sorties.length ? sorties[sorties.length - 1]!.seq : depuis,
        lignes: sorties.map(({ seq: _s, ...r }) => r),
      };
    },
    async pousser(_espace, entrantes) {
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
