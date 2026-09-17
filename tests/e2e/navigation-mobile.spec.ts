import { expect, test } from '@playwright/test';
import { attendreHydratation, installer, ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* ============================================================================
   Navigation mobile — refonte mobile (PDF « Refonte mobile Habitum », p. 2-3).

   CE QUE CES TESTS PROTÈGENT. Sous 768 px, UNE SEULE navigation : la barre
   basse — Aujourd'hui · Habitudes · Tâches · Plus. Le tiroir latéral qui la
   doublait (douze entrées, niveau, thème, langue) n'existe plus ; « Plus »
   est l'écran qui porte les huit autres vues et la carte de profil. L'en-tête
   n'a plus que trois éléments, et l'application s'ouvre sur Aujourd'hui.
   ========================================================================= */

const TELEPHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await installer(page);
});

test('sur téléphone, la barre basse porte quatre entrées, dont « Plus »', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/today');
  await attendreHydratation(page);

  const barre = page.getByTestId('bottom-bar');
  await expect(barre).toBeVisible();
  await expect(barre.getByRole('link')).toHaveCount(4);
  await expect(barre.getByRole('link', { name: 'Plus' })).toBeVisible();
  /* Le tableau de bord a quitté la barre : il synthétise, il n'agit pas. */
  await expect(barre.getByRole('link', { name: /tableau de bord/i })).toHaveCount(0);
});

test('le tiroir et son bouton de menu n’existent plus', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/today');
  await attendreHydratation(page);

  await expect(page.getByRole('button', { name: /ouvrir le menu/i })).toHaveCount(0);
  await expect(page.getByTestId('nav-drawer')).toHaveCount(0);
});

test('l’application s’ouvre sur Aujourd’hui, mais « Tableau de bord » reste joignable', async ({
  page,
}) => {
  await page.setViewportSize(TELEPHONE);
  /* `/app` est la route d'entrée de l'APK (`appStartPath`) : sur téléphone,
     la première arrivée d'une SESSION est renvoyée sur Aujourd'hui. Le passage
     par l'accueil de `installer` a déjà compté comme ouverture : on efface la
     session pour rejouer un démarrage à froid. */
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/today/);

  /* Mais ce n'est pas une impasse : depuis « Plus », le tableau de bord
     s'ouvre bien, sans être renvoyé une seconde fois. */
  await page.getByTestId('bottom-bar').getByRole('link', { name: 'Plus' }).click();
  await page
    .getByTestId('plus-grille')
    .getByRole('link', { name: /tableau de bord/i })
    .click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole('heading', { level: 1, name: /tableau de bord/i })).toBeVisible();
});

test('sur bureau, `/app` reste le tableau de bord', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  await attendreHydratation(page);
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByTestId('rail')).toBeVisible();
  await expect(page.getByTestId('bottom-bar')).toBeHidden();
});

test('« Plus » montre la carte de profil et huit tuiles, chacune avec un état réel', async ({
  page,
}) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/plus');

  const grille = page.getByTestId('plus-grille');
  await expect(grille.getByRole('link')).toHaveCount(8);
  for (const nom of [
    'Tableau de bord',
    'Calendrier',
    'Objectifs',
    'Statistiques',
    'Work',
    'Minuteur',
    'Notes',
    'Paramètres',
  ]) {
    await expect(grille.getByRole('link', { name: new RegExp(nom) })).toBeVisible();
  }

  /* La carte de profil porte le niveau, dans le vocabulaire de la journée :
     « Initié · Niveau 1 », jamais « LVL 1 · INITIÉ ». Et le jeu de
     démonstration est dit en toutes lettres. */
  const profil = page.getByRole('link', { name: 'Ouvrir le profil' });
  await expect(profil).toBeVisible();
  await expect(profil).toContainText(/· Niveau \d/);
  await expect(profil).toContainText('Jeu de démonstration');
  await expect(page.getByTestId('plus-view').getByText(/LVL/)).toHaveCount(0);

  /* Les lignes d'état sont RÉELLES : le jeu de démonstration a des projets et
     des objectifs, la tuile Focus dit un temps, pas une estimation. */
  await expect(grille.getByRole('link', { name: /Work/ })).toContainText(/\d+ projets?/);
  await expect(grille.getByRole('link', { name: /Objectifs/ })).toContainText(/en cours/);
  await expect(grille.getByRole('link', { name: /Minuteur/ })).toContainText(/cette semaine/);
  await expect(grille.getByRole('link', { name: /Paramètres/ })).toContainText('Neural · FR');
});

test('sur un compte vierge, « Plus » n’invente aucun chiffre', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirVierge(page, '/app/plus');

  const grille = page.getByTestId('plus-grille');
  await expect(grille.getByRole('link', { name: /Work/ })).toContainText('Aucun projet');
  await expect(grille.getByRole('link', { name: /Minuteur/ })).toContainText('0 min cette semaine');
  await expect(grille.getByRole('link', { name: /Tableau de bord/ })).toContainText(
    '0 / 0 aujourd’hui',
  );
  await expect(page.getByRole('link', { name: 'Ouvrir le profil' })).not.toContainText(
    'Jeu de démonstration',
  );
});

test('une tuile navigue, et la barre marque « Plus » comme courante', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/plus');
  await attendreHydratation(page);

  await expect(page.getByTestId('bottom-bar').getByRole('link', { name: 'Plus' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page
    .getByTestId('plus-grille')
    .getByRole('link', { name: /statistiques/i })
    .click();
  await expect(page).toHaveURL(/\/app\/stats/);
});

test('les cibles de « Plus » et de la barre font au moins 44 px', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/plus');
  await attendreHydratation(page);

  const cibles = [
    ...(await page.getByTestId('plus-grille').getByRole('link').all()),
    ...(await page.getByTestId('bottom-bar').getByRole('link').all()),
    page.getByRole('link', { name: 'Ouvrir le profil' }),
  ];
  for (const cible of cibles) {
    const boite = await cible.boundingBox();
    expect(boite!.height, 'hauteur de cible tactile').toBeGreaterThanOrEqual(44);
  }
});

test('l’en-tête mobile tient en trois éléments : titre, action, « + »', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/today');

  const entete = page.getByTestId('header-mobile');
  await expect(entete).toBeVisible();
  /* Sur Aujourd'hui, le titre EST la date du jour affiché — l'horloge des
     tests est figée au mercredi 5 août 2026. */
  await expect(entete.getByRole('heading', { level: 1 })).toContainText(/mercredi 5 août/i);
  await expect(entete.getByRole('button', { name: 'Ouvrir le calendrier' })).toBeVisible();
  await expect(entete.getByRole('button', { name: 'Nouveau' })).toBeVisible();
  /* Ni sur-titre, ni pastille, ni recherche : trois boutons au plus. */
  await expect(entete.getByRole('button')).toHaveCount(3);
  await expect(entete.getByText(/vue d’ensemble/i)).toHaveCount(0);

  const hauteur = (await entete.boundingBox())!.height;
  expect(hauteur, 'hauteur de l’en-tête mobile').toBeLessThan(80);
});

test('le titre-date ramène à aujourd’hui', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/today');

  await page.getByTestId('semaine-strip').locator('[data-jour="2026-08-07"]').click();
  const retour = page.getByRole('button', { name: 'Revenir à aujourd’hui' });
  await expect(retour).toContainText(/vendredi 7 août/i);
  await retour.click();
  await expect(
    page.getByTestId('semaine-strip').locator('[data-jour="2026-08-05"]'),
  ).toHaveAttribute('aria-current', 'date');
});

test('le « + » propose habitude, tâche, note et session ; sur Habitudes il crée directement', async ({
  page,
}) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/today');
  await attendreHydratation(page);

  await page.getByTestId('header-mobile').getByRole('button', { name: 'Nouveau' }).click();
  const feuille = page.getByTestId('feuille-creation');
  await expect(feuille).toBeVisible();
  for (const choix of ['Une habitude', 'Une tâche', 'Une note', 'Une session de focus']) {
    await expect(feuille.getByRole('button', { name: choix })).toBeVisible();
  }
  await feuille.getByRole('button', { name: 'Une tâche' }).click();
  await expect(page.getByRole('dialog', { name: 'Nouvelle tâche' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByTestId('bottom-bar').getByRole('link', { name: 'Habitudes' }).click();
  await page.getByTestId('header-mobile').getByRole('button', { name: 'Nouveau' }).click();
  await expect(page.getByTestId('feuille-creation')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Nouvelle habitude' })).toBeVisible();
});

test('la recherche de l’en-tête ouvre la palette sur Habitudes', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/habits');
  await attendreHydratation(page);

  await page.getByTestId('header-mobile').getByRole('button', { name: 'Rechercher…' }).click();
  await expect(page.getByRole('dialog', { name: /commandes/i })).toBeVisible();
});

test('le thème et la langue restent réglables, dans les Paramètres', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto('/app/plus');
  await attendreHydratation(page);
  await page
    .getByTestId('plus-grille')
    .getByRole('link', { name: /paramètres/i })
    .click();
  await expect(page).toHaveURL(/\/app\/settings/);
  await expect(page.getByRole('radiogroup', { name: 'Thème' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Langue' })).toBeVisible();
});

test('la barre, l’en-tête et « Plus » ne coupent aucun texte à 360 et 390 px', async ({ page }) => {
  for (const largeur of [360, 390]) {
    await page.setViewportSize({ width: largeur, height: 844 });
    await page.goto('/app/plus');
    await attendreHydratation(page);
    for (const racine of ['[data-testid="bottom-bar"]', '[data-testid="header-mobile"]', 'main']) {
      const { releve } = await releverDebordements(page, racine);
      expect(releve, `${racine} à ${largeur}px`).toEqual([]);
    }
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde, `débordement à ${largeur} px`).toBe(false);
  }
});

test('le contenu se termine AU-DESSUS de la barre flottante, pas dessous', async ({ page }) => {
  await page.setViewportSize(TELEPHONE);
  await ouvrirAvecDemo(page, '/app/plus');

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  const [main, barre] = await Promise.all([
    page.locator('main').boundingBox(),
    page.getByTestId('bottom-bar').boundingBox(),
  ]);
  /* Le bas du contenu (garniture comprise) passe SOUS la barre : c'est la
     garniture basse de `<main>` qui laisse la dernière tuile finir au-dessus
     du voile. */
  expect(main!.y + main!.height).toBeGreaterThanOrEqual(barre!.y + barre!.height - 1);
  const derniereTuile = await page
    .getByTestId('plus-grille')
    .getByRole('link')
    .last()
    .boundingBox();
  expect(derniereTuile!.y + derniereTuile!.height).toBeLessThan(barre!.y - 40);
});
