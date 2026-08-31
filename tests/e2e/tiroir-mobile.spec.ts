import { expect, test } from '@playwright/test';
import { installer, ouvrirAvecDemo } from './helpers/app';

/* ============================================================================
   Tiroir de navigation mobile.

   CE QUE CES TESTS PROTÈGENT. Sous 768 px, le rail n'est pas rendu et la barre
   basse ne porte que quatre entrées. Les HUIT autres vues — calendrier,
   objectifs, statistiques, Work, profil, minuteur, notes, réglages — n'avaient aucun
   chemin d'accès au doigt : la consigne « le reste passe par la palette ⌘K »
   suppose un clavier, que l'APK n'a pas. Le tiroir est ce chemin, et il doit
   montrer le rail EN ENTIER, libellés compris.
   ========================================================================= */

const TELEPHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await installer(page);
});

test('sur téléphone, le tiroir donne accès aux douze vues', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');

  await expect(page.getByTestId('nav-drawer')).toBeHidden();
  await page.getByRole('button', { name: /ouvrir le menu/i }).click();

  const tiroir = page.getByTestId('nav-drawer');
  await expect(tiroir).toBeVisible();
  await expect(tiroir.getByRole('link')).toHaveCount(12);

  /* Les libellés sont LÀ, et pas seulement dans le nom accessible : c'est
     précisément ce que le rail replié ne montre pas. */
  await expect(tiroir.getByText('Statistiques', { exact: true })).toBeVisible();
  await expect(tiroir.getByText('Calendrier', { exact: true })).toBeVisible();
});

test('une entrée du tiroir navigue, et referme le tiroir', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');

  await page.getByRole('button', { name: /ouvrir le menu/i }).click();
  await page
    .getByTestId('nav-drawer')
    .getByRole('link', { name: /statistiques/i })
    .click();

  await expect(page).toHaveURL(/\/app\/stats/);
  /* Sans cela, la vue changeait DERRIÈRE un panneau resté ouvert. */
  await expect(page.getByTestId('nav-drawer')).toBeHidden();
});

test('le tiroir porte le thème et la langue, injoignables autrement au doigt', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');

  await page.getByRole('button', { name: /ouvrir le menu/i }).click();
  const tiroir = page.getByTestId('nav-drawer');
  await expect(tiroir.getByRole('button', { name: /thème/i })).toBeVisible();
  await expect(tiroir.getByRole('button', { name: /langue/i })).toBeVisible();
});

test('les cibles du tiroir font au moins 44 px', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');

  await page.getByRole('button', { name: /ouvrir le menu/i }).click();
  for (const lien of await page.getByTestId('nav-drawer').getByRole('link').all()) {
    const boite = await lien.boundingBox();
    expect(boite!.height, 'hauteur de cible tactile').toBeGreaterThanOrEqual(44);
  }
});

test('Échap ferme le tiroir et rend le focus au bouton du menu', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();

  const bouton = page.getByRole('button', { name: /ouvrir le menu/i });
  await bouton.click();
  await expect(page.getByTestId('nav-drawer')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('nav-drawer')).toBeHidden();
  /* Une modale qui se ferme en laissant le focus sur `<body>` renvoie un
     utilisateur au clavier tout en haut du document. */
  await expect(bouton).toBeFocused();
});

test('au-dessus de 768 px, le bouton du menu n’existe pas — le rail est là', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');

  await expect(page.getByRole('button', { name: /ouvrir le menu/i })).toBeHidden();
  await expect(page.getByTestId('rail')).toBeVisible();
});

test('sur téléphone, l’en-tête tient sur UNE ligne', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');

  /* Replié sur deux rangées, l'en-tête coûtait un sixième de la hauteur utile.
     Le repère est sa hauteur : une seconde rangée la ferait passer au-delà de
     100 px. */
  const hauteur = (await page.locator('header').first().boundingBox())!.height;
  expect(hauteur, 'hauteur de l’en-tête').toBeLessThan(100);
});

test('la barre basse marque la vue courante', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/tasks');

  /* Le défaut de l'APK : `trailingSlash: true` rend `/app/tasks/`, et la
     comparaison brute ne marquait plus AUCUNE entrée. */
  await expect(
    page.getByTestId('bottom-bar').getByRole('link', { name: /tâches/i }),
  ).toHaveAttribute('aria-current', 'page');
});

test('le contenu se termine AU-DESSUS du voile, pas dessous', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app');

  /* Le défaut corrigé : la barre basse guillotinait le contenu, et la garniture
     de 96 px laissait la dernière carte finir SOUS le voile — on la voyait
     s'éteindre au lieu de se terminer. Au bout du document, la dernière carte
     doit dégager la barre ET les 48 px de voile qui la surmontent. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);

  const barre = (await page.getByTestId('bottom-bar').boundingBox())!;
  const cartes = await page.locator('main section, main article').all();
  expect(cartes.length, 'le jeu de démonstration doit peupler le tableau de bord').toBeGreaterThan(
    0,
  );

  const derniere = (await cartes[cartes.length - 1]!.boundingBox())!;
  const bas = derniere.y + derniere.height;
  expect(bas, 'la dernière carte finit sous le voile').toBeLessThanOrEqual(barre.y - 48);
});

test('le voile est ancré à la barre, quelle que soit sa hauteur', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app');

  /* `bottom:100%` sur un enfant absolu, et non une hauteur recopiée : si un
     jour la barre grandit — zone sûre, second libellé —, le voile la suit. */
  const ecart = await page.evaluate(() => {
    const barre = document.querySelector('[data-testid="bottom-bar"]')!;
    const voile = barre.querySelector('span[aria-hidden="true"]')!;
    return barre.getBoundingClientRect().top - voile.getBoundingClientRect().bottom;
  });
  expect(Math.abs(ecart), 'le voile doit toucher le bord haut de la barre').toBeLessThan(1);
});
