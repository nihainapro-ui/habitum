import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ecrireEnBase, ouvrir, ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Vue « Tâches » sur TÉLÉPHONE — refonte mobile, PDF p. 8.
   Segments À faire / Faites → sections par échéance dans une seule carte →
   liste de courses repliée. `vue-tasks.spec.ts` garde la forme de bureau.
   Jeu de démonstration au mercredi 5 août 2026 : t2/t3 aujourd'hui, t7
   demain, t4/t5 cette semaine, t6 plus tard, t1 et t8 faites. */

const ROUTE = '/app/tasks';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

const vue = (page: Page) => page.getByTestId('tasks-mobile');
const ligne = (page: Page, nom: string) =>
  vue(page)
    .locator('[data-task]')
    .filter({ has: page.locator('[data-name]', { hasText: nom }) });
const menu = async (page: Page, nom: string) => {
  await ligne(page, nom).locator('[data-name]').click();
  const feuille = page.getByTestId('feuille-menu');
  await expect(feuille).toBeVisible();
  return feuille;
};

test('segments avec compteurs, groupes par échéance, faites à part', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await expect(page.getByRole('radio', { name: 'À faire · 6' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Faites · 2' })).toBeVisible();

  await expect(
    page.getByRole('region', { name: "Aujourd'hui" }).locator('[data-task]'),
  ).toHaveCount(2);
  await expect(page.getByRole('region', { name: 'Demain' }).locator('[data-task]')).toHaveCount(1);
  await expect(
    page.getByRole('region', { name: 'Cette semaine' }).locator('[data-task]'),
  ).toHaveCount(2);
  await expect(page.getByRole('region', { name: 'Plus tard' }).locator('[data-task]')).toHaveCount(
    1,
  );

  await page.getByRole('radio', { name: 'Faites · 2' }).click();
  await expect(vue(page).locator('[data-task]')).toHaveCount(2);
  await expect(ligne(page, 'Réunion de travail')).toBeVisible();
});

test('la ligne écrit la priorité, la date, la récurrence — jamais la couleur seule', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE);

  const chien = ligne(page, 'Promener le chien');
  await expect(chien).toContainText('priorité basse');
  await expect(chien).toContainText("Aujourd'hui");
  await expect(chien).toContainText('⟳ Quotidienne');
  await expect(chien).toContainText('20:00');

  await expect(ligne(page, 'Rédiger le chapitre 4')).toContainText('Demain');
  await expect(ligne(page, 'Payer le loyer')).toContainText('⟳ Mensuelle');
  await expect(ligne(page, 'Préparer la revue trimestrielle')).toContainText('1/3');
});

test('une tâche en retard reste dans Aujourd’hui, et le dit en toutes lettres', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE);
  await ecrireEnBase(page, {
    tasks: [
      {
        id: 'retard',
        name: 'Relancer le fournisseur',
        category: 'work',
        date: '2026-08-03',
        duration: 60,
        priority: 2,
        done: false,
        subTasks: [],
        note: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });
  await ouvrir(page, ROUTE);

  const retard = ligne(page, 'Relancer le fournisseur');
  await expect(
    page.getByRole('region', { name: "Aujourd'hui" }).locator('[data-task]'),
  ).toHaveCount(3);
  await expect(retard.locator('[data-overdue]')).toHaveText(/en retard/);
  await expect(retard).toContainText('lun. 3 août');
  await expect(page.getByRole('region', { name: 'En retard' })).toHaveCount(0);

  /* Reporter à demain : c'est le lendemain d'AUJOURD'HUI, pas de l'échéance. */
  await (
    await menu(page, 'Relancer le fournisseur')
  )
    .getByRole('button', { name: 'Reporter' })
    .click();
  await page.getByTestId('feuille-report').getByRole('button', { name: 'Demain' }).click();
  await expect(page.getByRole('region', { name: 'Demain' }).locator('[data-task]')).toHaveCount(2);
  await expect(retard.locator('[data-overdue]')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Replanifié' })).toBeVisible();
});

test('cocher fait 44 px, pose un toast « Annuler », et passe la tâche dans Faites', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE);

  const guitare = page.getByRole('checkbox', { name: 'Cours de guitare' });
  const boite = await guitare.boundingBox();
  expect(boite!.width).toBeGreaterThanOrEqual(44);
  expect(boite!.height).toBeGreaterThanOrEqual(44);

  await guitare.click();
  await expect(page.getByRole('radio', { name: 'À faire · 5' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Faites · 3' })).toBeVisible();
  const toast = page.getByRole('status').filter({ hasText: 'Tâche cochée' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('radio', { name: 'À faire · 6' })).toBeVisible();
});

test('les sous-tâches se cochent en place', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const revue = ligne(page, 'Préparer la revue trimestrielle');
  await expect(revue).toContainText('1/3');
  await revue.getByRole('checkbox', { name: 'Relire le rapport' }).click();
  await expect(revue).toContainText('2/3');
});

test('reporter à un jour choisi passe par la grille du mois', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await (await menu(page, 'Cours de guitare')).getByRole('button', { name: 'Reporter' }).click();
  const feuille = page.getByTestId('feuille-report');
  await feuille.getByRole('button', { name: 'Choisir un jour' }).click();
  await feuille.locator('[data-jour="2026-08-20"]').click();
  await expect(feuille).toBeHidden();
  await expect(page.getByRole('region', { name: 'Plus tard' }).locator('[data-task]')).toHaveCount(
    2,
  );
  await expect(ligne(page, 'Cours de guitare')).toContainText('jeu. 20 août');
});

test('note et suppression depuis la feuille de menu', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await (
    await menu(page, 'Cours de guitare')
  )
    .getByRole('button', { name: 'Ajouter une note' })
    .click();
  const note = page.getByTestId('feuille-note');
  await note.getByRole('textbox').fill('Apporter le médiator');
  await note.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(note).toBeHidden();
  await (
    await menu(page, 'Cours de guitare')
  )
    .getByRole('button', { name: 'Ajouter une note' })
    .click();
  await expect(page.getByTestId('feuille-note').getByRole('textbox')).toHaveValue(
    'Apporter le médiator',
  );
  await page.keyboard.press('Escape');

  await (await menu(page, 'Cours de guitare')).getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Garder' }).click();
  await expect(ligne(page, 'Cours de guitare')).toBeVisible();

  await (await menu(page, 'Cours de guitare')).getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(ligne(page, 'Cours de guitare')).toHaveCount(0);
  await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
  await expect(ligne(page, 'Cours de guitare')).toBeVisible();
});

test('la liste de courses est repliée sous son compte, et reste complète', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  const bouton = page.getByRole('button', { name: /Liste de courses · 7/ });
  await expect(page.locator('[data-shopping]')).toHaveCount(0);
  await bouton.click();
  const articles = page.locator('[data-shopping] > li');
  await expect(articles).toHaveCount(7);

  await page.getByLabel('Ajouter un article').fill('Café');
  await page.keyboard.press('Enter');
  await expect(articles).toHaveCount(8);
  await expect(page.getByRole('button', { name: /Liste de courses · 8/ })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Café' }).click();
  await expect(page.getByRole('checkbox', { name: 'Café' })).toBeChecked();
});

test('états vides : aucune tâche, tout est fait, aucune terminée', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await expect(page.getByTestId('empty-state')).toContainText('Aucune tâche');
  await expect(page.getByTestId('empty-state')).not.toContainText('Tout est fait');
  await page.getByRole('radio', { name: 'Faites · 0' }).click();
  await expect(page.getByTestId('empty-state')).toContainText('Aucune tâche');

  await page.getByRole('radio', { name: 'À faire · 0' }).click();
  await page.getByRole('button', { name: 'Nouvelle tâche' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  await ecrireEnBase(page, {
    tasks: [
      {
        id: 'faite',
        name: 'Déjà faite',
        category: 'home',
        date: '2026-08-05',
        duration: 60,
        priority: 1,
        done: true,
        subTasks: [],
        note: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });
  await ouvrir(page, ROUTE);
  await expect(page.getByTestId('empty-state')).toContainText('Tout est fait');
  await page.getByRole('radio', { name: 'Faites · 1' }).click();
  await expect(ligne(page, 'Déjà faite')).toBeVisible();
});

test('aucun texte coupé à 360 et 390 px', async ({ page }) => {
  for (const largeur of [360, 390]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: /Liste de courses/ }).click();
    const { releve } = await releverDebordements(page, 'main');
    expect(releve, `main à ${largeur}px`).toEqual([]);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde).toBe(false);
  }
});

test('accessible, dans les trois thèmes', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
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
