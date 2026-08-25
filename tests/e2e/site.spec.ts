import { expect, test } from '@playwright/test';
import { estMemeOrigine } from './helpers/app';

/* Vitrine — tâche 7.1.
 *
 * Ce fichier vérifie ce qu'un visiteur voit ; `seo.spec.ts` vérifie ce qu'un
 * robot lit. Les deux sont nécessaires et ne se recouvrent pas : une vitrine
 * peut être parfaitement balisée et illisible, ou l'inverse. */

const PALIERS = [390, 768, 1060, 1440];

const PAGES_FR = [
  '/',
  '/fonctionnalites',
  '/comparatifs',
  '/comparatifs/habitnow',
  '/comparatifs/habitica',
  '/comparatifs/streaks',
  '/guides',
  '/guides/arreter-alcool',
  '/guides/reduire-ecrans',
  '/guides/methode-pomodoro',
  '/confidentialite',
  '/mentions-legales',
];

const PAGES_EN = [
  '/en',
  '/en/features',
  '/en/comparisons',
  '/en/comparisons/habitnow',
  '/en/comparisons/habitica',
  '/en/comparisons/streaks',
  '/en/guides',
  '/en/guides/quit-alcohol',
  '/en/guides/reduce-screen-time',
  '/en/guides/pomodoro-method',
  '/en/privacy',
  '/en/legal',
];

test('la vitrine dit ce que fait le produit en un écran', async ({ page }) => {
  await page.goto('/');

  const accroche = page.locator('.accroche');
  await expect(accroche.getByRole('heading', { level: 1 })).toBeVisible();

  /* Les trois arguments différenciants sont au-dessus de la ligne de
     flottaison. On les cherche DANS l'accroche : les retrouver ailleurs sur la
     page ne prouverait rien — c'est ici qu'ils doivent être lus. */
  await expect(accroche.getByText(/sans compte/i)).toBeVisible();
  await expect(accroche.getByText(/sur votre appareil/i)).toBeVisible();
  await expect(accroche.getByText(/gratuit/i)).toBeVisible();

  await expect(accroche.getByRole('link', { name: /ouvrir habitum/i })).toHaveAttribute(
    'href',
    '/app',
  );
});

test('la vitrine est en Modernist, l’application reste sombre', async ({ page }) => {
  await page.goto('/');
  const fondSite = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const policeSite = await page.evaluate(() => getComputedStyle(document.body).fontFamily);

  await page.goto('/app');
  const fondApp = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const policeApp = await page.evaluate(() => getComputedStyle(document.body).fontFamily);

  expect(fondSite).not.toBe(fondApp);
  /* Les deux registres ne se mélangent pas (décision B1) : Archivo d'un côté,
     Space Grotesk de l'autre, et jamais l'inverse. */
  expect(policeSite).toMatch(/Archivo/i);
  expect(policeApp).toMatch(/Space Grotesk/i);
  expect(policeSite).not.toMatch(/Space Grotesk/i);
});

test('la racine ne redirige plus vers l’application', async ({ page }) => {
  const reponse = await page.goto('/');
  expect(reponse?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/');
});

for (const largeur of PALIERS) {
  test(`vitrine sans débordement horizontal à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });

    for (const chemin of ['/', '/fonctionnalites', '/comparatifs/habitnow', '/confidentialite']) {
      await page.goto(chemin);
      const deborde = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(deborde, `débordement sur ${chemin} à ${largeur} px`).toBe(false);
    }
  });
}

test.describe('toutes les pages de la vitrine répondent', () => {
  for (const chemin of [...PAGES_FR, ...PAGES_EN]) {
    test(`${chemin} rend un titre unique`, async ({ page }) => {
      const reponse = await page.goto(chemin);
      expect(reponse?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
});

test('la bascule de langue mène à LA MÊME page, pas à l’accueil', async ({ page }) => {
  await page.goto('/comparatifs/habitica');
  await page.getByRole('navigation').first().getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/comparisons\/habitica$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.getByRole('navigation').first().getByRole('link', { name: 'Français' }).click();
  await expect(page).toHaveURL(/\/comparatifs\/habitica$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

/* Le 404 a été PERDU en séparant les layouts racines, et récupéré par
   `app/global-not-found.tsx`. Sans ces contrôles, la régression était invisible :
   le code de statut restait bon, seule la page servie changeait — celle de Next,
   sans attribut `lang`, sans marque et sans lien de retour. */
for (const chemin of ['/guides/inexistant', '/xyz-inexistant', '/en/xyz', '/app/xyz']) {
  test(`${chemin} rend le 404 du produit, pas celui de Next`, async ({ page }) => {
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBe(404);

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Un 404 sans porte de sortie est un cul-de-sac.
    await expect(page.getByRole('link', { name: /habitum/i }).first()).toBeVisible();
  });
}

test('le 404 n’est pas indexable', async ({ page }) => {
  await page.goto('/xyz-inexistant');

  /* DEUX balises `robots`, et c'est normal : Next en pose une d'office sur sa
     page 404, celle de `global-not-found.tsx` s'ajoute. Ce qui compte est
     qu'AUCUNE des deux n'autorise l'indexation — une seule qui dirait `index`
     suffirait à faire entrer une page d'erreur dans les résultats. */
  const contenus = await page
    .locator('meta[name="robots"]')
    .evaluateAll((balises) => balises.map((b) => b.getAttribute('content') ?? ''));

  expect(contenus.length).toBeGreaterThan(0);
  for (const contenu of contenus) expect(contenu).toContain('noindex');
});

test('la vitrine n’émet aucune requête vers un domaine tiers', async ({ page, baseURL }) => {
  const tiers: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    if (estMemeOrigine(url, baseURL)) return;
    tiers.push(r.url());
  });

  for (const chemin of ['/', '/comparatifs/streaks', '/en']) {
    await page.goto(chemin, { waitUntil: 'networkidle' });
  }
  expect(tiers, `requêtes tierces : ${tiers.join(', ')}`).toEqual([]);
});

test('la vitrine n’ouvre pas la base de données', async ({ page }) => {
  /* Elle n'a aucune raison de le faire, et le contraire signalerait que la
     coque applicative s'est invitée dans le groupe de routes du site — le
     défaut exact que la séparation des layouts racines empêche. */
  await page.goto('/');
  const bases = await page.evaluate(async () =>
    typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).length : 0,
  );
  expect(bases).toBe(0);
});

test('le pied donne accès aux documents opposables', async ({ page }) => {
  await page.goto('/');
  const pied = page.getByRole('contentinfo');
  await expect(pied.getByRole('link', { name: /confidentialité/i })).toBeVisible();
  await expect(pied.getByRole('link', { name: /mentions/i })).toBeVisible();
});

test('la politique de confidentialité nomme le cookie et l’hébergeur', async ({ page }) => {
  await page.goto('/confidentialite');
  const contenu = page.getByRole('main');
  await expect(contenu.getByText(/habitum\.lang/)).toBeVisible();
  await expect(contenu.getByText(/cdg1/)).toBeVisible();
  /* Le passage le moins flatteur, et celui qui rend la page crédible : les
     journaux techniques de l'hébergeur existent, et sont déclarés. */
  await expect(contenu.getByText(/journaux techniques/i).first()).toBeVisible();
});
