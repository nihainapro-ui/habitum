import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/* axe sur les onze routes, la galerie, et dans les trois thèmes.
 *
 * LICENCE : axe-core est en MPL-2.0, hors de la liste blanche G5
 * (MIT / Apache-2.0 / ISC / OFL). C'est une dépendance de DÉVELOPPEMENT, qui
 * ne part pas dans le bundle et n'impose rien au code du produit. L'écart est
 * assumé et écrit ici plutôt que passé sous silence.
 *
 * On échoue sur `critical` et `serious` seulement : `moderate` et `minor`
 * contiennent des recommandations utiles mais discutables, et une chaîne qui
 * crie pour tout est une chaîne qu'on cesse de lire. */

const ROUTES = [
  '/app',
  '/app/today',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/calendar',
  '/app/stats',
  '/app/timer',
  '/app/notes',
  '/app/profile',
  '/app/settings',
];

async function violations(page: import('@playwright/test').Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}) : ${v.help} — ${v.nodes.length} nœud(s)`);
}

for (const route of ROUTES) {
  test(`axe — ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
    expect(await violations(page)).toEqual([]);
  });
}

test('axe — la galerie des primitives', async ({ page }) => {
  await page.goto('/dev/ui');
  expect(await violations(page)).toEqual([]);
});

/* Le contraste dépend du thème : contrôler le seul thème par défaut
   laisserait deux tiers du produit sans vérification. */
for (const theme of ['plasma', 'clinical'] as const) {
  test(`axe — thème ${theme}`, async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    expect(await violations(page)).toEqual([]);
  });
}
