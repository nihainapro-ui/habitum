import { expect, test } from '@playwright/test';

/* Ce fichier vaut plus que les polices : il VERROUILLE LA PROMESSE PRODUIT.
   « Rien ne sort de l'appareil » (ADR-0002) était une phrase ; c'est
   maintenant une condition de livraison. Toute régression qui réintroduirait
   un appel réseau casse la chaîne. */

const ROUTES = ['/app', '/app/today', '/app/habits', '/app/settings'];

for (const route of ROUTES) {
  test(`aucune requête vers un domaine tiers — ${route}`, async ({ page }) => {
    const tiers: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') return;
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;
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

test('les fichiers de police sont servis depuis le domaine, en woff2', async ({ page }) => {
  const polices: string[] = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'font') polices.push(new URL(r.url()).origin);
  });

  await page.goto('/app', { waitUntil: 'networkidle' });
  for (const origine of polices) expect(origine).toMatch(/^http:\/\/localhost/);
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
