import { expect, test } from '@playwright/test';
import { JOUR_FIGE, ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* L'outillage sur lequel reposent les onze vues. Si le semis n'écrivait rien,
   ou si l'horloge n'était pas figée, chaque test de vue échouerait pour une
   raison qui n'a rien à voir avec la vue — d'où ce contrôle dédié. */

test("le semis de démonstration alimente l'application", async ({ page }) => {
  await ouvrirAvecDemo(page, '/app', { historique: true });

  await page.keyboard.press('Meta+k');
  await page.getByRole('combobox').fill('Méditer');
  await expect(page.getByRole('listbox')).toContainText(/méditer/i);
});

test("l'horloge du navigateur est figée à la date de référence", async ({ page }) => {
  await ouvrirVierge(page, '/app');

  const jour = await page.evaluate(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  expect(jour).toBe(JOUR_FIGE);
});
