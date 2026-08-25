import { expect, test } from '@playwright/test';
import { estMemeOrigine, installer } from './helpers/app';

/* Ce fichier vaut plus que les polices : il VERROUILLE LA PROMESSE PRODUIT.
   « Rien ne sort de l'appareil » (ADR-0002) était une phrase ; c'est
   maintenant une condition de livraison. Toute régression qui réintroduirait
   un appel réseau casse la chaîne. */

/* Tâche 5.5 — une base sans `onboarded` renvoie au parcours d'accueil. Les
   tests de ce fichier parlent de l'application installée : on pose donc un
   compte accueilli avant chaque navigation. */
test.beforeEach(async ({ page }) => {
  await installer(page);
});

const ROUTES = ['/app', '/app/today', '/app/habits', '/app/settings'];

for (const route of ROUTES) {
  test(`aucune requête vers un domaine tiers — ${route}`, async ({ page, baseURL }) => {
    const tiers: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') return;
      if (estMemeOrigine(url, baseURL)) return;
      tiers.push(r.url());
    });

    await page.goto(route, { waitUntil: 'networkidle' });
    expect(tiers, `requêtes tierces : ${tiers.join(', ')}`).toEqual([]);
  });
}

test('Space Grotesk est réellement appliquée', async ({ page }) => {
  await page.goto('/app');
  const famille = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(famille).toMatch(/Space Grotesk/i);
});

test('les fichiers de police sont servis depuis le domaine, en woff2', async ({
  page,
  baseURL,
}) => {
  const polices: URL[] = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'font') polices.push(new URL(r.url()));
  });

  await page.goto('/app', { waitUntil: 'networkidle' });
  for (const police of polices) {
    expect(
      estMemeOrigine(police, baseURL),
      `police servie par une origine tierce : ${police.href}`,
    ).toBe(true);
    expect(police.pathname).toMatch(/\.woff2$/);
  }
});

/* D8 — le prototype chargeait Google Fonts à chaque ouverture. Il est servi
   tel quel, sans être compilé : ce contrôle porte donc sur le fichier lui-même. */
test('le prototype ne charge plus Google Fonts', async ({ page, request }) => {
  const source = await (await request.get('/prototype/Habitum.dc.html')).text();
  expect(source).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  expect(source).toMatch(/@font-face/);

  /* Et il doit toujours s'ouvrir seul, sans erreur. */
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto('/prototype/Habitum.dc.html');
  await expect(page.locator('[data-app]')).toBeVisible();
  expect(erreurs).toEqual([]);
});
