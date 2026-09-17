import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Tableau de bord sur TÉLÉPHONE — refonte mobile, PDF p. 4.
   Synthèse (une ligne) → trois indicateurs (une rangée) → « À faire
   maintenant » → objectif le plus proche. `vue-dash.spec.ts` garde la forme
   de bureau. Horloge figée au mercredi 5 août 2026. */

const ROUTE = '/app';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

test('la synthèse tient sur une ligne : anneau de 52 px, date, et trois faits', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const [prevu, fait] = String(golden['global.dayRatios30']).split(' ')[0]!.split('/');
  await expect(page.getByTestId('day-ratio')).toHaveText(`${fait}/${prevu}`);

  const anneau = await page.getByRole('img', { name: /Progression/i }).boundingBox();
  expect(anneau!.width).toBeLessThanOrEqual(56);

  const vue = page.getByTestId('dash-mobile');
  await expect(vue).toContainText('Mercredi 5 août');
  await expect(vue).toContainText(/\d+ habitudes? faites?/);
  await expect(vue).toContainText(/tâches? à faire/);
  await expect(vue).toContainText(/série \d+ j/);
});

test('trois indicateurs sur une rangée, lus dans le journal', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  await expect(page.getByTestId('indicateur-record')).toHaveText(`${golden['habit.alc'].best} j`);
  await expect(page.getByTestId('indicateur-tasks')).toHaveText('1 / 3');
  await expect(page.getByTestId('indicateur-focus')).toHaveText(/^\d+ h \d{2}$/);

  const boites = await Promise.all(
    ['record', 'focus', 'tasks'].map((c) => page.getByTestId(`indicateur-${c}`).boundingBox()),
  );
  /* Une RANGÉE : même ordonnée pour les trois. */
  expect(Math.abs(boites[0]!.y - boites[2]!.y)).toBeLessThan(2);
});

test('« À faire maintenant » est actionnable dès le premier écran, et nomme sa destination', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const lire = page.getByRole('checkbox', { name: 'Lire au moins 20 pages' });
  const boite = await lire.boundingBox();
  expect(boite!.width).toBeGreaterThanOrEqual(44);
  /* Dès le premier écran : la case est dans la hauteur visible, sans défiler. */
  expect(boite!.y + boite!.height).toBeLessThan(page.viewportSize()!.height);

  /* Cinq lignes au plus, et seulement ce qui reste à faire. */
  const lignes = page.getByTestId('dash-mobile').locator('[data-queue] > [data-row]');
  expect(await lignes.count()).toBeLessThanOrEqual(5);
  await expect(lignes.filter({ hasText: 'Méditer' })).toHaveCount(0);

  await lire.click();
  await expect(page.getByTestId('day-ratio')).toHaveText('5/8');
  /* Le rappel de sauvegarde est AUSSI un `status` : on vise le toast. */
  await expect(page.getByRole('status').filter({ hasText: 'Habitude cochée' })).toBeVisible();

  await page
    .getByTestId('dash-mobile')
    .getByRole('link', { name: /Aujourd.hui/ })
    .click();
  await expect(page).toHaveURL(/\/app\/today/);
});

test('l’objectif le plus proche mène aux objectifs', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const objectif = page.getByTestId('objectif-proche');
  await expect(objectif).toContainText(/Objectif « .+ »/);
  await expect(objectif).toContainText(/\d+ \/ \d+/);
  await objectif.click();
  await expect(page).toHaveURL(/\/app\/goals/);
});

test('rien n’est retiré : tâches à venir et mini-carte de trente jours', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  await expect(page.getByRole('link', { name: /tâches? à venir/ })).toBeVisible();
  await expect(page.locator('[data-mini-heatmap] > span')).toHaveCount(30);
});

test('un compte vierge n’affiche aucun chiffre fabriqué, et propose une action', async ({
  page,
}) => {
  await ouvrirVierge(page, ROUTE);

  await expect(page.getByTestId('day-ratio')).toHaveText('0/0');
  await expect(page.getByTestId('indicateur-record')).toHaveText('0 j');
  await expect(page.getByTestId('indicateur-focus')).toHaveText('0 h 00');
  await expect(page.getByTestId('indicateur-tasks')).toHaveText('0 / 0');
  await expect(page.getByText('Rien de planifié aujourd’hui')).toBeVisible();
  await expect(page.getByTestId('objectif-proche')).toHaveCount(0);

  await page.getByRole('button', { name: 'Ajouter une habitude' }).click();
  await expect(page.getByRole('dialog', { name: 'Nouvelle habitude' })).toBeVisible();
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
