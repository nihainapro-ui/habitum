import { expect, test } from '@playwright/test';

test('les onze vues répondent', async ({ page }) => {
  const routes = [
    '/app',
    '/app/today',
    '/app/habits',
    '/app/tasks',
    '/app/goals',
    '/app/calendar',
    '/app/stats',
    '/app/timer',
    '/app/notes',
    '/app/work',
    '/app/profile',
    '/app/settings',
  ];
  for (const route of routes) {
    const res = await page.goto(route);
    expect(res?.status(), route).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible();
  }
});

/* ADR-0007 — la racine appartient à la vitrine, et depuis la phase 6 elle la
   SERT. La redirection temporaire qui tenait la place a disparu ; ce test dit
   maintenant l'inverse de ce qu'il disait, et c'est le résultat attendu.

   Il reste ici, plutôt que d'être supprimé, parce qu'un pas-de-redirection se
   casse aussi silencieusement qu'une redirection : une règle réintroduite dans
   `next.config.mjs` renverrait la vitrine — le seul actif indexable du projet —
   vers une application `noindex`, sans qu'aucun autre test ne s'en aperçoive. */
test('la racine sert la vitrine, et ne redirige plus', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('le prototype reste servi tel quel — et DÉMARRE', async ({ page }) => {
  /* Ce test ne vérifiait que le code de statut. L'archive a donc été servie
     MORTE pendant six jours : la CSP de l'application, qui l'attrapait par
     inadvertance, bloquait le chargement de son moteur. HTTP 200, page vide,
     aucun signal. Un « servi tel quel » qui ne s'ouvre pas ne sert à rien. */
  const res = await page.goto('/prototype/Habitum.dc.html');
  expect(res?.status()).toBe(200);
  await expect(page.locator('[data-app]')).toBeVisible();
  await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible();
});
