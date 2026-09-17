import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { HABIT_GOAL_KINDS } from '@/lib/domain';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Éditeur d'habitude sur TÉLÉPHONE — refonte mobile, PDF p. 7.

   Un seul écran progressif : Nom → Catégorie + Type → Jours (sept cases de
   44 px, phrase de confirmation) → Rappel → « Réglages avancés » repliés →
   Supprimer, séparé, confirmé avec un chiffre. « Enregistrer » ancré en bas
   ET dans l'en-tête ; « Annuler » avec des modifications → « Abandonner ? ».
   `editeur.spec.ts` garde la forme de bureau, à quatre onglets. */

const ROUTE = '/app/habits';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de l’éditeur');

const ouvrirNouvelle = async (page: import('@playwright/test').Page) => {
  await page.getByTestId('header-mobile').getByRole('button', { name: 'Nouveau' }).click();
  await expect(page.getByTestId('editeur-habitude-mobile')).toBeVisible();
};

test('un seul écran : nom, catégorie et type, sept jours, rappel, réglages avancés repliés', async ({
  page,
}) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);

  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByLabel('Nom', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Catégorie' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Type d’objectif' })).toBeVisible();

  const jours = page.getByTestId('jours-44').getByRole('checkbox');
  await expect(jours).toHaveCount(7);
  for (const jour of await jours.all()) {
    const boite = await jour.boundingBox();
    expect(boite!.width).toBeGreaterThanOrEqual(44);
    expect(boite!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByTestId('phrase-jours')).toHaveText('Tous les jours · 7 jours sur 7');

  await expect(page.getByRole('switch', { name: 'Me rappeler' })).toBeVisible();
  await expect(page.getByTestId('reglages-avances')).toHaveCount(0);
  await page.getByRole('button', { name: /Réglages avancés/ }).click();
  await expect(page.getByTestId('reglages-avances')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Répétition' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Notes' })).toBeVisible();
});

test('la phrase sous les jours suit la sélection', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);
  const jours = page.getByTestId('jours-44').getByRole('checkbox');

  await jours.nth(5).click();
  await jours.nth(6).click();
  await expect(page.getByTestId('phrase-jours')).toHaveText('En semaine · 5 jours sur 7');

  for (let i = 0; i < 5; i++) await jours.nth(i).click();
  await expect(page.getByTestId('phrase-jours')).toHaveText('Aucun jour choisi');
  await jours.nth(5).click();
  await jours.nth(6).click();
  await expect(page.getByTestId('phrase-jours')).toHaveText('Le week-end · 2 jours sur 7');
});

test('le sélecteur de type propose les SEPT types', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);
  await page.getByRole('combobox', { name: 'Type d’objectif' }).click();
  const options = await page
    .getByRole('listbox', { name: 'Type d’objectif' })
    .getByRole('option')
    .count();
  expect(options).toBe(HABIT_GOAL_KINDS.length);
});

test('sans nom, « Enregistrer » est désactivé ; avec, l’habitude est créée et un toast le dit', async ({
  page,
}) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);

  const enregistrer = page.getByRole('button', { name: 'Enregistrer' });
  await expect(enregistrer).toHaveCount(2);
  for (const b of await enregistrer.all()) await expect(b).toBeDisabled();

  await page.getByLabel('Nom', { exact: true }).fill('Étirements du matin');
  for (const b of await enregistrer.all()) await expect(b).toBeEnabled();
  await enregistrer.last().click();

  await expect(page.getByRole('article', { name: 'Étirements du matin' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Habitude enregistrée');
});

test('le bouton « Enregistrer » est ancré en bas, visible sans défiler', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);
  await page.getByRole('button', { name: /Réglages avancés/ }).click();

  const bouton = page.getByRole('button', { name: 'Enregistrer' }).last();
  const boite = await bouton.boundingBox();
  const hauteur = page.viewportSize()!.height;
  expect(boite!.y + boite!.height).toBeLessThanOrEqual(hauteur + 1);
  expect(boite!.height).toBeGreaterThanOrEqual(44);
});

test('annuler avec des modifications demande « Abandonner ? » ; sans, ferme tout de suite', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE);
  const avant = await page.getByRole('article').count();

  await ouvrirNouvelle(page);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByTestId('editeur-habitude-mobile')).toHaveCount(0);

  await ouvrirNouvelle(page);
  await page.getByLabel('Nom', { exact: true }).fill('Brouillon jeté');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  const confirmation = page.getByTestId('feuille-confirmation');
  await expect(confirmation).toContainText('Abandonner les modifications ?');
  await confirmation.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Brouillon jeté');

  /* Échap passe par la même garde. */
  await page.keyboard.press('Escape');
  await page
    .getByTestId('feuille-confirmation')
    .getByRole('button', { name: 'Abandonner' })
    .click();
  await expect(page.getByTestId('editeur-habitude-mobile')).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(avant);
  await expect(page.getByText('Brouillon jeté')).toHaveCount(0);
});

test('la suppression est séparée, confirmée avec le nombre de jours, puis annulable', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const avant = await page.getByRole('article').count();

  await page.getByRole('button', { name: 'Méditer', exact: true }).click();
  await expect(page.getByTestId('editeur-habitude-mobile')).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer l’habitude…' }).click();

  const confirmation = page.getByTestId('feuille-confirmation');
  await expect(confirmation).toContainText(/Supprimer « Méditer » et \d+ jours d’historique \?/);
  await confirmation.getByRole('button', { name: 'Garder' }).click();
  await expect(page.getByTestId('editeur-habitude-mobile')).toBeVisible();

  await page.getByRole('button', { name: 'Supprimer l’habitude…' }).click();
  await page.getByTestId('feuille-confirmation').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('article')).toHaveCount(avant - 1);
  await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('article')).toHaveCount(avant);
});

test('une habitude « jours précis » sans jour est refusée', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);
  await page.getByLabel('Nom', { exact: true }).fill('Sans jour');
  for (const jour of await page.getByTestId('jours-44').getByRole('checkbox').all())
    await jour.click();
  await page.getByRole('button', { name: 'Enregistrer' }).last().click();
  await expect(page.getByTestId('phrase-jours')).toHaveText('Choisissez au moins un jour.');
});

test('modifier une habitude existante enregistre le nouveau nom', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE);
  await page.getByRole('button', { name: 'Méditer', exact: true }).click();
  await page.getByLabel('Nom', { exact: true }).fill('Méditation guidée');
  await page.getByRole('button', { name: 'Enregistrer' }).first().click();
  await expect(page.getByRole('article', { name: 'Méditation guidée' })).toBeVisible();
});

test('l’en-tête de l’éditeur s’écarte du bord haut, et rien ne déborde à 360 et 390 px', async ({
  page,
}) => {
  for (const largeur of [360, 390]) {
    await page.setViewportSize({ width: largeur, height: 780 });
    await ouvrirVierge(page, ROUTE);
    await ouvrirNouvelle(page);
    await page.getByRole('button', { name: /Réglages avancés/ }).click();

    const titre = page
      .getByTestId('editeur-habitude-mobile')
      .getByRole('heading', { name: 'Nouvelle habitude' });
    const boite = await titre.boundingBox();
    expect(boite!.y, `titre collé au bord à ${largeur}px`).toBeGreaterThanOrEqual(4);

    const { releve } = await releverDebordements(page, '[role="dialog"]');
    expect(releve, `éditeur à ${largeur}px`).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

test('accessible', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await ouvrirNouvelle(page);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
