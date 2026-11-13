import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Vue « Objectifs » sur TÉLÉPHONE — refonte mobile, P3 lot 2
   (`docs/handoff/10-ECARTS-P3-MOBILE.md` § 4).
   Segments En cours / Atteints → une carte par objectif, barre unie et repère
   de temps, jalons cochables de 44 px. `vue-goals.spec.ts` éprouve les chiffres
   sur les deux formes. Horloge figée au mercredi 5 août 2026. */

const ROUTE = '/app/goals';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

const vue = (page: Page) => page.getByTestId('goals-mobile');
const carte = (page: Page, nom: string) => vue(page).getByRole('article', { name: nom });

test('segments avec compteurs : quatre en cours, aucun atteint', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  await expect(page.getByRole('radio', { name: 'En cours · 4' })).toBeChecked();
  await expect(vue(page).locator('[data-goal]')).toHaveCount(4);

  await page.getByRole('radio', { name: 'Atteints · 0' }).click();
  await expect(vue(page).locator('[data-goal]')).toHaveCount(0);
  await expect(page.getByText('Aucun objectif atteint pour l’instant')).toBeVisible();
});

test('la carte dit le type, les dates et où en est le temps', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const club = carte(page, 'Lancer le club de lecture');
  await expect(club).toContainText('Jalons · Travail');
  await expect(club).toContainText('Depuis le 1 juin · échéance 15 sept.');
  /* 1ᵉʳ juin → 15 septembre = 106 jours ; le 5 août à 9 h en fait 65 passés. */
  await expect(club.getByTestId('elapsed')).toHaveText('Temps écoulé : 61 %');
  await expect(club.locator('[data-repere-temps]')).toHaveCount(1);
  await expect(club).toContainText('41 jours restants');
});

test('un jalon se coche sur sa ligne de 44 px, et s’annule', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const club = carte(page, 'Lancer le club de lecture');
  await expect(club.getByTestId('percent')).toHaveText('40 %');

  const jalon = club.getByRole('checkbox', { name: 'Jalon : Inviter 10 personnes' });
  await expect(jalon).not.toBeChecked();
  expect((await jalon.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  await jalon.click();
  await expect(jalon).toBeChecked();
  await expect(club.getByTestId('percent')).toHaveText('60 %');
  await expect(club.getByTestId('progress')).toHaveText('3 / 5');

  const toast = page.getByRole('status').filter({ hasText: 'Jalon atteint' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Annuler' }).click();
  await expect(jalon).not.toBeChecked();
  await expect(club.getByTestId('percent')).toHaveText('40 %');
});

test('trois jalons d’abord, les autres derrière « + n »', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const club = carte(page, 'Lancer le club de lecture');
  await expect(club.getByRole('checkbox')).toHaveCount(3);

  await club.getByRole('button', { name: '+ 2 autres jalons' }).click();
  await expect(club.getByRole('checkbox')).toHaveCount(5);
  await expect(
    club.getByRole('checkbox', { name: 'Jalon : Programme du trimestre' }),
  ).toBeVisible();

  await club.getByRole('button', { name: 'Réduire' }).click();
  await expect(club.getByRole('checkbox')).toHaveCount(3);
});

test('un objectif dont tous les jalons sont faits passe dans « Atteints »', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const club = carte(page, 'Lancer le club de lecture');
  await club.getByRole('button', { name: '+ 2 autres jalons' }).click();
  for (const nom of ['Inviter 10 personnes', 'Première séance', 'Programme du trimestre']) {
    await club.getByRole('checkbox', { name: `Jalon : ${nom}` }).click();
  }

  /* Il quitte « En cours » de lui-même : « atteint » se lit dans
     l'avancement, pas dans un drapeau. */
  await expect(page.getByRole('radio', { name: 'En cours · 3' })).toBeChecked();
  await page.getByRole('radio', { name: 'Atteints · 1' }).click();
  await expect(carte(page, 'Lancer le club de lecture').getByTestId('percent')).toHaveText('100 %');
  await expect(carte(page, 'Lancer le club de lecture')).toContainText('Atteint');
});

test('le nom ouvre la feuille : Modifier, Supprimer — et la suppression s’annule', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  await carte(page, '24 livres en 2026').locator('[data-name]').click();
  const feuille = page.getByTestId('feuille-menu');
  await expect(feuille).toBeVisible();
  await expect(feuille.getByRole('button')).toHaveText(['Modifier', 'Supprimer']);

  await feuille.getByRole('button', { name: 'Supprimer' }).click();
  await expect(vue(page).locator('[data-goal]')).toHaveCount(3);

  await page
    .getByRole('status')
    .filter({ hasText: 'Objectif supprimé' })
    .getByRole('button', { name: 'Annuler' })
    .click();
  await expect(vue(page).locator('[data-goal]')).toHaveCount(4);
});

test('le « + » de l’en-tête crée un objectif, sans feuille de choix', async ({ page }) => {
  /* Il ouvrait la feuille de choix, qui ne propose pas « objectif ». */
  await ouvrirVierge(page, ROUTE);

  await page.getByTestId('header-mobile').getByRole('button', { name: 'Nouveau' }).click();
  await expect(page.getByLabel('Intitulé')).toBeVisible();
  await expect(page.getByTestId('feuille-creation')).toHaveCount(0);
});

test('la barre est unie — le dégradé reste au bureau', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const fonds = await vue(page)
    .locator('[data-goal] span[aria-hidden="true"] > span')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage));
  expect(fonds.length).toBeGreaterThan(0);
  expect(fonds.every((f) => f === 'none')).toBe(true);
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

test('rien de sérieux pour axe', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
