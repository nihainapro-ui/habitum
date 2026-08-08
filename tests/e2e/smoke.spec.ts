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
    '/app/profile',
    '/app/settings',
  ];
  for (const route of routes) {
    const res = await page.goto(route);
    expect(res?.status(), route).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible();
  }
});

/* ADR-0007 — la racine appartient à la vitrine (phase 6). Tant qu'elle n'existe
   pas, elle mène à l'application, par une redirection TEMPORAIRE : un 308 mis en
   cache par les navigateurs serait à déloger client par client. */
test('la racine mène à l’application, temporairement', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/app$/);
});

test('le prototype reste servi tel quel', async ({ page }) => {
  const res = await page.goto('/prototype/Habitum.dc.html');
  expect(res?.status()).toBe(200);
});
