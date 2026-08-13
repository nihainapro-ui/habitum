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
  await ouvrirVierge(page, '/app/habits');
  await expect(page.getByRole('article')).toHaveCount(6);
});
