import type { DBCoreMutateRequest } from 'dexie';
import { db } from './db';

/* ============================================================================
   Plusieurs onglets, une seule base — 12 novembre 2026.

   LE PROBLÈME. Chaque onglet garde en mémoire SA lecture de la base. Deux
   onglets ouverts : on coche une habitude dans l'un, l'autre affiche toujours
   l'ancien état — et, pire, ÉCRIT à partir de lui. Les occurrences des tâches
   récurrentes sont un seul objet réécrit en entier : cocher dans l'onglet
   resté en arrière efface ce que l'autre venait d'y ajouter.

   LA SOLUTION. Chaque écriture locale est ANNONCÉE aux autres onglets, qui
   relisent la base. Rien d'autre ne voyage : pas de donnée, pas de différence
   à appliquer — la base est la seule vérité, on dit seulement qu'elle a bougé.

   Le point d'écoute est la couche basse de Dexie (`DBCore`) : toute écriture y
   passe, quel que soit le dépôt ou la tranche qui l'a demandée. Brancher
   l'annonce dans chaque action aurait été l'oublier dans la suivante.
   ========================================================================= */

const CANAL = 'habitum-donnees';

/** Délai de regroupement. Un import écrit des dizaines de milliers de lignes :
 *  une annonce par ligne ferait relire la base autant de fois à côté. */
const REGROUPEMENT_MS = 300;

/** Clés de `meta` dont l'écriture ne regarde PAS les autres onglets : caches,
 *  compteurs et états propres à l'onglet ou à l'appareil. Liste d'EXCLUSION, à
 *  dessein — une clé neuve qu'on oublierait ici est annoncée pour rien, ce qui
 *  coûte une relecture ; oubliée d'une liste d'inclusion, elle laisserait un
 *  onglet périmé sans que rien ne le dise. */
const META_SILENCIEUSES = new Set([
  'timer',
  'errors',
  'logSnapshot',
  'seeded',
  'syncCursor',
  'syncWatermark',
  'syncLastAt',
]);

/** Cette écriture mérite-t-elle d'être annoncée ? Pure, pour être testée. */
export function ecritureAAnnoncer(table: string, cles: readonly unknown[] | null): boolean {
  if (table !== 'meta') return true;
  /* Pas de clés connues (effacement par plage, table vidée) : on annonce. */
  if (!cles) return true;
  return cles.some((c) => !META_SILENCIEUSES.has(String(c)));
}

const clesDe = (req: DBCoreMutateRequest): unknown[] | null => {
  if (req.type === 'delete') return req.keys;
  if (req.type === 'add' || req.type === 'put') {
    return req.values.map((v) => (v as { key?: unknown } | null)?.key);
  }
  return null;
};

let canal: BroadcastChannel | null = null;
let minuterie: ReturnType<typeof setTimeout> | null = null;

function annoncer(): void {
  if (!canal || minuterie) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    try {
      canal?.postMessage('ecrit');
    } catch {
      /* Canal fermé sous nos pieds (onglet en cours de fermeture) : il n'y a
         plus personne à prévenir depuis ici. */
    }
  }, REGROUPEMENT_MS);
}

/* L'ÉCOUTE DES ÉCRITURES SE POSE AU CHARGEMENT DU MODULE, pas au branchement.
   Dexie ne compose ses intergiciels qu'À L'OUVERTURE de la base : posé après,
   celui-ci serait enregistré et jamais appelé — sans erreur, sans rien (vu au
   premier essai : le test à deux onglets restait muet). Ce module est chargé
   avec `lib/data`, donc avant la première requête.

   Tant qu'aucun canal n'est ouvert — rendu serveur, tests unitaires, onglet
   pas encore prêt —, `annoncer` ne fait rien : l'écoute ne coûte qu'un test. */
db.use({
  stack: 'dbcore',
  name: 'annonce-aux-onglets',
  create: (bas) => ({
    ...bas,
    table(nom) {
      const t = bas.table(nom);
      return {
        ...t,
        /* `.then`, et surtout pas `async/await` : Dexie suit sa transaction à
           travers SES promesses. Une promesse native intercalée ici ferait
           perdre la transaction à tout ce qui s'écrit ensuite dans le même
           bloc — un import s'achèverait hors transaction. */
        mutate: (req) =>
          t.mutate(req).then((rendu) => {
            if (ecritureAAnnoncer(nom, clesDe(req))) annoncer();
            return rendu;
          }),
      };
    },
  }),
});

/* UNE NOUVELLE VERSION DU SCHÉMA S'OUVRE AILLEURS. Cet onglet tient la base
   ouverte dans l'ancienne version et BLOQUE la migration de l'autre ; une fois
   fermée, plus aucune lecture ni écriture n'aboutit ici. On recharge : la page
   revient avec le code et le schéma du jour. Rester ouvert serait garder un
   écran qui ne peut plus rien enregistrer, sans le dire. Dexie ferme déjà la
   base de lui-même ; il ne restait qu'à ne pas laisser l'écran derrière.

   `newVersion` nul désigne une SUPPRESSION de la base, pas une montée : c'est
   le geste des tests et de l'effacement complet, qui rechargent eux-mêmes. */
db.on('versionchange', (e) => {
  if (e.newVersion && typeof location !== 'undefined') location.reload();
});

/** Ouvre le canal et écoute les écritures des autres onglets.
 *
 *  `surEcritureAilleurs` est appelé quand un AUTRE onglet a écrit — jamais pour
 *  nos propres écritures : un `BroadcastChannel` ne se rend pas ses messages.
 *
 *  Rend la fonction qui débranche l'écoute. */
export function brancherOnglets(surEcritureAilleurs: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};

  canal ??= new BroadcastChannel(CANAL);

  const ecoute = (): void => surEcritureAilleurs();
  canal.addEventListener('message', ecoute);
  return () => canal?.removeEventListener('message', ecoute);
}
