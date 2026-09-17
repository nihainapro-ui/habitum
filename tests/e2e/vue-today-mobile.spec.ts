import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ecrireEnBase, JOUR_FIGE, ouvrir, ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Vue « Aujourd'hui » sur TÉLÉPHONE — refonte mobile, PDF p. 5.
   Le jeu de démonstration est daté du mercredi 5 août 2026.

   `vue-today.spec.ts` éprouve la forme de bureau et se retire sous 768 px ;
   ce fichier fait l'inverse. Les règles du domaine — `limit` jamais réussi
   d'avance, le futur non cochable, le filtre — y sont rejouées dans la forme
   mobile : c'est la même liste, ce sont d'autres commandes. */

const ROUTE = '/app/today';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

/* Tout est cherché DANS la forme mobile : la forme de bureau est rendue
   aussi, masquée par le CSS, et un localisateur non borné la verrait. */
const vue = (page: Page) => page.getByTestId('today-mobile');
const lignes = (page: Page) => vue(page).locator('[data-queue] > [data-row]');
const feuilleActions = async (page: Page, nom: string) => {
  await vue(page).locator('[data-row]').filter({ hasText: nom }).locator('[data-name]').click();
  const feuille = page.getByTestId('feuille-actions');
  await expect(feuille).toBeVisible();
  return feuille;
};

test('la semaine montre sept jours entiers, le jour figé en cours', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  const semaine = page.getByTestId('semaine-strip');
  await expect(semaine.getByRole('button')).toHaveCount(7);
  await expect(semaine.locator('[data-jour="2026-08-03"]')).toBeVisible();
  await expect(semaine.locator('[data-jour="2026-08-09"]')).toBeVisible();
  await expect(semaine.locator('[data-jour="2026-08-05"]')).toHaveAttribute('aria-current', 'date');

  /* Sept cellules ÉGALES, jamais tronquées : chacune fait au moins 44 px. */
  for (const cellule of await semaine.getByRole('button').all()) {
    const boite = await cellule.boundingBox();
    expect(boite!.width).toBeGreaterThanOrEqual(44);
    expect(boite!.height).toBeGreaterThanOrEqual(44);
  }
  const { releve } = await releverDebordements(page, '[data-testid="semaine-strip"]');
  expect(releve).toEqual([]);
});

test('les segments portent les compteurs, et le filtre s’applique', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  /* Huit entrées : six à l'heure dans la liste, deux sans heure sous
     « Plus tard ». Les compteurs comptent la JOURNÉE, pas ce qui est déplié. */
  await expect(page.getByRole('radio', { name: 'Tout · 8' })).toBeChecked();
  await expect(lignes(page)).toHaveCount(6);
  await page.getByRole('radio', { name: 'Habitudes · 5' }).click();
  await expect(lignes(page)).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Plus tard · 2/ })).toBeVisible();
  await page.getByRole('radio', { name: 'Tâches · 3' }).click();
  await expect(lignes(page)).toHaveCount(3);
  await expect(page.getByRole('button', { name: /Plus tard/ })).toHaveCount(0);
  /* Les compteurs ne bougent pas avec le filtre. */
  await expect(page.getByRole('radio', { name: 'Habitudes · 5' })).toBeVisible();
});

test('le pas à pas fait 44 px et journalise la valeur du jour', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  /* « Courir » est à l'heure (07:00), donc dans la liste et non sous
     « Plus tard » ; le jeu de démonstration y journalise 3 km sur 3. */
  const plus = page.getByRole('button', { name: /Augmenter : Courir/ });
  const boite = await plus.boundingBox();
  expect(boite!.width).toBeGreaterThanOrEqual(44);
  expect(boite!.height).toBeGreaterThanOrEqual(44);

  const ligne = lignes(page).filter({ hasText: 'Courir au moins 3 km' });
  await expect(ligne.getByText('3/3')).toBeVisible();
  await plus.click();
  await expect(ligne.getByText('4/3')).toBeVisible();
  await page.getByRole('button', { name: /Diminuer : Courir/ }).click();
  await expect(ligne.getByText('3/3')).toBeVisible();
});

test('cocher pose un toast « Annuler », et l’annulation décoche', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  /* « Courir » est faite au 5 août : on la DÉCOCHE, puis on annule. */
  const courir = page.getByRole('checkbox', { name: 'Courir au moins 3 km' });
  await expect(courir).toBeChecked();
  const boite = await courir.boundingBox();
  expect(boite!.width).toBeGreaterThanOrEqual(44);

  await courir.click();
  await expect(courir).not.toBeChecked();
  const toast = page.getByRole('status').filter({ hasText: 'Habitude décochée' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect(courir).toBeChecked();
});

test("une habitude 'limit' n'est jamais réussie d'avance", async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  await ecrireEnBase(page, {
    habits: [
      {
        id: 'plafond',
        name: 'Pas plus de 2 cafés',
        category: 'health',
        goal: { kind: 'limit', target: 2, step: 1, unit: 'cafés' },
        mode: 'dow',
        days: [0, 1, 2, 3, 4, 5, 6],
        subItems: [],
        reminders: ['06:00'],
        archived: false,
        note: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });
  await ouvrir(page, ROUTE);

  const plafond = page.getByRole('checkbox', { name: 'Pas plus de 2 cafés' });
  await expect(plafond).not.toBeChecked();
  const plus = page.getByRole('button', { name: /Augmenter : Pas plus de 2 cafés/ });
  await plus.click();
  await expect(plafond).toBeChecked();
  await plus.click();
  await expect(plafond).toBeChecked();
  await plus.click();
  await expect(plafond).not.toBeChecked();
});

test('une habitude de durée lance Focus sur elle', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);

  await page.getByRole('button', { name: 'Lancer une session : Méditer' }).click();
  await expect(page).toHaveURL(/\/app\/timer/);
  /* La cible du minuteur est bien l'habitude glissée. */
  await expect(page.getByRole('radio', { name: 'Méditer' })).toBeChecked();
});

test('la feuille d’actions porte les actions de l’habitude, dont « Modifier » en premier', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE);
  const feuille = await feuilleActions(page, 'Méditer');

  const boutons = feuille.getByRole('button');
  await expect(boutons.first()).toHaveText('Modifier');
  for (const action of [
    /* « Méditer » est faite au 5 août : la feuille propose de la défaire. */
    'Marquer non fait',
    'Saisir la valeur',
    'Lancer une session de focus',
    'Ignorer',
    'Ajouter une note',
    'Supprimer',
  ]) {
    await expect(feuille.getByRole('button', { name: action })).toBeVisible();
  }
  await expect(feuille.getByRole('button', { name: 'Reprogrammer' })).toHaveCount(0);

  await feuille.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByRole('dialog', { name: 'Modifier l’habitude' })).toBeVisible();
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Méditer');
});

test('la feuille d’actions d’une tâche propose le report, pas « Ignorer »', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const feuille = await feuilleActions(page, 'Cours de guitare');
  await expect(feuille.getByRole('button', { name: 'Reprogrammer' })).toBeVisible();
  await expect(feuille.getByRole('button', { name: 'Ignorer' })).toHaveCount(0);
});

test('la saisie directe écrit la valeur du jour', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const feuille = await feuilleActions(page, 'Courir au moins 3 km');
  await feuille.getByRole('button', { name: 'Saisir la valeur' }).click();
  await feuille.getByLabel('Valeur du jour').fill('1');
  await feuille.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByRole('checkbox', { name: 'Courir au moins 3 km' })).not.toBeChecked();
  await expect(lignes(page).filter({ hasText: 'Courir' }).getByText('1/3')).toBeVisible();
});

test('supprimer demande une confirmation chiffrée, puis reste annulable', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const avant = await lignes(page).count();

  const feuille = await feuilleActions(page, 'Méditer');
  await feuille.getByRole('button', { name: 'Supprimer' }).click();

  const confirmation = page.getByTestId('feuille-confirmation');
  await expect(confirmation).toBeVisible();
  /* La conséquence est CHIFFRÉE — « et 180 jours d'historique » — et le
     chiffre vient du journal, pas d'une estimation. */
  await expect(confirmation).toContainText(/Supprimer « Méditer » et \d+ jours d’historique \?/);
  await confirmation.getByRole('button', { name: 'Garder' }).click();
  await expect(lignes(page)).toHaveCount(avant);

  await (await feuilleActions(page, 'Méditer')).getByRole('button', { name: 'Supprimer' }).click();
  await page.getByTestId('feuille-confirmation').getByRole('button', { name: 'Supprimer' }).click();
  await expect(lignes(page)).toHaveCount(avant - 1);
  await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
  await expect(lignes(page)).toHaveCount(avant);
});

test('reporter une tâche depuis la feuille la sort de la journée', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const chien = lignes(page).filter({ hasText: 'Promener le chien' });
  await (
    await feuilleActions(page, 'Promener le chien')
  )
    .getByRole('button', { name: 'Reprogrammer' })
    .click();
  await expect(chien).toHaveCount(0);
  await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
  await expect(chien).toHaveCount(1);
});

test('glisser une tâche à droite la reporte à demain', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const chien = lignes(page).filter({ hasText: 'Promener le chien' });
  const boite = (await chien.boundingBox())!;
  const y = boite.y + boite.height / 2;
  const x0 = boite.x + 120;

  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + i * 15, y);
  await page.mouse.up();

  await expect(chien).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Reportée à demain');
});

test('le passé se corrige avec un bandeau, le futur attend', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const semaine = page.getByTestId('semaine-strip');

  await semaine.locator('[data-jour="2026-08-04"]').click();
  await expect(page.getByTestId('bandeau-passe')).toContainText(/4 août/);
  await expect(page.getByRole('checkbox', { name: 'Méditer' })).toBeEnabled();

  await semaine.locator('[data-jour="2026-08-06"]').click();
  await expect(page.getByTestId('bandeau-passe')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Méditer' })).toBeDisabled();
  await expect(page.getByText('Pas encore').first()).toBeVisible();
});

test('les flèches du clavier changent de jour, jusqu’à changer de semaine', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const semaine = page.getByTestId('semaine-strip');
  await semaine.locator('[aria-current="date"]').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(semaine.locator('[data-jour="2026-08-10"]')).toHaveAttribute('aria-current', 'date');
  await expect(semaine.locator('[data-jour="2026-08-16"]')).toBeVisible();
});

test('« Plus tard » replie les entrées sans heure, avec leur compte', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  /* Le jeu de démonstration : six entrées à l'heure, deux sans. */
  const repli = page.getByRole('button', { name: /Plus tard · 2/ });
  await expect(repli).toBeVisible();
  await expect(lignes(page)).toHaveCount(6);
  await repli.click();
  await expect(vue(page).locator('[data-queue-later] > [data-row]')).toHaveCount(2);
  await expect(vue(page).getByText("Boire 8 verres d'eau")).toBeVisible();
});

test('journée parfaite : un jour où tout est fait le dit en tête', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await ecrireEnBase(page, {
    habits: [
      {
        id: 'seule',
        name: 'Une seule habitude',
        category: 'mind',
        goal: { kind: 'check', target: 1, step: 1, unit: '' },
        mode: 'dow',
        days: [0, 1, 2, 3, 4, 5, 6],
        subItems: [],
        reminders: [],
        archived: false,
        note: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });
  await ouvrir(page, ROUTE);
  await expect(page.getByTestId('journee-parfaite')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Une seule habitude' }).click();
  await expect(page.getByTestId('journee-parfaite')).toBeVisible();
});

test('état vide : « Journée libre » et une action', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await expect(page.getByText('Journée libre')).toBeVisible();
  await page.getByRole('button', { name: 'Planifier une habitude' }).click();
  await expect(page.getByRole('dialog', { name: 'Nouvelle habitude' })).toBeVisible();
});

test('les sous-tâches se cochent une par une', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  await ecrireEnBase(page, {
    tasks: [
      {
        id: 'sous',
        name: 'Préparer le sac',
        category: 'home',
        date: JOUR_FIGE,
        time: '08:00',
        duration: 30,
        priority: 2,
        done: false,
        subTasks: [
          { label: 'Chaussures', done: true },
          { label: 'Gourde', done: false },
          { label: 'Clés', done: false },
        ],
        note: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });
  await ouvrir(page, ROUTE);
  const ligne = lignes(page).filter({ hasText: 'Préparer le sac' });
  await expect(ligne.getByText('1/3')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Gourde' }).click();
  await expect(ligne.getByText('2/3')).toBeVisible();
});

test('aucun texte coupé à 360 et 390 px', async ({ page }) => {
  for (const largeur of [360, 390]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await ouvrirAvecDemo(page, ROUTE);
    const { releve } = await releverDebordements(page, 'main');
    expect(releve, `main à ${largeur}px`).toEqual([]);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(deborde).toBe(false);
  }
});

test('accessible', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
