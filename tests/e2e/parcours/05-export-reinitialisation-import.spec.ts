import { expect, test, type Page } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo } from '../helpers/app';

/* ============================================================================
   PARCOURS 5 — Export → réinitialisation → import : aucune perte.

   Écrit EN PREMIER des huit, et ce n'est pas une convention de style : c'est
   le seul parcours qui a DÉJÀ échoué. Une liste blanche de types incomplète
   avait fait refuser quatre des six habitudes de notre propre export, et leur
   historique avec — sans un mot à l'écran. Le produit n'a pas de compte : cet
   aller-retour EST la sauvegarde. S'il perd une entité, il perd des données
   pour de bon.

   Ce que le parcours exige, et qui le distingue d'un test d'import :

   1. il part de l'ÉTAT AFFICHÉ, pas d'une charge fabriquée pour l'occasion —
      c'est notre propre export qui doit se relire ;
   2. il passe par les gestes réels : bouton d'export, téléchargement, champ de
      fichier, confirmation en deux temps ;
   3. il compare l'état d'APRÈS à l'état d'AVANT, à l'identique et non « à peu
      près » — noms, séries, records, taux, journal du jour ;
   4. il vérifie que la réinitialisation a réellement vidé quelque chose entre
      les deux, sans quoi le test passerait au vert sur une base intacte.
   ========================================================================= */

/** État observable d'une habitude, tel que la vue le montre. */
interface Ligne {
  nom: string;
  serie: string;
  record: string;
  taux: string;
}

/** Relève les cartes de `/app/habits` dans l'ordre d'affichage.
 *
 *  On lit ce que l'utilisateur voit — pas la base. Un aller-retour qui
 *  restituerait les lignes sans restituer les métriques serait une perte tout
 *  aussi réelle, et seule la vue la révèle. */
const releverHabitudes = async (page: Page): Promise<Ligne[]> => {
  const cartes = page.getByRole('article');
  await expect(cartes.first()).toBeVisible();
  return cartes.evaluateAll((noeuds) =>
    noeuds.map((n) => ({
      nom: n.getAttribute('aria-label') ?? '',
      serie: n.querySelector('[data-testid="streak"]')?.textContent ?? '',
      record: n.querySelector('[data-testid="best"]')?.textContent ?? '',
      taux: n.querySelector('[data-testid="pct30"]')?.textContent ?? '',
    })),
  );
};

test('export → réinitialisation → import : aucune perte', async ({ page }) => {
  /* Le jeu de démonstration AVEC ses 180 jours d'historique : sans passé, les
     séries valent toutes zéro et l'égalité d'après ne prouverait rien. */
  await ouvrirAvecDemo(page, '/app/habits', { historique: true });

  const avant = await releverHabitudes(page);
  expect(avant).toHaveLength(6);
  /* Garde-fou du garde-fou : si les séries étaient toutes vides, la comparaison
     finale serait satisfaite par n'importe quoi. */
  expect(avant.some((l) => l.serie !== '0')).toBe(true);

  await page.goto('/app/settings');
  await attendreHydratation(page);

  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter (JSON)' }).click(),
  ]);
  const fichier = await telechargement.path();
  expect(fichier, 'aucun fichier de sauvegarde produit').toBeTruthy();

  /* Réinitialisation, en deux temps — on ne détruit pas par accident. */
  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, tout réinitialiser' }).click();
  /* Le badge de démonstration disparaît quand l'état rechargé est en place :
     c'est le signal que les neuf tables ont fini d'être vidées. */
  await expect(page.getByTitle('Jeu de démonstration')).toHaveCount(0);

  await page.goto('/app/habits');
  await attendreHydratation(page);
  /* La base est RÉELLEMENT vide : sans ce contrôle, un import qui n'importe
     rien passerait au vert sur les données restées en place. */
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();

  await page.goto('/app/settings');
  await attendreHydratation(page);
  await page.getByLabel('Importer une sauvegarde').setInputFiles(fichier!);

  const rapport = page.getByTestId('import-report');
  await expect(rapport).toBeVisible();
  /* Aucun écarté : notre propre export doit se relire INTÉGRALEMENT. C'est le
     contrôle exact qui manquait le jour du défaut — l'importeur écartait
     quatre habitudes et l'interface disait « importé ». */
  await expect(page.locator('[data-dropped] li')).toHaveCount(0);

  /* Le rapport DIT ce qu'il a lu et ce qu'il a gardé. On exige l'ÉGALITÉ des
     deux, pas un nombre en dur : coder « 830 » ici ferait rougir le parcours à
     la première entrée ajoutée au jeu de démonstration, pour une raison qui
     n'aurait rien à voir avec une perte de données. */
  const compteurs = ((await rapport.innerText()).match(/(\d+)\s*\/\s*(\d+)/) ?? []).slice(1);
  expect(compteurs, 'le rapport n’affiche pas « gardées / lues »').toHaveLength(2);
  const [gardees, lues] = compteurs.map(Number) as [number, number];
  expect(lues).toBeGreaterThan(0);
  expect(gardees, `${gardees} entrées gardées sur ${lues} lues`).toBe(lues);

  await page.goto('/app/habits');
  await attendreHydratation(page);
  const apres = await releverHabitudes(page);

  /* Identique, pas « proche ». */
  expect(apres).toEqual(avant);
});

test('l’aller-retour conserve les tâches, les objectifs et les sessions', async ({ page }) => {
  /* L'export du prototype oubliait les habitudes archivées, les objectifs, les
     sessions et la liste de courses. Un parcours qui ne regarderait que les
     habitudes ne verrait pas revenir ce trou-là. */
  await ouvrirAvecDemo(page, '/app/settings', { historique: true });

  const compter = async (route: string, selecteur: string): Promise<number> => {
    await page.goto(route);
    await attendreHydratation(page);
    return page.locator(selecteur).count();
  };

  const avant = {
    taches: await compter('/app/tasks', '[data-task]'),
    objectifs: await compter('/app/goals', '[data-goal]'),
    sessions: await compter('/app/timer', '[data-sessions] li'),
  };
  expect(avant.taches).toBeGreaterThan(0);
  expect(avant.objectifs).toBeGreaterThan(0);
  expect(avant.sessions).toBeGreaterThan(0);

  await page.goto('/app/settings');
  await attendreHydratation(page);
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter (JSON)' }).click(),
  ]);
  const fichier = await telechargement.path();

  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, tout réinitialiser' }).click();
  await expect(page.getByTitle('Jeu de démonstration')).toHaveCount(0);

  await page.getByLabel('Importer une sauvegarde').setInputFiles(fichier!);
  await expect(page.getByTestId('import-report')).toBeVisible();

  expect({
    taches: await compter('/app/tasks', '[data-task]'),
    objectifs: await compter('/app/goals', '[data-goal]'),
    sessions: await compter('/app/timer', '[data-sessions] li'),
  }).toEqual(avant);
});
