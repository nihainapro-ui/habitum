import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Calendrier et sélecteur de jour sur TÉLÉPHONE — refonte mobile, PDF p. 9.
   Le mois existe enfin sous 768 px, avec un trait d'état par jour ; le jour
   choisi se déplie sous la grille ; le sélecteur de jour de l'en-tête est
   cette même grille, en feuille basse. Horloge figée au mercredi 5 août 2026. */

const ROUTE = '/app/calendar';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

test('le mois montre 42 cases de 44 px, avec un état par jour et sa légende écrite', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const mois = page.getByTestId('mois-mobile');
  const cases = mois.locator('[data-jour]');
  await expect(cases).toHaveCount(42);
  for (const c of [cases.nth(0), cases.nth(20), cases.nth(41)]) {
    const boite = await c.boundingBox();
    expect(boite!.width).toBeGreaterThanOrEqual(44);
    expect(boite!.height).toBeGreaterThanOrEqual(44);
  }

  /* Le passé du jeu de démonstration porte des états ; le futur, aucun. */
  await expect(mois.locator('[data-jour="2026-08-04"]')).not.toHaveAttribute('data-etat', 'none');
  await expect(mois.locator('[data-jour="2026-08-20"]')).toHaveAttribute('data-etat', 'none');
  /* Jamais la couleur seule : l'état est dans le NOM de la case… */
  await expect(mois.locator('[data-jour="2026-08-04"]')).toHaveAccessibleName(
    /mardi 4 août — (complet|partiel|manqué)/,
  );
  /* … et la légende l'écrit. */
  const legende = mois.getByRole('list', { name: 'Légende' });
  for (const mot of ['complet', 'partiel', 'manqué']) await expect(legende).toContainText(mot);
});

test('appuyer sur un jour déplie son détail, et « Ouvrir » mène à Aujourd’hui ce jour-là', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const detail = page.getByTestId('detail-jour');
  await expect(detail.getByRole('heading')).toHaveText('Mercredi 5');

  await page.getByTestId('mois-mobile').locator('[data-jour="2026-08-07"]').click();
  await expect(detail.getByRole('heading')).toHaveText('Vendredi 7');
  /* Vendredi : « Regarder un film » n'est planifié que vendredi et samedi. */
  await expect(detail).toContainText('Regarder un film');
  /* Un jour à venir : les cases du détail sont désactivées. */
  await expect(detail.getByRole('checkbox', { name: 'Regarder un film' })).toBeDisabled();

  await detail.getByRole('button', { name: 'Ouvrir' }).click();
  await expect(page).toHaveURL(/\/app\/today/);
  await expect(
    page.getByTestId('semaine-strip').locator('[data-jour="2026-08-07"]'),
  ).toHaveAttribute('aria-current', 'date');
});

test('un jour passé se corrige depuis le détail, et son trait suit', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const hier = page.getByTestId('mois-mobile').locator('[data-jour="2026-08-04"]');
  await hier.click();

  const detail = page.getByTestId('detail-jour');
  const cases = detail.getByRole('checkbox');
  const total = await cases.count();
  expect(total).toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    const c = cases.nth(i);
    if ((await c.getAttribute('aria-checked')) !== 'true' && (await c.isEnabled())) await c.click();
  }
  await expect(hier).toHaveAttribute('data-etat', /complete|partial/);
});

test('les flèches et « Aujourd’hui » changent de mois', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const mois = page.getByTestId('mois-mobile');
  await expect(mois.getByText('août 2026')).toBeVisible();
  await mois.getByRole('button', { name: 'Période suivante' }).click();
  await expect(mois.getByText('septembre 2026')).toBeVisible();
  await expect(mois.locator('[data-jour]')).toHaveCount(42);
  await mois.getByRole('button', { name: 'Aujourd’hui' }).click();
  await expect(mois.getByText('août 2026')).toBeVisible();
});

test('trois modes : Mois, Semaine, Agenda', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await page.getByRole('radio', { name: 'Semaine' }).click();
  await expect(page.getByTestId('semaine-strip').getByRole('button')).toHaveCount(7);
  await expect(page.getByTestId('detail-jour')).toBeVisible();

  await page.getByRole('radio', { name: 'Agenda' }).click();
  await expect(page.locator('[data-agenda]')).toBeVisible();
  await expect(page.getByTestId('detail-jour')).toHaveCount(0);
});

test('un mois sans donnée le dit', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await expect(page.getByText('Aucune activité ce mois')).toBeVisible();
  await expect(page.getByTestId('detail-jour')).toContainText('Aucune occurrence ce jour-là');
});

test('le sélecteur de jour de l’en-tête est la même grille, en feuille basse', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/tasks', { historique: true });

  await page
    .getByTestId('header-mobile')
    .getByRole('button', { name: 'Ouvrir le calendrier' })
    .click();
  const feuille = page.getByTestId('feuille-date');
  await expect(feuille).toBeVisible();
  await expect(feuille.locator('[data-jour]')).toHaveCount(42);
  await expect(feuille.getByRole('list', { name: 'Légende' })).toBeVisible();

  /* En bas de l'écran, pas en boîte centrée : son bord bas touche le bas. */
  const boite = await feuille.boundingBox();
  expect(boite!.y + boite!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 2);

  await feuille.locator('[data-jour="2026-08-12"]').click();
  await expect(feuille).toBeHidden();
  await expect(page).toHaveURL(/\/app\/today/);
  await expect(
    page.getByTestId('semaine-strip').locator('[data-jour="2026-08-12"]'),
  ).toHaveAttribute('aria-current', 'date');
});

test('aucun texte coupé à 360 et 390 px', async ({ page }) => {
  for (const largeur of [360, 390]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const { releve } = await releverDebordements(page, 'main');
    expect(releve, `main à ${largeur}px`).toEqual([]);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde).toBe(false);
  }
});

test('accessible, dans les trois thèmes', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  for (const theme of ['neural', 'plasma', 'clinical']) {
    await page.evaluate((t) => {
      document.documentElement.dataset['theme'] = t;
    }, theme);
    await page.waitForTimeout(250);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(
      violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
      theme,
    ).toEqual([]);
  }
});
