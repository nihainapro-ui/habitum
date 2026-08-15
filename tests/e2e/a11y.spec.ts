import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installer } from './helpers/app';

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

/* Tâche 5.5 — compte accueilli : c'est l'application installée qu'on audite,
   pas le parcours de première ouverture (qui a son propre fichier). */
test.beforeEach(async ({ page }) => {
  await installer(page);
});

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

/* La vitrine (phase 6) est auditée ici comme le reste, et pas seulement par
   Lighthouse : elle porte le seul contenu que des inconnus liront, dans un
   registre visuel — Modernist, clair — que rien d'autre du dépôt n'utilise.
   Ses deux écarts de contraste connus (`styles/modernist.css`) sont corrigés à
   la source ; ce contrôle échoue s'ils reviennent. */
const ROUTES_VITRINE = [
  '/',
  '/fonctionnalites',
  '/comparatifs/habitnow',
  '/guides/arreter-alcool',
  '/confidentialite',
  '/mentions-legales',
  '/en',
];

for (const route of ROUTES_VITRINE) {
  test(`axe — vitrine ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}

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
