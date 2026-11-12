import { expect, test, type Page } from '@playwright/test';
import { ouvrirAvecDemo } from './helpers/app';

/* Tâche 5.6 — « ⟳ Quotidienne » était une promesse que rien ne tenait.

   « Promener le chien » est la tâche quotidienne du jeu de démonstration,
   datée du mercredi 5 août 2026. Cochée, elle doit RESTER visible et cochée
   ce jour-là, et REVENIR le lendemain. Avant cette tâche, elle disparaissait
   pour toujours. */

const ROUTE = '/app/today';
const CHIEN = 'Promener le chien';

/* Sur téléphone (refonte mobile), le jour se choisit dans la semaine et le
   titre-date ramène à aujourd'hui ; sur bureau, par les flèches. L'horloge
   des tests est figée au 5 août 2026. */
const jourSuivant = async (page: Page, isMobile: boolean) => {
  if (isMobile) await page.getByTestId('semaine-strip').locator('[data-jour="2026-08-06"]').click();
  else await page.getByRole('button', { name: 'Jour suivant' }).click();
};
const revenirAujourdhui = async (page: Page, isMobile: boolean) => {
  if (isMobile) await page.getByRole('button', { name: 'Revenir à aujourd’hui' }).click();
  else await page.getByRole('button', { name: "Aujourd'hui", exact: true }).click();
};

test('une tâche quotidienne cochée reste faite aujourd’hui et revient demain', async ({
  page,
  isMobile,
}) => {
  await ouvrirAvecDemo(page, ROUTE);

  const case_ = page.getByRole('checkbox', { name: CHIEN });
  await expect(case_).not.toBeChecked();
  await case_.click();
  await expect(case_).toBeChecked();

  await jourSuivant(page, isMobile);
  await expect(page.getByRole('checkbox', { name: CHIEN })).not.toBeChecked();

  await revenirAujourdhui(page, isMobile);
  await expect(page.getByRole('checkbox', { name: CHIEN })).toBeChecked();
});

test('l’occurrence faite survit au rechargement', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await page.getByRole('checkbox', { name: CHIEN }).click();
  await expect(page.getByRole('checkbox', { name: CHIEN })).toBeChecked();

  await page.reload();
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
  await expect(page.getByRole('checkbox', { name: CHIEN })).toBeChecked();
});

test('décocher rouvre la journée décochée', async ({ page, isMobile }) => {
  await ouvrirAvecDemo(page, ROUTE);

  const case_ = page.getByRole('checkbox', { name: CHIEN });
  await case_.click();
  await expect(case_).toBeChecked();
  await case_.click();
  await expect(page.getByRole('checkbox', { name: CHIEN })).not.toBeChecked();

  /* Demain, elle n'est PAS due deux fois : l'échéance est revenue au 5. */
  await jourSuivant(page, isMobile);
  await expect(page.getByRole('checkbox', { name: CHIEN })).toHaveCount(0);
});
