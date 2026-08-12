import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Tâches » — 05-SPEC-VUES.md § 6, plan 5 tâche 5.5.
   Jeu de démonstration au mercredi 5 août 2026 : t1/t2/t3 aujourd'hui,
   t7 demain, t4 (+2) et t5 (+3) cette semaine, t6 (+5) dimanche 9 aussi,
   t8 (−1) fait. */

const ROUTE = '/app/tasks';

test.describe('tasks', () => {
  test('regroupe les tâches par échéance', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    /* t1 est faite : elle passe dans « terminé », t3 et t2 restent au jour. */
    await expect(
      page.getByRole('region', { name: "Aujourd'hui" }).locator('[data-task]'),
    ).toHaveCount(2);
    await expect(
      page.getByRole('region', { name: 'Jour suivant' }).locator('[data-task]'),
    ).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'terminé' }).locator('[data-task]')).toHaveCount(
      2,
    );
  });

  test('cocher une tâche la fait passer dans « terminé »', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const termine = page.getByRole('region', { name: 'terminé' }).locator('[data-task]');
    const avant = await termine.count();

    await page.getByRole('checkbox', { name: 'Cours de guitare' }).click();
    await expect(termine).toHaveCount(avant + 1);
  });

  test('les sous-tâches se cochent et le compteur suit', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    await expect(page.getByText('1/3')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Relire le rapport' }).click();
    await expect(page.getByText('2/3')).toBeVisible();
  });

  test('la priorité est écrite, pas seulement colorée', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const reunion = page.locator('[data-task]').filter({ hasText: 'Rendez-vous dentiste' });
    await expect(reunion).toContainText('Moyenne');
  });

  test('la liste de courses se coche et s’allonge', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const articles = page.locator('[data-shopping] > li');
    await expect(articles).toHaveCount(7);

    await page.getByLabel('Ajouter un article').fill('Café');
    await page.keyboard.press('Enter');
    await expect(articles).toHaveCount(8);

    await page.getByRole('checkbox', { name: 'Café' }).click();
    await expect(page.getByRole('checkbox', { name: 'Café' })).toBeChecked();
  });

  test('créer une tâche depuis l’éditeur la range dans le bon groupe', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('button', { name: 'Nouveau' }).first().click();
    await page.getByLabel('Nom', { exact: true }).fill('Appeler le comptable');
    await page.getByRole('tab', { name: 'Planning' }).click();
    await page.getByLabel('Échéance').fill('2026-08-06');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(
      page.getByRole('region', { name: 'Jour suivant' }).locator('[data-task]'),
    ).toHaveCount(1);
  });

  test('supprimer une tâche reste annulable', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const toutes = page.locator('[data-task]');
    const avant = await toutes.count();

    await page.getByRole('button', { name: /Plus d’actions : Cours de guitare/ }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await expect(toutes).toHaveCount(avant - 1);

    await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
    await expect(toutes).toHaveCount(avant);
  });

  test('état vide : aucune tâche', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.locator('[data-task]')).toHaveCount(0);
    await expect(page.getByText('Aucune tâche')).toBeVisible();
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
