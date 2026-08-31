import { expect, type Page } from '@playwright/test';
import { DB_NAME } from '@/lib/storage/keys';
import { PERIODE_BATTEMENT_MS } from '@/lib/domain';
import type { LogEntry } from '@/lib/domain';
import {
  DEMO_NOW,
  demoGoals,
  demoHabits,
  demoLogIndex,
  demoSessions,
  demoProjects,
  demoProjectTasks,
  demoShopping,
  demoTasks,
} from '@/tests/fixtures/demo-seed';

/* ============================================================================
   Outillage commun aux tests de vues.

   Deux problèmes à résoudre avant de pouvoir comparer une vue au prototype :

   1. **La date.** Les 62 valeurs de référence sont datées du 5 août 2026. Une
      vue qui affiche « série : 8 » ne le fera qu'à cette date-là. On fige
      l'horloge du navigateur — `setFixedTime` n'agit que sur `Date`, pas sur
      les minuteries : Dexie, React et Next continuent de fonctionner
      normalement.

   2. **L'historique.** `seedDemo()` de production n'écrit AUCUN passé, et c'est
      délibéré (B4, G3) : un utilisateur qui reçoit 180 jours d'historique
      fabriqué ne fait plus confiance à un chiffre du produit. L'historique de
      démonstration n'existe donc que dans `tests/fixtures/demo-seed.ts`, et on
      l'écrit ici DIRECTEMENT en base, sans passer par le code de production.
      C'est la seule façon d'avoir les deux à la fois : un produit honnête et
      un test qui compare des chiffres à l'oracle.
   ========================================================================= */

/** 5 août 2026, 09 h heure de Paris — `golden.json._meta.fixedDate`.
 *  Le fuseau est imposé par `playwright.config.ts` : sans lui, la date-clé
 *  locale changerait de jour d'une machine à l'autre. */
export const DATE_FIGEE = new Date('2026-08-05T07:00:00.000Z');

/** Date-clé du jour figé, telle que la calcule `dateKey()`. */
export const JOUR_FIGE = '2026-08-05';

/* Pages dont l'horloge est INSTALLÉE (`clock.install` + `pauseAt`), par
   opposition à `setFixedTime` qui ne remplace que la date. Seules les
   premières suspendent `requestAnimationFrame` — et c'est ce qui rend la
   frame ci-dessous nécessaire. */
const horlogesPilotables = new WeakSet<Page>();

/** Laisse passer UNE frame d'animation, si l'horloge de la page est pilotée.
 *
 *  POURQUOI CETTE FONCTION EXISTE, en entier — elle a coûté une demi-journée.
 *
 *  React sert la coque puis, quand celle-ci est assez grande, DIFFÈRE le
 *  contenu de la vue dans un `<div hidden id="S:0">` qu'un script inline
 *  vient replacer. Depuis React 19, ce replacement n'est pas immédiat : il est
 *  mis en file et exécuté au prochain `requestAnimationFrame` (`$RT`).
 *
 *  `clock.install()` + `pauseAt()` remplacent `requestAnimationFrame` par une
 *  version qui n'avance qu'à la demande. La frame n'arrive donc JAMAIS, le
 *  bloc différé reste dans le document, et la vue existe en DEUX exemplaires :
 *  celui que React a rendu côté client, et l'orphelin masqué. Tout localisateur
 *  en mode strict échoue alors sur « resolved to 2 elements » — un échec qui
 *  ne décrit rien du produit, puisqu'un vrai navigateur rend cette frame en
 *  quelques millisecondes. Vérifié : hors horloge figée, l'élément est unique.
 *
 *  ON AVANCE D'UN BATTEMENT ENTIER, pas de 16 ms. Une frame de 16 ms suffirait
 *  à débloquer `$RT`, mais elle DÉPHASERAIT le minuteur : son battement est
 *  posé au montage, alors que `startedAt` est pris au clic. Décaler le second
 *  de 16 ms sans décaler le premier fait lire 4 secondes là où le test en
 *  attend 5 — mesuré. Un multiple de la période laisse les deux alignés. */
const laisserPasserUneFrame = async (page: Page): Promise<void> => {
  if (horlogesPilotables.has(page)) await page.clock.runFor(PERIODE_BATTEMENT_MS);
};

/** Attend que la coque ait amorcé la base et hydraté le store. */
export const attendreHydratation = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
  await laisserPasserUneFrame(page);
};

/** Ouvre une route et attend que l'application réponde. */
export const ouvrir = async (page: Page, route: string): Promise<void> => {
  await page.goto(route);
  await attendreHydratation(page);
};

/** Écrit des lignes dans la base Dexie déjà créée par l'application.
 *  On passe par l'API IndexedDB brute : importer Dexie dans le contexte de la
 *  page demanderait de l'y injecter, alors que les magasins existent déjà. */
export async function ecrireEnBase(page: Page, tables: Record<string, unknown[]>): Promise<void> {
  await page.evaluate(
    ([nom, charge]) => {
      const donnees = charge as Record<string, unknown[]>;
      return new Promise<void>((resoudre, rejeter) => {
        const demande = indexedDB.open(nom as string);
        demande.onerror = () => rejeter(demande.error);
        demande.onsuccess = () => {
          const base = demande.result;
          const magasins = Object.keys(donnees);
          const tx = base.transaction(magasins, 'readwrite');
          tx.oncomplete = () => {
            base.close();
            resoudre();
          };
          tx.onerror = () => rejeter(tx.error);
          for (const magasin of magasins) {
            const store = tx.objectStore(magasin);
            for (const ligne of donnees[magasin] ?? []) store.put(ligne);
          }
        };
      });
    },
    [DB_NAME, tables] as const,
  );
}

/** Lignes de journal du jeu de démonstration.
 *
 *  Sans `historique`, seules les QUATRE entrées du jour sont écrites — celles
 *  que `seedDemo()` pose en production. L'historique de 180 jours ne sert qu'à
 *  comparer les vues aux 62 valeurs de référence. */
const lignesJournal = (historique: boolean): LogEntry[] =>
  [...demoLogIndex()]
    .map(([cle, value]) => {
      const i = cle.indexOf('|');
      return {
        habitId: cle.slice(0, i),
        date: cle.slice(i + 1),
        value,
        updatedAt: DEMO_NOW.toISOString(),
      };
    })
    .filter((l) => historique || l.date === JOUR_FIGE);

export interface OptionsSemis {
  /** Écrire les 180 jours d'historique de `materialize()`. Nécessaire dès
   *  qu'une vue affiche une série, un record ou un taux. */
  historique?: boolean;
  /** Horloge PILOTABLE au lieu de figée.
   *
   *  `setFixedTime` épingle `Date.now()` : le temps ne s'écoule plus du tout,
   *  et `clock.runFor()` n'a aucun effet. C'est ce qu'il faut à dix vues sur
   *  onze, et exactement ce qu'il ne faut pas au minuteur, dont on veut
   *  éprouver le passage du temps. `install` part de la même date mais laisse
   *  le test avancer l'horloge à la demande. */
  horlogePilotable?: boolean;
}

/** Pose l'horloge du navigateur avant toute navigation.
 *
 *  En mode pilotable, `install` seul ne suffit pas : l'horloge simulée
 *  CONTINUE d'avancer avec le temps réel, et une valeur lue après `runFor`
 *  n'est déjà plus la même à l'assertion suivante — le test devient une course
 *  perdue sous charge. `pauseAt` la fige : elle n'avance plus que sur ordre. */
const poserHorloge = async (page: Page, pilotable: boolean): Promise<void> => {
  if (!pilotable) {
    await page.clock.setFixedTime(DATE_FIGEE);
    return;
  }
  await page.clock.install({ time: DATE_FIGEE });
  await page.clock.pauseAt(DATE_FIGEE);
  horlogesPilotables.add(page);
};

/** Lignes `meta` d'un compte DÉJÀ accueilli.
 *
 *  Depuis la tâche 5.5, une base sans `onboarded` renvoie au parcours
 *  d'accueil : c'est la règle B4, et elle vaut aussi en recette. Les tests de
 *  vue ne parlent pas de la première ouverture — ils partent d'un compte
 *  installé. Ceux qui éprouvent l'accueil lui-même ne passent pas par ces
 *  helpers, et c'est précisément ce qui les rend probants. */
const metaInstalle = (demo: boolean) => [
  { key: 'onboarded', value: true, updatedAt: DEMO_NOW.toISOString() },
  ...(demo ? [{ key: 'demo', value: true, updatedAt: DEMO_NOW.toISOString() }] : []),
];

/** Crée la base et marque le compte comme ACCUEILLI, sans rien ouvrir d'autre.
 *
 *  À appeler en `beforeEach` par les fichiers qui naviguent eux-mêmes : depuis
 *  la tâche 5.5, une base sans `onboarded` renvoie au parcours d'accueil. */
export async function installer(page: Page): Promise<void> {
  await ouvrir(page, '/onboarding');
  await ecrireEnBase(page, { meta: metaInstalle(false) });
}

/** Ouvre `route` avec le jeu de démonstration en base et l'horloge figée.
 *
 *  Deux passages sont nécessaires : le premier laisse l'application créer la
 *  base et poser le profil, le second relit ce qu'on vient d'y écrire. */
export async function ouvrirAvecDemo(
  page: Page,
  route: string,
  options: OptionsSemis = {},
): Promise<void> {
  await poserHorloge(page, options.horlogePilotable === true);
  /* Premier passage par l'ACCUEIL et non par `/app` : la base s'y crée de la
     même façon, sans qu'un renvoi ne s'exécute pendant qu'on écrit dedans. */
  await ouvrir(page, '/onboarding');

  await ecrireEnBase(page, {
    habits: demoHabits(),
    tasks: demoTasks(),
    goals: demoGoals(),
    sessions: demoSessions(),
    shopping: demoShopping(),
    projects: demoProjects(),
    projectTasks: demoProjectTasks(),
    meta: metaInstalle(true),
    logs: lignesJournal(options.historique === true),
  });

  await ouvrir(page, route);
}

/** Ouvre `route` sur un compte vierge, horloge figée. L'état vide d'une vue est
 *  un livrable au même titre que son état plein (D1, tâche 5.1).
 *
 *  Vierge, mais INSTALLÉ : la base est créée au premier passage, marquée
 *  accueillie, puis relue. Sans ce détour, chaque test de vue atterrirait sur
 *  le parcours d'accueil. */
export async function ouvrirVierge(
  page: Page,
  route: string,
  options: OptionsSemis = {},
): Promise<void> {
  await poserHorloge(page, options.horlogePilotable === true);
  await installer(page);
  await ouvrir(page, route);
}

/** Largeurs de recette. `1060` est le palier du prototype, pas `1024`. */
export const LARGEURS = [390, 768, 1060, 1440] as const;

/** Vérifie qu'aucun débordement horizontal n'apparaît aux quatre paliers. */
export async function verifierPaliers(page: Page, route: string): Promise<void> {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForTimeout(50);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde, `débordement horizontal à ${largeur} px sur ${route}`).toBe(false);
  }
}

/** L'origine RÉELLEMENT testée, locale ou production.
 *
 *  Ces contrôles codaient `localhost` en dur. `playwright.config.ts` annonce
 *  pourtant `BASE_URL` comme le moyen d'exécuter en production les quatre
 *  vérifications du plan 8 § 8.9 qui demandent un navigateur — dont « aucune
 *  requête tierce ». Pointé sur `https://habitum-one.vercel.app`, le contrôle
 *  déclarait TIERCES les propres ressources du site et rougissait sur six
 *  tests. Le contrôle censé prouver la promesse produit était donc le seul
 *  qu'on ne pouvait pas passer là où elle engage.
 *
 *  Trouvé le 25 août 2026, au premier usage réel de `BASE_URL`. */
export function estMemeOrigine(url: URL, baseURL: string | undefined): boolean {
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
  if (baseURL === undefined) return false;
  return url.origin === new URL(baseURL).origin;
}
