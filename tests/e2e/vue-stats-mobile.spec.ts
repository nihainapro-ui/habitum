import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { ouvrirAvecDemo } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* Vue « Statistiques » sur TÉLÉPHONE — refonte mobile, P3 lot 2
   (`docs/handoff/10-ECARTS-P3-MOBILE.md` § 4).
   Période en segments, quatre indicateurs-liens, histogramme lisible au
   doigt, « Par habitude » en lignes. `vue-stats.spec.ts` éprouve les chiffres
   sur les deux formes. Horloge figée au mercredi 5 août 2026. */

const ROUTE = '/app/stats';

test.skip(({ isMobile }) => !isMobile, 'forme téléphone de la vue');

const vue = (page: Page) => page.getByTestId('stats-mobile');

test('la période se choisit sur des segments de 44 px, « 365 jours » compris', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const periode = page.getByRole('radiogroup', { name: 'Période' });
  await expect(periode.getByRole('radio')).toHaveText([
    '7 jours',
    '30 jours',
    '90 jours',
    '365 jours',
  ]);
  for (const segment of await periode.getByRole('radio').all()) {
    expect((await segment.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(periode.getByRole('radio', { name: '30 jours' })).toBeChecked();
});

test('les quatre indicateurs sont des liens vers l’écran qui les explique', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const destinations = {
    score: '/app/habits',
    parfaits: '/app/calendar',
    record: '/app/habits',
    focus: '/app/timer',
  };
  for (const [cle, href] of Object.entries(destinations)) {
    const lien = vue(page).locator(`a[data-kpi="${cle}"]`);
    await expect(lien).toHaveAttribute('href', new RegExp(`^${href}/?$`));
    expect((await lien.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  /* Le nom du lien porte le libellé ET la valeur. */
  await expect(
    vue(page).getByRole('link', { name: `Record : ${golden['habit.alc'].best}` }),
  ).toBeVisible();
  await expect(vue(page).getByRole('link', { name: 'Temps de focus : 2 h 18' })).toBeVisible();
});

test('le mois se lit au doigt, et jour par jour au clavier', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const graphique = vue(page).locator('[data-mois]');
  const lu = page.getByTestId('jour-choisi');
  await expect(graphique.locator('[data-jour]')).toHaveCount(31);
  await expect(lu).toHaveText('Touchez le graphique pour lire un jour.');

  /* Un appui sur la troisième colonne : le 3 août, un jour passé. */
  const boite = (await graphique.boundingBox())!;
  const colonne = boite.width / 31;
  await graphique.click({ position: { x: colonne * 2.5, y: 60 } });
  await expect(lu).toHaveText(/^lundi 3 août : \d+ sur \d+$/);
  await expect(graphique.locator('[data-actif]')).toHaveAttribute('data-jour', '2026-08-03');

  /* Jour par jour : deux boutons de 44 px, pour qui n'a pas de doigt à poser
     sur une colonne de 9 px — clavier, lecteur d'écran. */
  const suivant = vue(page).getByRole('button', { name: 'Jour suivant' });
  const precedent = vue(page).getByRole('button', { name: 'Jour précédent' });
  for (const b of [suivant, precedent]) {
    const cible = (await b.boundingBox())!;
    expect(Math.min(cible.width, cible.height)).toBeGreaterThanOrEqual(44);
  }
  await suivant.click();
  await expect(lu).toHaveText(/^mardi 4 août : /);
  await precedent.click();
  await precedent.click();
  await expect(lu).toHaveText(/^dimanche 2 août : /);

  /* Le 20 août n'a pas eu lieu : il le dit, sans chiffre. */
  await graphique.click({ position: { x: colonne * 19.5, y: 60 } });
  await expect(lu).toHaveText('jeudi 20 août : à venir');
});

test('sans jour lu, « jour précédent » part d’aujourd’hui', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  await vue(page).getByRole('button', { name: 'Jour précédent' }).click();
  /* L'horloge est figée au mercredi 5 août. */
  await expect(page.getByTestId('jour-choisi')).toHaveText(/^mercredi 5 août : /);
});

test('« Par habitude » : une ligne par habitude, du taux le plus haut au plus bas', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  const lignes = vue(page).locator('[data-score-row]');
  await expect(lignes).toHaveCount(6);

  const taux = (await lignes.getByTestId('pct').allTextContents()).map((t) =>
    Number.parseInt(t, 10),
  );
  expect([...taux].sort((a, b) => b - a)).toEqual(taux);
  expect(taux[0]).toBe(golden['habit.alc'].pct30);

  /* Série et record en clair, depuis les valeurs de référence. */
  const alc = golden['habit.alc'];
  await expect(lignes.first()).toContainText(`série ${alc.streak} j · record ${alc.best} j`);
  /* Aucun tableau à faire défiler de côté. */
  await expect(vue(page).locator('table')).toHaveCount(0);
});

test('la carte de chaleur montre trois mois, et le dit', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  await expect(vue(page).locator('[data-heatmap] [data-cell]')).toHaveCount(91);
  await expect(vue(page)).toContainText('3 derniers mois');
});

test('la répartition par catégorie est conservée', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });
  await expect(vue(page).getByRole('heading', { name: 'Répartition par catégorie' })).toBeVisible();
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
