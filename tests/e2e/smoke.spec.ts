import { expect, test } from '@playwright/test';

test('les onze vues répondent', async ({ page }) => {
  const routes = ['/', '/today', '/habits', '/tasks', '/goals', '/calendar', '/stats', '/timer', '/notes', '/profile', '/settings'];
  for (const route of routes) {
    const res = await page.goto(route);
    expect(res?.status(), route).toBeLessThan(400);
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('le prototype reste servi tel quel', async ({ page }) => {
  const res = await page.goto('/prototype/Habitum.dc.html');
  expect(res?.status()).toBe(200);
});
