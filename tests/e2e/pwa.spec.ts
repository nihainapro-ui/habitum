import { expect, test } from '@playwright/test';
import { installer, ouvrir } from './helpers/app';

/* Tâche 5.7 — installable, et utilisable avion activé (lève D25).

   Le service worker n'existe que dans le BUILD DE PRODUCTION : il est
   désactivé en développement (`next.config.mjs`), parce qu'un cache qui
   fonctionne pendant que Fast Refresh recompile sert des morceaux de deux
   versions différentes. La recette tourne justement sur le build de
   production — c'est donc bien ce qui sera déployé qu'on éprouve ici. */

test('le manifeste est complet et servi', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);

  const m = (await res.json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: { sizes: string; purpose?: string }[];
  };

  expect(m.name).toBe('Habitum');
  expect(m.display).toBe('standalone');
  /* ÉCART ASSUMÉ au plan (`/`) : la racine redirige vers l'application et
     servira la vitrine en phase 6. Une application installée doit ouvrir
     l'application. */
  expect(m.start_url).toBe('/app');

  const tailles = m.icons.map((i) => i.sizes);
  expect(tailles).toContain('192x192');
  expect(tailles).toContain('512x512');
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
});

test('les trois icônes sont réellement servies', async ({ request }) => {
  for (const chemin of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png']) {
    const res = await request.get(chemin);
    expect(res.status(), chemin).toBe(200);
    expect(res.headers()['content-type'], chemin).toContain('image/png');
  }
});

test('le service worker s’enregistre et prend le contrôle', async ({ page }) => {
  await installer(page);
  await ouvrir(page, '/app');

  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 20_000,
  });
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain(
    '/sw.js',
  );
});

test('l’application fonctionne hors ligne', async ({ page, context }) => {
  await installer(page);
  await ouvrir(page, '/app');
  /* Une route se met en cache quand on l'ouvre (`cacheOnNavigation`). Le
     précache ne peut pas contenir les documents des vues — leur HTML référence
     des morceaux dont l'empreinte change à chaque build. La limite est donc
     éprouvée telle qu'elle est : ce qui a été ouvert une fois reste
     consultable, réseau coupé. */
  await ouvrir(page, '/app/habits');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
    timeout: 20_000,
  });

  await context.setOffline(true);
  await page.reload();

  /* Le rail sur grand écran, la barre basse sur mobile : la coque n'a pas la
     même forme aux deux paliers, mais elle doit être là dans les deux cas. */
  await expect(
    page.locator('[data-testid="rail"]:visible, [data-testid="bottom-bar"]:visible').first(),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/habitudes/i);
  /* Et l'application RÉPOND : elle a rejoué son amorçage, hors ligne. */
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();

  await context.setOffline(false);
});
