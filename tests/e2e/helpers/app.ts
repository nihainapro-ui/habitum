import { expect, type Page } from '@playwright/test';
import { DB_NAME } from '@/lib/storage/keys';
import type { LogEntry } from '@/lib/domain';
import {
  DEMO_NOW,
  demoGoals,
  demoHabits,
  demoLogIndex,
  demoSessions,
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

/** Attend que la coque ait amorcé la base et hydraté le store. */
export const attendreHydratation = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
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

/** Pose l'horloge du navigateur avant toute navigation. */
const poserHorloge = async (page: Page, pilotable: boolean): Promise<void> => {
  if (pilotable) await page.clock.install({ time: DATE_FIGEE });
  else await page.clock.setFixedTime(DATE_FIGEE);
};

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
  await ouvrir(page, '/app');

  await ecrireEnBase(page, {
    habits: demoHabits(),
    tasks: demoTasks(),
    goals: demoGoals(),
    sessions: demoSessions(),
    shopping: demoShopping(),
    meta: [{ key: 'demo', value: true, updatedAt: DEMO_NOW.toISOString() }],
    logs: lignesJournal(options.historique === true),
  });

  await ouvrir(page, route);
}

/** Ouvre `route` sur un compte vierge, horloge figée. L'état vide d'une vue est
 *  un livrable au même titre que son état plein (D1, tâche 6.1). */
export async function ouvrirVierge(
  page: Page,
  route: string,
  options: OptionsSemis = {},
): Promise<void> {
  await poserHorloge(page, options.horlogePilotable === true);
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
