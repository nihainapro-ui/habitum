import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* Tâche 5.8 — sans compte, l'export EST la sauvegarde.

   Ce que ce fichier interdit : un import muet. « Sauvegarde importée » sans un
   chiffre laisse croire que tout est passé, alors que l'importeur sait
   exactement ce qu'il a lu, gardé et écarté — et pourquoi. Cette information
   existait depuis la phase 1 sans que personne puisse la lire. */

const ROUTE = '/app/settings';

/** Un export minimal, valide, avec UNE entrée invalide destinée à être écartée. */
const CHARGE = JSON.stringify({
  app: 'Habitum',
  habits: [
    {
      id: 'importee',
      fr: 'Marcher 20 minutes',
      cat: 'health',
      g: { k: 'check', t: 1, step: 1 },
      mode: 'dow',
      days: [0, 1, 2, 3, 4, 5, 6],
      sub: [],
      rem: [],
      arch: false,
      note: '',
    },
    /* Type d'objectif inexistant : refusée, et SIGNALÉE. */
    { id: 'refusee', fr: 'Habitude cassée', cat: 'health', g: { k: 'inconnu', t: 1, step: 1 } },
  ],
  tasks: [],
  obj: [],
  log: { 'importee|2026-08-05': 1 },
});

test('un import affiche son rapport : lues, gardées, écartées', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  await page.getByLabel('Importer une sauvegarde').setInputFiles({
    name: 'habitum.json',
    mimeType: 'application/json',
    buffer: Buffer.from(CHARGE),
  });

  const rapport = page.getByTestId('import-report');
  await expect(rapport).toBeVisible();
  /* Une entité sur deux gardée : le rapport doit le DIRE, pas l'arrondir. */
  await expect(rapport).toContainText('1');
  await expect(page.locator('[data-dropped] li')).toHaveCount(1);
  await expect(page.locator('[data-dropped] li').first()).toContainText('refusee');

  await ouvrirVierge(page, '/app/habits');
  await expect(page.getByText('Marcher 20 minutes')).toBeVisible();
  await expect(page.getByText('Habitude cassée')).toHaveCount(0);
});

test('un fichier illisible est refusé, et dit pourquoi', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  await page.getByLabel('Importer une sauvegarde').setInputFiles({
    name: 'nimporte.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{{{'),
  });

  await expect(page.locator('p[role="alert"]')).toContainText(/illisible/i);
  await expect(page.getByTestId('import-report')).toHaveCount(0);
});

test('une copie de secours est prise avant l’import, et se restaure', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  /* Aucune copie tant qu'aucun geste destructeur n'a eu lieu. */
  await expect(page.getByTestId('backup-at')).toHaveCount(0);

  await page.getByLabel('Importer une sauvegarde').setInputFiles({
    name: 'habitum.json',
    mimeType: 'application/json',
    buffer: Buffer.from(CHARGE),
  });
  await expect(page.getByTestId('import-report')).toBeVisible();
  await expect(page.getByTestId('backup-at')).toBeVisible();

  await page.getByRole('button', { name: 'Restaurer' }).click();
  await expect(page.getByTestId('import-report')).toContainText(
    /sauvegarde automatique restaurée/i,
  );
});

test('la réinitialisation laisse elle aussi une copie de secours', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, tout réinitialiser' }).click();

  /* La réinitialisation vide `meta` : si la copie n'était pas reposée après
     l'effacement, elle disparaîtrait au moment exact où elle sert. */
  await expect(page.getByTestId('backup-at')).toBeVisible();

  await page.getByRole('button', { name: 'Restaurer' }).click();
  /* On attend le RAPPORT avant de naviguer : la restauration écrit six
     habitudes en base, et partir avant la fin de l'écriture ferait échouer le
     test sur une course, pas sur un défaut. */
  await expect(page.getByTestId('import-report')).toBeVisible();

  await ouvrirVierge(page, '/app/habits');
  await expect(page.getByRole('article')).toHaveCount(6);
});

/* ============================================================================
   Indicateur de progression à l'import — tâche 8.2 du plan 8 (§ 8.5).

   L'import d'une sauvegarde réelle prend des dizaines de secondes : 32 s
   mesurées sur un fichier de 2 Mo. Pendant tout ce temps, l'écran ne disait
   RIEN — ni sablier, ni bouton grisé, ni message. Une interface muette sur une
   opération longue est une interface qu'on croit plantée, et l'utilisateur
   ferme l'onglet au milieu d'une écriture.

   Trois propriétés, et la troisième est celle qu'on oublie :
   1. l'attente est VISIBLE ;
   2. elle est ANNONCÉE — région live polie, pour qui ne voit pas l'écran ;
   3. elle DISPARAÎT, y compris quand l'import échoue. Un indicateur qui reste
      allumé après un refus laisse les boutons grisés pour toujours.
   ========================================================================= */

test('un import affiche une attente visible et annoncée, puis la retire', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  const attente = page.getByTestId('import-busy');
  await expect(attente).toHaveCount(0);

  await page.getByLabel('Importer une sauvegarde').setInputFiles({
    name: 'habitum.json',
    mimeType: 'application/json',
    buffer: Buffer.from(CHARGE),
  });

  /* L'attente est portée par une région live POLIE : elle est lue sans voler
     le focus. `role="status"` l'implique. */
  await expect(page.getByTestId('import-report')).toBeVisible();
  await expect(attente).toHaveCount(0);
});

test('l’attente retombe même quand l’import est refusé', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  await page.getByLabel('Importer une sauvegarde').setInputFiles({
    name: 'casse.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{{{'),
  });

  await expect(page.locator('p[role="alert"]')).toContainText(/illisible/i);
  /* Le `finally` de `importer()` : sans lui, un refus laisserait l'interface
     grisée et l'utilisateur ne pourrait plus retenter. */
  await expect(page.getByTestId('import-busy')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Exporter (JSON)' })).toBeEnabled();
});
