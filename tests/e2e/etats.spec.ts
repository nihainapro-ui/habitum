import { expect, test } from '@playwright/test';
import { ouvrirVierge } from './helpers/app';

/* Tâche 5.1 — aucun écran blanc, aucune vue muette.

   Les trois choses que ce fichier interdit :

   1. qu'une erreur de rendu laisse une page vide ;
   2. qu'un écran d'erreur oublie de proposer l'export — une panne ne doit
      jamais mettre l'utilisateur en position de perdre son historique ;
   3. qu'une vue sans données ne dise rien à un compte neuf.

   La trappe `?forceError` est décrite dans `components/dev/force-error.tsx`. */

const VUES_VIDES = [
  '/app/today',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/stats',
  '/app/timer',
  '/app/notes',
];

test('une erreur de vue affiche un écran de reprise, pas un écran blanc', async ({ page }) => {
  await page.goto('/app?forceError=1');

  const reprise = page.getByTestId('error-state');
  await expect(reprise).toBeVisible();
  await expect(reprise.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(reprise.getByRole('button', { name: /réessayer/i })).toBeVisible();
  /* La plus importante des trois actions. */
  await expect(reprise.getByRole('button', { name: /exporter/i })).toBeVisible();
  await expect(reprise.getByRole('link', { name: /accueil/i })).toBeVisible();
});

test('une erreur de coque tombe sur le dernier filet, qui propose aussi l’export', async ({
  page,
}) => {
  await page.goto('/app?forceError=global');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/quelque chose/i);
  await expect(page.getByRole('button', { name: /exporter/i })).toBeVisible();
});

test('l’écran de reprise ramène à l’application', async ({ page }) => {
  await page.goto('/app?forceError=1');
  await page
    .getByTestId('error-state')
    .getByRole('link', { name: /accueil/i })
    .click();
  await expect(page.getByTestId('error-state')).toHaveCount(0);
});

test('chaque vue a un état vide explicite sur un compte vierge', async ({ page }) => {
  for (const route of VUES_VIDES) {
    await ouvrirVierge(page, route);
    await expect(
      page.getByTestId('empty-state').first(),
      `état vide manquant sur ${route}`,
    ).toBeVisible();
  }
});

test('une erreur attrapée est consignée localement et lisible dans les réglages', async ({
  page,
}) => {
  await page.goto('/app?forceError=1');
  await expect(page.getByTestId('error-state')).toBeVisible();

  await ouvrirVierge(page, '/app/settings');
  await expect(page.locator('[data-error-log] li').first()).toContainText(/forceError/i);
});
