import { test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* Captures de recette à 390 px — refonte mobile, livraison P1.
 *
 * Comme `captures.spec.ts` : ce fichier ne teste rien, il PRODUIT les images
 * qu'un humain compare aux maquettes du PDF « Refonte mobile Habitum » —
 * p. 3 (Plus), p. 5 (Aujourd'hui), p. 7 (éditeur d'habitude). Les images
 * sortent dans `captures-recette/mobile/` (ignoré par git).
 *
 * Ne tourne que sur demande : `npx playwright test captures-mobile --project=mobile`.
 */

const TELEPHONE = { width: 390, height: 844 };
const DOSSIER = 'captures-recette/mobile';

test.skip(({ browserName }) => browserName !== 'chromium', 'captures de recette');

test('capture aujourd’hui', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/today', { historique: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/01-today.png` });

  await page.getByRole('button', { name: /Plus tard/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${DOSSIER}/01b-today-plus-tard.png`, fullPage: true });

  await page.getByTestId('semaine-strip').locator('[data-jour="2026-08-04"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DOSSIER}/01c-today-passe.png` });

  await page.getByTestId('semaine-strip').locator('[data-jour="2026-08-06"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DOSSIER}/01d-today-futur.png` });
});

test('capture aujourd’hui, feuille d’actions', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/today', { historique: true });
  await page
    .getByTestId('today-mobile')
    .locator('[data-row]')
    .filter({ hasText: 'Méditer' })
    .locator('[data-name]')
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/01e-today-actions.png` });
});

test('capture aujourd’hui vide', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirVierge(page, '/app/today');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/01f-today-vide.png` });
});

test('capture plus', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/plus', { historique: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/02-plus.png` });
});

test('capture feuille de création', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/today', { historique: true });
  await page.getByTestId('header-mobile').getByRole('button', { name: 'Nouveau' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/03-creation.png` });
});

test('capture éditeur d’habitude', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/habits', { historique: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DOSSIER}/04-habits-entete.png` });

  await page.getByRole('button', { name: 'Méditer', exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/05-editeur.png` });

  await page.getByRole('button', { name: /Réglages avancés/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DOSSIER}/05b-editeur-avance.png`, fullPage: true });

  await page.getByRole('button', { name: 'Supprimer l’habitude…' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${DOSSIER}/05c-editeur-supprimer.png` });
});
