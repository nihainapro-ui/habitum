import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Notes » — 05-SPEC-VUES.md § 10, plan 5 tâche 5.10. */

const ROUTE = '/app/notes';

test.describe('notes', () => {
  test('le journal s’enregistre tout seul et survit au rechargement', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByLabel('Journal du jour').fill('Bonne séance ce matin.');
    await expect(page.getByRole('status')).toHaveText('Enregistré');

    await page.reload();
    await attendreHydratation(page);
    await expect(page.getByLabel('Journal du jour')).toHaveValue('Bonne séance ce matin.');
  });

  /* G3 — le prototype fabriquait un texte pour les jours sans entrée. Un jour
     sans note est vide, et l'historique ne liste que ce qui a été écrit. */
  test('aucun contenu n’est fabriqué pour les jours sans note', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await expect(page.locator('[data-history] li')).toHaveCount(0);
    await expect(page.getByText('Les entrées que vous écrivez')).toBeVisible();
  });

  test('une entrée écrite apparaît dans l’historique', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByLabel('Journal du jour').fill('Première entrée.');
    await expect(page.locator('[data-history] li')).toHaveCount(1);
    await expect(page.locator('[data-history] li')).toContainText('Première entrée.');
  });

  test('effacer le texte supprime la note plutôt que d’en garder une vide', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByLabel('Journal du jour').fill('À jeter.');
    await expect(page.locator('[data-history] li')).toHaveCount(1);

    await page.getByLabel('Journal du jour').fill('');
    await expect(page.locator('[data-history] li')).toHaveCount(0);
  });

  test('l’humeur du jour se choisit et se conserve', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('radio', { name: 'Humeur : 4 sur 5' }).click();
    await expect(page.getByRole('radio', { name: 'Humeur : 4 sur 5' })).toBeChecked();

    await page.reload();
    await attendreHydratation(page);
    await expect(page.getByRole('radio', { name: 'Humeur : 4 sur 5' })).toBeChecked();
  });

  test('la recherche plein texte trouve une entrée', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.getByLabel('Journal du jour').fill('Course au bord du canal.');
    await expect(page.getByRole('status')).toHaveText('Enregistré');

    await page.getByLabel('Rechercher dans le journal…').fill('canal');
    await expect(page.locator('[data-hits] li')).toHaveCount(1);

    await page.getByLabel('Rechercher dans le journal…').fill('introuvable');
    await expect(page.getByText('Aucune note ne correspond')).toBeVisible();
  });

  test('une note d’habitude prise depuis Aujourd’hui apparaît ici', async ({ page }) => {
    await ouvrirAvecDemo(page, '/app/today');

    await page.getByRole('button', { name: /Plus d’actions : Méditer/ }).click();
    await page.getByRole('menuitem', { name: 'Ajouter une note' }).click();
    await page.getByRole('textbox', { name: 'Ajouter une note' }).fill('Dix minutes suffisent.');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await page.goto(ROUTE);
    await attendreHydratation(page);
    await expect(page.locator('[data-habit-notes] li')).toContainText('Dix minutes suffisent.');
    await expect(page.locator('[data-habit-notes] li')).toContainText('Méditer');
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
