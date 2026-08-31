import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { HABIT_GOAL_KINDS } from '@/lib/domain';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* Éditeurs d'habitude et de tâche — 05-SPEC-VUES.md § 5, plan 5 tâche 5.4. */

const ROUTE = '/app/habits';

test.describe('éditeur', () => {
  /* G8 — le piège déjà payé : une liste blanche incomplète fait disparaître des
     entités. Ici elle empêcherait simplement de créer trois types sur sept,
     ce qui est la même erreur vue de l'autre bout. */
  test('le sélecteur de type propose les SEPT types', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();

    /* Le menu n'est plus un `<select>` natif : ses options n'existent dans le
       document QUE lorsqu'il est ouvert, et elles vivent dans un portail
       ancré au `body`. On l'ouvre donc, et on compte les `role=option`. */
    await page.getByRole('combobox', { name: 'Type d’objectif' }).click();
    const options = await page
      .getByRole('listbox', { name: 'Type d’objectif' })
      .getByRole('option')
      .count();
    expect(options).toBe(HABIT_GOAL_KINDS.length);
  });

  test('créer une habitude l’ajoute au catalogue', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();

    await page.getByLabel('Nom', { exact: true }).fill('Étirements du matin');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByRole('article', { name: 'Étirements du matin' })).toBeVisible();
  });

  test('fermer sans enregistrer ne modifie rien', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const avant = await page.getByRole('article').count();

    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();
    await page.getByLabel('Nom', { exact: true }).fill('Brouillon jeté');
    await page.keyboard.press('Escape');

    await expect(page.getByRole('article')).toHaveCount(avant);
    await expect(page.getByText('Brouillon jeté')).toHaveCount(0);
  });

  test('un formulaire invalide affiche une erreur et n’enregistre pas', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Un nom est nécessaire.')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
  });

  test('une habitude « jours précis » sans jour est refusée', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();
    await page.getByLabel('Nom', { exact: true }).fill('Sans jour');

    await page.getByRole('tab', { name: 'Planning' }).click();
    for (const jour of await page.getByRole('checkbox').all()) {
      if (await jour.getAttribute('aria-checked')) await jour.click();
    }
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Choisissez au moins un jour.')).toBeVisible();
  });

  test('modifier une habitude existante enregistre le nouveau nom', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    await page.getByRole('button', { name: 'Méditer', exact: true }).click();
    await page.getByLabel('Nom', { exact: true }).fill('Méditation guidée');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByRole('article', { name: 'Méditation guidée' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Méditer', exact: true })).toHaveCount(0);
  });

  test('la suppression demande confirmation, puis reste annulable', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const avant = await page.getByRole('article').count();

    await page.getByRole('button', { name: 'Méditer', exact: true }).click();
    await page.getByRole('tab', { name: 'Avancé' }).click();
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.getByRole('button', { name: 'Oui, supprimer' }).click();

    await expect(page.getByRole('article')).toHaveCount(avant - 1);
    await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByRole('article')).toHaveCount(avant);
  });

  test('les quatre onglets de l’habitude sont présents', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();

    for (const onglet of ['Définition', 'Planning', 'Rappels', 'Avancé']) {
      await expect(page.getByRole('tab', { name: onglet })).toBeVisible();
    }
  });

  test('une habitude de type liste exige au moins un sous-élément', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();

    await page.getByLabel('Nom', { exact: true }).fill('Routine du soir');
    /* Plus de `<select>` natif, donc plus de `selectOption` : on ouvre le menu
       et on vise l'option par sa VALEUR, pas par son libellé traduit. */
    await page.getByRole('combobox', { name: 'Type d’objectif' }).click();
    await page.locator('[role="option"][data-value="list"]').click();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Ajoutez au moins un sous-élément.')).toBeVisible();

    await page.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await page.getByLabel('Sous-tâches 1').fill('Ranger le bureau');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByRole('article', { name: 'Routine du soir' })).toBeVisible();
  });

  test('accessible', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
