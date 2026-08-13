import { test } from '@playwright/test';
import { ouvrirAvecDemo } from './helpers/app';

/* Captures de recette — critère de sortie n° 2 du plan 5.
 *
 * Ce fichier ne teste rien : il PRODUIT les images qu'un humain compare aux
 * références de `public/prototype/tests/visual/reference/`. La comparaison
 * automatisée est la tâche 8.2, et elle demande un socle de captures pris sur
 * l'application, pas sur le prototype.
 *
 * Les images sortent dans `captures-recette/` (ignoré par git) et NON dans
 * `test-results/`, que Playwright vide à chaque exécution.
 *
 * Ne tourne que sur demande : `npx playwright test captures --project=desktop`.
 */

const VUES = [
  ['01-dash', '/app'],
  ['02-today', '/app/today'],
  ['03-habits', '/app/habits'],
  ['04-tasks', '/app/tasks'],
  ['05-goals', '/app/goals'],
  ['06-cal', '/app/calendar'],
  ['07-stats', '/app/stats'],
  ['08-timer', '/app/timer'],
  ['09-notes', '/app/notes'],
  ['10-profile', '/app/profile'],
  ['11-settings', '/app/settings'],
] as const;

test.skip(({ browserName }) => browserName !== 'chromium', 'captures de recette');

for (const [nom, route] of VUES) {
  test(`capture ${nom}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ouvrirAvecDemo(page, route, { historique: true });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `captures-recette/${nom}.png` });
  });
}
