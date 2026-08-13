import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Objectifs » — 05-SPEC-VUES.md § 7, plan 5 tâche 5.7.
   Quatre objectifs de démonstration : semi-marathon (cumul, alimenté par
   « courir »), 24 livres (cumul manuel), club de lecture (jalons),
   moins de 12 écarts (réduction, alimentée par « alcool »). */

const ROUTE = '/app/goals';

test.describe('goals', () => {
  test('une carte par objectif, avec ses trois types', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    await expect(page.locator('[data-goal]')).toHaveCount(4);
    await expect(page.getByRole('article', { name: '24 livres en 2026' })).toContainText(
      'Cumulatif',
    );
    await expect(page.getByRole('article', { name: 'Lancer le club de lecture' })).toContainText(
      'Jalons',
    );
    await expect(
      page.getByRole('article', { name: 'Moins de 12 écarts sur 90 jours' }),
    ).toContainText('Réduction');
  });

  test('un objectif à jalons affiche son avancement en jalons', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    /* Deux jalons sur cinq sont faits → 40 %. */
    const carte = page.getByRole('article', { name: 'Lancer le club de lecture' });
    await expect(carte.getByTestId('progress')).toHaveText('2 / 5');
    await expect(carte.getByTestId('percent')).toHaveText('40 %');
    await expect(carte.getByText('Réserver la salle')).toBeVisible();
  });

  /* Le piège de la vue : `reduce` compte les ÉCHECS, et l'avancement est ce
     qu'il RESTE de l'enveloppe (`1 − échecs/plafond`). Sur les 90 derniers
     jours, « ne pas boire d'alcool » a été manquée 9 fois pour 12 écarts
     tolérés : il reste 25 % d'enveloppe. Une implémentation qui oublierait
     l'inversion afficherait 75 % — d'où l'égalité exacte, pas un encadrement. */
  test('un objectif de réduction ne s’affiche pas à l’envers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const carte = page.getByRole('article', { name: 'Moins de 12 écarts sur 90 jours' });
    await expect(carte.getByTestId('progress')).toHaveText('9 / 12 écarts');
    await expect(carte.getByTestId('percent')).toHaveText('25 %');
  });

  test('un objectif cumulatif annonce le rythme requis', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const carte = page.getByRole('article', { name: 'Semi-marathon en octobre' });
    await expect(carte.getByTestId('pace')).toContainText('/ jour');
    await expect(carte).toContainText('Alimenté par');
  });

  test('un objectif à jalons n’annonce aucun rythme', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const carte = page.getByRole('article', { name: 'Lancer le club de lecture' });
    await expect(carte.getByTestId('pace')).toHaveCount(0);
  });

  test('la courbe d’avancement est tracée', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await expect(page.getByRole('img', { name: /Courbe d’avancement/ }).first()).toBeVisible();
  });

  test('créer un objectif l’ajoute à la liste', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('button', { name: 'Nouvel objectif' }).first().click();
    await page.getByLabel('Intitulé').fill('Mille pompes');
    await page.getByLabel('Cible').fill('1000');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByRole('article', { name: 'Mille pompes' })).toBeVisible();
  });

  test('état vide : aucun objectif', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.locator('[data-goal]')).toHaveCount(0);
    await expect(page.getByText('Aucun objectif')).toBeVisible();
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
