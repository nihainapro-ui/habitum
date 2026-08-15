import { expect, test } from '@playwright/test';

/* Référencement — tâches 7.2, 7.3 et 7.4.
 *
 * Ce que ce fichier protège tient en une phrase : la vitrine est le SEUL actif
 * indexable du projet, et l'application doit rester invisible. Les deux moitiés
 * de cette phrase se cassent séparément, donc elles se testent séparément. */

test('les métadonnées sociales sont complètes', async ({ page }) => {
  await page.goto('/');
  const meta = (s: string) => page.locator(s).getAttribute('content');

  expect(await meta('meta[property="og:title"]')).toBeTruthy();
  expect(await meta('meta[property="og:description"]')).toBeTruthy();
  expect(await meta('meta[property="og:image"]')).toMatch(/^https?:\/\//);
  expect(await meta('meta[property="og:type"]')).toBe('website');
  expect(await meta('meta[property="og:locale"]')).toBe('fr_FR');
  expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
});

test('l’image Open Graph est générée, aux bonnes dimensions', async ({ page, request }) => {
  await page.goto('/');
  const url = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(url).toBeTruthy();

  const image = await request.get(url!);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toContain('image/png');

  expect(await page.locator('meta[property="og:image:width"]').getAttribute('content')).toBe(
    '1200',
  );
  expect(await page.locator('meta[property="og:image:height"]').getAttribute('content')).toBe(
    '630',
  );
});

test('chaque page déclare sa canonique et ses deux alternats', async ({ page }) => {
  const paires: [string, string][] = [
    ['/fonctionnalites', '/en/features'],
    ['/comparatifs/habitnow', '/en/comparisons/habitnow'],
    ['/guides/arreter-alcool', '/en/guides/quit-alcohol'],
    ['/confidentialite', '/en/privacy'],
    ['/mentions-legales', '/en/legal'],
  ];

  for (const [fr, en] of paires) {
    await page.goto(fr);
    const canonique = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(new URL(canonique!).pathname, `canonique de ${fr}`).toBe(fr);

    const versEn = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
    expect(new URL(versEn!).pathname, `alternat anglais de ${fr}`).toBe(en);

    /* Et la réciproque : deux pages qui ne se désignent pas mutuellement font
       un couple `hreflang` que les moteurs ignorent purement et simplement. */
    await page.goto(en);
    const versFr = await page.locator('link[rel="alternate"][hreflang="fr"]').getAttribute('href');
    expect(new URL(versFr!).pathname, `alternat français de ${en}`).toBe(fr);
  }
});

test('l’application est noindex, la vitrine est indexable', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/app/);
  expect(robots).toMatch(/Disallow: \/prototype/);
  expect(robots).toMatch(/Disallow: \/dev/);
  expect(robots).toMatch(/Sitemap: https?:\/\//);
  expect(robots).toMatch(/^Allow: \/$/m);

  const plan = await (await request.get('/sitemap.xml')).text();
  expect(plan).toContain('<urlset');
  // Aucune route applicative ni d'atelier au plan du site.
  expect(plan).not.toContain('/app');
  expect(plan).not.toContain('/prototype');
  expect(plan).not.toContain('/dev');
  expect(plan).not.toContain('/onboarding');
});

test('le plan du site liste les douze pages de la vitrine, avec leurs alternats', async ({
  request,
}) => {
  const plan = await (await request.get('/sitemap.xml')).text();
  const adresses = [...plan.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);

  expect(adresses).toContain('/');
  expect(adresses).toContain('/fonctionnalites');
  expect(adresses).toContain('/comparatifs');
  expect(adresses).toContain('/comparatifs/habitnow');
  expect(adresses).toContain('/guides/methode-pomodoro');
  expect(adresses).toContain('/mentions-legales');

  /* Douze entrées françaises — quatre pages de tête, deux index de rubrique,
     trois comparatifs, trois guides. Les anglaises ne sont pas des entrées
     séparées : elles sont portées par les alternats, ce qui est la forme que
     les moteurs attendent d'un site bilingue. Vingt-quatre URL au total. */
  expect(adresses).toHaveLength(12);
  expect(new Set(adresses).size).toBe(adresses.length);

  const alternats = [...plan.matchAll(/hreflang="en" href="([^"]+)"/g)].map(
    (m) => new URL(m[1]!).pathname,
  );
  expect(alternats).toHaveLength(12);
  for (const chemin of alternats) expect(chemin.startsWith('/en')).toBe(true);
});

test('les routes applicatives portent un en-tête noindex', async ({ request }) => {
  for (const route of ['/app', '/app/habits', '/app/settings', '/onboarding']) {
    const reponse = await request.get(route);
    expect(reponse.headers()['x-robots-tag'], `en-tête sur ${route}`).toContain('noindex');
  }
});

test('les pages de vitrine ne portent AUCUN en-tête noindex', async ({ request }) => {
  for (const route of ['/', '/fonctionnalites', '/en', '/comparatifs/habitnow']) {
    const reponse = await request.get(route);
    expect(reponse.headers()['x-robots-tag'], `en-tête parasite sur ${route}`).toBeUndefined();
  }
});

test('le JSON-LD est valide et déclare un produit gratuit', async ({ page }) => {
  await page.goto('/');
  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocs.length).toBeGreaterThan(0);

  const objets = blocs.map((b) => JSON.parse(b) as Record<string, unknown>);

  const application = objets.find((o) => o['@type'] === 'SoftwareApplication') as
    | { offers: { price: string }; applicationCategory: string; isAccessibleForFree: boolean }
    | undefined;
  expect(application).toBeDefined();
  expect(application!.offers.price).toBe('0');
  expect(application!.applicationCategory).toBe('LifestyleApplication');
  expect(application!.isAccessibleForFree).toBe(true);

  const faq = objets.find((o) => o['@type'] === 'FAQPage') as
    { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } | undefined;
  expect(faq).toBeDefined();
  expect(faq!.mainEntity).toHaveLength(8);

  /* Une FAQPage qui déclare une question absente de l'écran est un signal
     trompeur — et c'est ce que les moteurs sanctionnent. */
  for (const question of faq!.mainEntity) {
    await expect(page.getByRole('heading', { name: question.name })).toBeVisible();
  }
});

test('les pages de fond portent un fil d’Ariane structuré', async ({ page }) => {
  await page.goto('/comparatifs/habitnow');
  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const objets = blocs.map((b) => JSON.parse(b) as Record<string, unknown>);

  const fil = objets.find((o) => o['@type'] === 'BreadcrumbList') as
    { itemListElement: { position: number; name: string; item: string }[] } | undefined;
  expect(fil).toBeDefined();
  expect(fil!.itemListElement).toHaveLength(3);
  expect(fil!.itemListElement.map((m) => m.position)).toEqual([1, 2, 3]);
  expect(new URL(fil!.itemListElement[2]!.item).pathname).toBe('/comparatifs/habitnow');

  const article = objets.find((o) => o['@type'] === 'Article') as
    { datePublished: string; dateModified: string } | undefined;
  expect(article).toBeDefined();
  expect(article!.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('le JSON-LD ne peut pas refermer sa propre balise', async ({ page }) => {
  /* `serialiser` échappe « < » en \\u003c : c'est ce qui rend une injection
     structurellement impossible, et non l'absence de contenu hostile
     aujourd'hui. Le contrôle porte sur le mécanisme, pas sur le contenu. */
  await page.goto('/');
  const brut = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(brut).not.toContain('<');
});

test('aucune page de vitrine ne charge le registre sombre', async ({ page }) => {
  /* Les deux groupes ont des layouts RACINES distincts : la vitrine ne doit
     donc télécharger ni Space Grotesk, ni les jetons de thème. Si cette
     séparation tombe, le budget de performance de la tâche 7.7 tombe avec. */
  const polices: string[] = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'font') polices.push(new URL(r.url()).pathname);
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  expect(polices.join(' ')).not.toMatch(/SpaceGrotesk|JetBrainsMono/);
});
