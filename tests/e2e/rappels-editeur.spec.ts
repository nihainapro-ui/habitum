import { expect, test, type Page } from '@playwright/test';
import { attendreHydratation, ouvrirVierge } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* ============================================================================
   Le dialogue de rappel — heure, type, calendrier. Spec du 2026-09-16.

   Ce que ce fichier éprouve, et que l'unitaire ne peut pas :

   1. le dialogue s'ouvre depuis les éditeurs, propose le BON calendrier à
      chaque entité — « certains jours » à ce qui revient, « jours avant » à ce
      qui a une échéance — et écrit ce qu'on y règle ;
   2. le réglage est ÉCRIT, pas seulement affiché : on rouvre l'éditeur après
      rechargement ;
   3. le dialogue vit dans un PORTAIL, hors de `<main>` : le filet de mesure
      des vues ne le voit pas. Il apporte donc sa propre mesure, à 390 px.
   ========================================================================= */

const dialogue = (page: Page) => page.getByRole('dialog', { name: 'Nouveau rappel' });

/** Sur bureau, les rappels vivent dans un onglet ; sur téléphone (refonte
 *  mobile, PDF p. 7), l'éditeur d'habitude est un seul écran et les rappels y
 *  sont directement. On clique l'onglet s'il existe, et c'est tout. */
const versRappels = async (page: Page) => {
  const onglet = page.getByRole('tab', { name: 'Rappels' });
  if (await onglet.count()) await onglet.click();
};

test('une habitude gagne un rappel « alarme, certains jours », et le garde', async ({ page }) => {
  await ouvrirVierge(page, '/app/habits');
  await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();
  await page.getByLabel('Nom', { exact: true }).fill('Factures');

  await versRappels(page);
  await page.getByRole('button', { name: 'Ajouter un rappel' }).click();
  await expect(dialogue(page)).toBeVisible();

  /* Une habitude REVIENT : « certains jours » a un sens, « jours avant » non. */
  await expect(
    dialogue(page).getByRole('radio', { name: 'Certains jours de la semaine' }),
  ).toBeVisible();
  await expect(dialogue(page).getByRole('radio', { name: 'Jours avant' })).toHaveCount(0);

  await dialogue(page).getByRole('radio', { name: 'Alarme' }).click();
  await expect(dialogue(page).getByText(/Ce n’est pas un réveil plein écran/)).toBeVisible();

  await dialogue(page).getByRole('radio', { name: 'Certains jours de la semaine' }).click();
  /* Aucun jour choisi : confirmer est refusé — un rappel qui ne sonnerait
     jamais ne doit pas pouvoir s'écrire sans le dire. */
  await expect(dialogue(page).getByRole('button', { name: 'Confirmer' })).toBeDisabled();
  await dialogue(page).getByRole('checkbox').first().click();
  await dialogue(page).getByRole('button', { name: 'Confirmer' }).click();

  const ligne = page.locator('[data-rappels] li').first();
  await expect(ligne).toContainText('12:00');
  await expect(ligne).toContainText('Alarme');
  await expect(ligne).toContainText('1 jour(s) par semaine');

  /* `.last()` : sur téléphone, l'éditeur porte deux « Enregistrer » (en-tête et pied). */
  await page.getByRole('button', { name: 'Enregistrer' }).last().click();
  await expect(page.getByRole('article', { name: 'Factures' })).toBeVisible();

  /* ÉCRIT, pas affiché : rechargement, puis réouverture. */
  await page.reload();
  await attendreHydratation(page);
  await page.getByRole('button', { name: 'Modifier Factures' }).click();
  await versRappels(page);
  await expect(page.locator('[data-rappels] li').first()).toContainText('Alarme');
});

test('une tâche datée se voit proposer « jours avant », et la veille est prête', async ({
  page,
}) => {
  await ouvrirVierge(page, '/app/tasks');
  await page.getByRole('button', { name: 'Nouveau' }).first().click();
  await page.getByLabel('Nom', { exact: true }).fill('Dentiste');

  await page.getByRole('tab', { name: 'Planning' }).click();
  await page.getByRole('button', { name: 'Ajouter un rappel' }).click();
  await expect(dialogue(page)).toBeVisible();

  /* Une tâche non récurrente a une ÉCHÉANCE et ne revient pas. */
  await expect(dialogue(page).getByRole('radio', { name: 'Jours avant' })).toBeVisible();
  await expect(
    dialogue(page).getByRole('radio', { name: 'Certains jours de la semaine' }),
  ).toHaveCount(0);

  await dialogue(page).getByRole('radio', { name: 'Jours avant' }).click();
  /* « La veille » est le choix par défaut : c'est celui qu'on veut neuf fois
     sur dix, et un « jours avant » sans aucun jour serait refusé. */
  await expect(dialogue(page).getByRole('checkbox', { name: 'La veille' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await dialogue(page).getByRole('button', { name: 'Confirmer' }).click();

  const ligne = page.locator('[data-rappels] li').first();
  await expect(ligne).toContainText('Notification');
  await expect(ligne).toContainText('jours avant : 1');
});

test('le dialogue ne déborde pas à 390 px — il vit hors du filet des vues', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await ouvrirVierge(page, '/app/habits');
  await page.getByRole('button', { name: 'Nouvelle habitude' }).first().click();
  await versRappels(page);
  await page.getByRole('button', { name: 'Ajouter un rappel' }).click();
  await expect(dialogue(page)).toBeVisible();

  /* Tout DÉPLIÉ : le sélecteur de jours n'existe que sous « certains jours »,
     et un élément jamais rendu n'est jamais mesuré. */
  await dialogue(page).getByRole('radio', { name: 'Certains jours de la semaine' }).click();
  await expect(dialogue(page).getByRole('checkbox').first()).toBeVisible();

  const { releve, balayes } = await releverDebordements(page, '[role="dialog"]');
  expect(balayes, 'la mesure est suspecte : trop peu d’éléments balayés').toBeGreaterThan(15);
  expect(releve).toEqual([]);
});
