import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Work » — spec du 2026-08-31.

   Work est NEUF : il n'a pas d'oracle dans les 62 valeurs de référence. Ces
   contrôles posent donc la recette. */

const ROUTE = '/app/work';

test.describe('work', () => {
  test('un compte vierge le dit, et propose de créer', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('Aucun projet')).toBeVisible();
  });

  test('créer un projet, y ajouter une étape, la faire avancer', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('button', { name: 'Nouveau projet' }).first().click();
    await page.getByRole('dialog').getByRole('textbox').first().fill('Déménagement');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(page.getByText('Déménagement')).toBeVisible();
    /* Un projet SANS étape affiche « 0 sur 0 », pas 100 % : c'est la règle 3
       du CLAUDE.md, et elle se vérifie à l'écran, pas seulement en unitaire. */
    await expect(page.getByText('0 sur 0')).toBeVisible();

    await page.getByRole('button', { name: 'Ouvrir Déménagement' }).click();
    await page.getByRole('button', { name: 'Nouvelle tâche' }).first().click();

    const boite = page.getByRole('dialog');
    await boite.getByRole('textbox').first().fill('Réserver le camion');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(page.getByText('Réserver le camion')).toBeVisible();
    /* Une étape neuve tombe dans « À faire » : le défaut du formulaire est
       aussi celui du modèle. */
    await expect(page.locator('[data-colonne="todo"] [data-ptask]')).toHaveCount(1);

    /* Le statut se change SUR LA LIGNE, sans passer par l'éditeur. */
    await page.getByRole('combobox', { name: /statut.*réserver le camion/i }).click();
    await page.getByRole('option', { name: 'Terminé' }).click();

    await expect(page.locator('[data-colonne="done"] [data-ptask]')).toHaveCount(1);
    await expect(page.locator('[data-colonne="todo"] [data-ptask]')).toHaveCount(0);
  });

  test('le jeu de démonstration montre un projet réel', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await expect(page.getByText('Refonte du site')).toBeVisible();

    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    /* Les TROIS colonnes existent toujours, même vides : une colonne absente
       ferait disparaître un statut sans bruit. */
    await expect(page.locator('[data-colonne]')).toHaveCount(3);
    await expect(page.locator('[data-ptask]')).toHaveCount(5);
  });

  test('une étape en retard se signale, une étape terminée non', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    /* Le jeu de démonstration pose une étape échue et non terminée, et deux
       étapes échues mais TERMINÉES. Seule la première compte. */
    await expect(page.getByText(/1 en retard/)).toBeVisible();
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ouvrirAvecDemo(page, ROUTE);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const graves = violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id} — ${v.nodes.length} nœud(s)`);
    expect(graves).toEqual([]);
  });
});
