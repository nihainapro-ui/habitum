import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Vue « Habitudes » sur TÉLÉPHONE — refonte mobile, PDF p. 6.
   Segments Actives / Archivées → lignes avec série à droite et pastilles de
   44 px → résumé des sept derniers jours. `vue-habits.spec.ts` garde la
   forme de bureau. Horloge figée au mercredi 5 août 2026. */

const ROUTE = '/app/habits';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

const vue = (page: Page) => page.getByTestId('habits-mobile');
const ligne = (page: Page, nom: string) =>
  vue(page)
    .locator('[data-habit]')
    .filter({ has: page.locator('[data-name]', { hasText: nom }) });
const menu = async (page: Page, nom: string) => {
  await ligne(page, nom).locator('[data-name]').click();
  const feuille = page.getByTestId('feuille-menu');
  await expect(feuille).toBeVisible();
  return feuille;
};

test('segments avec compteurs, et la série de chaque ligne vient du journal', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  await expect(page.getByRole('radio', { name: 'Actives · 6' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Archivées · 0' })).toBeVisible();
  await expect(vue(page).locator('[data-habit]')).toHaveCount(6);

  for (const [id, nom] of [
    ['water', "Boire 8 verres d'eau"],
    ['read', 'Lire au moins 20 pages'],
    ['med', 'Méditer'],
  ] as const) {
    const attendu = golden[`habit.${id}`];
    const l = ligne(page, nom);
    await expect(l.getByTestId('streak'), `série de ${id}`).toHaveText(String(attendu.streak));
    await expect(l, `taux et record de ${id}`).toContainText(
      `${attendu.pct30} % · Record ${attendu.best}`,
    );
  }

  /* La fréquence, la catégorie et l'objectif sont écrits. */
  await expect(ligne(page, "Boire 8 verres d'eau")).toContainText(
    'Quotidiennement · Santé · 8 verres',
  );
});

test('sept pastilles de 44 px, cochables, avec toast « Annuler »', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const eau = ligne(page, "Boire 8 verres d'eau");
  await expect(eau.getByRole('checkbox')).toHaveCount(7);
  for (const c of await eau.getByRole('checkbox').all()) {
    const boite = await c.boundingBox();
    expect(boite!.height).toBeGreaterThanOrEqual(44);
  }

  const mercredi = eau.getByRole('checkbox', { name: /mercredi 5 août/ });
  await expect(mercredi).not.toBeChecked();
  await mercredi.click();
  await expect(mercredi).toBeChecked();
  await expect(eau.getByTestId('streak')).toHaveText('3');

  const toast = page.getByRole('status').filter({ hasText: 'Habitude cochée' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect(mercredi).not.toBeChecked();

  /* Un jour non planifié ne se coche pas, un jour à venir non plus. */
  const film = ligne(page, 'Regarder un film');
  await expect(film.getByRole('checkbox', { name: /lundi 3 août/ })).toBeDisabled();
  await expect(film.getByRole('checkbox', { name: /vendredi 7 août/ })).toBeDisabled();
});

test('le résumé des sept derniers jours ne compte que des jours journalisés', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const resume = page.getByTestId('resume-semaine');
  await expect(resume).toContainText('7 derniers jours');
  await expect(resume).toContainText(/jours? complets?|aucun jour complet/);
  await expect(resume).toContainText(/partiels?/);
  await expect(resume).toContainText(/manqués?/);
});

test('archiver depuis la feuille de menu, annulable, et l’onglet Archivées suit', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE);

  const feuille = await menu(page, 'Méditer');
  await feuille.getByRole('button', { name: 'Archiver' }).click();
  await expect(page.getByRole('radio', { name: 'Actives · 5' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Archivées · 1' })).toBeVisible();

  const toast = page.getByRole('status').filter({ hasText: 'Habitude archivée' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('radio', { name: 'Actives · 6' })).toBeVisible();

  /* Archivée pour de bon : elle vit dans l'autre onglet, avec son historique. */
  await (await menu(page, 'Méditer')).getByRole('button', { name: 'Archiver' }).click();
  await page.getByRole('radio', { name: 'Archivées · 1' }).click();
  await expect(ligne(page, 'Méditer')).toBeVisible();
  await expect(ligne(page, 'Méditer').getByRole('checkbox')).toHaveCount(7);
  await (await menu(page, 'Méditer')).getByRole('button', { name: 'Désarchiver' }).click();
  await expect(page.getByText('Rien d’archivé')).toBeVisible();
});

test('la feuille de menu mène à l’éditeur, aux statistiques, et supprime après confirmation', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  await (await menu(page, 'Méditer')).getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByRole('dialog', { name: /Modifier/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await (await menu(page, 'Méditer')).getByRole('button', { name: 'Supprimer' }).click();
  const confirmation = page.getByRole('dialog').filter({ hasText: /Supprimer « Méditer »/ });
  await expect(confirmation).toContainText(/\d+ jours d’historique/);
  await confirmation.getByRole('button', { name: 'Garder' }).click();
  await expect(vue(page).locator('[data-habit]')).toHaveCount(6);

  await (await menu(page, 'Méditer')).getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(vue(page).locator('[data-habit]')).toHaveCount(5);
  await expect(page.getByRole('status').filter({ hasText: 'Habitude supprimée' })).toBeVisible();

  await (
    await menu(page, 'Courir au moins 3 km')
  )
    .getByRole('button', { name: 'Voir les statistiques' })
    .click();
  await expect(page).toHaveURL(/\/app\/stats/);
});

test('état vide : trois suggestions à un appui, aucune créée d’avance', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await expect(page.getByTestId('empty-state')).toContainText('Aucune habitude');
  await expect(vue(page).locator('[data-habit]')).toHaveCount(0);
  /* Rien à résumer : rien n'est affiché, donc rien n'est fabriqué. */
  await expect(page.getByTestId('resume-semaine')).toHaveCount(0);

  await page.getByRole('button', { name: 'Boire 8 verres d’eau' }).click();
  await expect(vue(page).locator('[data-habit]')).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'Actives · 1' })).toBeChecked();
  await expect(ligne(page, 'Boire 8 verres d’eau').getByTestId('streak')).toHaveText('0');
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
