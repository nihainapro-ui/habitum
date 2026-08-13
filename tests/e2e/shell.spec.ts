import { expect, test } from '@playwright/test';
import { installer } from './helpers/app';

/* ADR-0007 : l'application vit sous /app. */

/* Tâche 5.5 — une base sans `onboarded` renvoie au parcours d'accueil. Les
   tests de ce fichier parlent de l'application installée : on pose donc un
   compte accueilli avant chaque navigation. */
test.beforeEach(async ({ page }) => {
  await installer(page);
});

test('le rail marque la page courante', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app/habits');
  await expect(page.getByRole('link', { name: /habitudes/i })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('le tableau de bord ne s’active pas depuis une autre vue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app/today');
  /* `/app` est un préfixe de toutes les autres routes : une comparaison par
     préfixe marquerait le tableau de bord actif partout. */
  await expect(page.getByRole('link', { name: /tableau de bord/i })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('le lien d’évitement mène au contenu principal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /contenu/i });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('le mode zen masque le rail', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  /* Les pages sont prérendues : le HTML arrive avant que les raccourcis soient
     écoutés. On attend que la coque se déclare interactive. */
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
  const rail = page.getByRole('navigation', { name: /principale/i });
  await expect(rail).toBeVisible();
  await page.keyboard.press('Meta+Backslash');
  await expect(rail).toBeHidden();
  await page.keyboard.press('Meta+Backslash');
  await expect(rail).toBeVisible();
});

test('sous 768 px, la barre basse remplace le rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await expect(page.getByTestId('bottom-bar')).toBeVisible();
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeHidden();
});

test('les cibles tactiles de la barre basse font au moins 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  const liens = page.getByTestId('bottom-bar').getByRole('link');
  for (const lien of await liens.all()) {
    const boite = await lien.boundingBox();
    expect(boite!.height, 'hauteur de cible tactile').toBeGreaterThanOrEqual(44);
  }
});

for (const w of [390, 768, 1060, 1440]) {
  test(`aucun débordement horizontal à ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/app');
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(debordement, `débordement à ${w} px`).toBe(false);
  });
}

test('le changement de vue est annoncé aux lecteurs d’écran', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  const region = page.locator('[aria-live="polite"]');
  await page
    .getByRole('navigation', { name: /principale/i })
    .getByRole('link', { name: /habitudes/i })
    .click();
  await expect(region).toContainText(/habitudes/i);
});
