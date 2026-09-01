import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vues « Paramètres » et « Profil » — 05-SPEC-VUES.md § 11 et 12,
   plan 5 tâche 5.11. */

test.describe('settings', () => {
  const ROUTE = '/app/settings';

  /* T4.4 — le réglage `cloud` ne gouvernait aucun nuage. Il ne doit plus
     apparaître, et la ligne qui le remplace dit où vivent les données. */
  test('aucun réglage ne prétend gérer un nuage', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByText(/cloud/i)).toHaveCount(0);
    await expect(page.getByText('Sauvegarde locale sur cet appareil')).toBeVisible();
  });

  /* La synchronisation est FACULTATIVE, et ce déploiement n'a pas de relais
     (`NEXT_PUBLIC_SYNC_URL` absente en recette). La section entière — titre du
     panneau compris — doit alors disparaître : proposer un appairage qui ne
     peut aboutir serait le même mensonge d'interface que l'ancien réglage
     `cloud` juste au-dessus.

     Ce test vérifie la dégradation dans l'application RÉELLE, là où les tests
     unitaires ne voient que l'état : c'est la construction Next qui fige la
     variable, et une erreur d'inlining ne se verrait qu'ici. */
  test('sans relais configuré, la synchronisation ne s’affiche pas du tout', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await attendreHydratation(page);

    await expect(page.getByRole('heading', { name: 'Synchronisation' })).toHaveCount(0);
    await expect(page.getByText('Créer un code')).toHaveCount(0);
    await expect(page.getByTestId('sync-code')).toHaveCount(0);
  });

  /* Tâche 5.4 — plus aucun interrupteur en attente d'une phase future : les
     trois canaux de rappel sont branchés (5.2, 5.3). Ce qui reste vérifié,
     c'est qu'ils AGISSENT, et le test générique de `interrupteurs.spec.ts`
     l'impose maintenant à tous, ceux à venir compris. */
  test('les interrupteurs des rappels sont branchés, aucun n’attend « bientôt »', async ({
    page,
  }) => {
    await ouvrirVierge(page, ROUTE);

    await expect(page.getByText('Bientôt')).toHaveCount(0);
    for (const nom of ['Notifications push', 'Son des rappels', 'Animation de réussite']) {
      await expect(page.getByRole('switch', { name: nom })).toBeEnabled();
    }
  });

  test('le début de semaine se règle et se conserve', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('radio', { name: 'Dimanche' }).click();
    /* La tranche écrit en base AVANT de mettre le store à jour : la case
       cochée est donc la preuve que l'enregistrement a abouti. Recharger sans
       l'attendre, c'est courir contre l'écriture. */
    await expect(page.getByRole('radio', { name: 'Dimanche' })).toBeChecked();

    await page.reload();
    await attendreHydratation(page);
    await expect(page.getByRole('radio', { name: 'Dimanche' })).toBeChecked();
  });

  test('la réinitialisation se confirme en deux temps et repart d’un compte vierge', async ({
    page,
  }) => {
    await ouvrirAvecDemo(page, ROUTE);

    /* Premier temps : rien n'est effacé, la question est posée. */
    await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Oui, tout réinitialiser' })).toBeVisible();

    await page.getByRole('button', { name: 'Oui, tout réinitialiser' }).click();

    /* La réinitialisation vide neuf tables puis ré-amorce : naviguer sans
       attendre, c'est lire une base à moitié effacée. Le badge « jeu de
       démonstration » disparaît quand l'état rechargé est en place — c'est le
       signal que l'opération est terminée. */
    await expect(page.getByTitle('Jeu de démonstration')).toHaveCount(0);

    await page.goto('/app/habits');
    await attendreHydratation(page);
    /* B4 — un compte VIERGE, et non le jeu de démonstration comme dans le
       prototype : on ne rend pas à l'utilisateur des habitudes qu'il n'a pas
       créées. */
    await expect(page.getByRole('article')).toHaveCount(0);
    await expect(page.getByText('Aucune habitude')).toBeVisible();
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});

test.describe('profile', () => {
  const ROUTE = '/app/profile';

  test('les statistiques personnelles sont réelles', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    await expect(page.getByTestId('stat-hab')).toHaveText('6');
    /* Meilleure série toutes habitudes confondues — `golden.habit.alc.best`. */
    await expect(page.getByTestId('stat-streak')).toHaveText('37');
    await expect(page.getByTestId('stat-sess')).toHaveText('4');
  });

  test('un compte vierge n’affiche que des zéros', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByTestId('stat-hab')).toHaveText('0');
    await expect(page.getByTestId('stat-streak')).toHaveText('0');
    await expect(page.getByTestId('stat-focus')).toHaveText('0 h 0');
  });

  test('créer un profil l’active, et le supprimer se confirme', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.locator('[data-profiles] li')).toHaveCount(1);

    await page.getByLabel('Nom du nouveau profil').fill('Camille');
    await page.getByRole('button', { name: 'Nouveau profil' }).click();

    await expect(page.locator('[data-profiles] li')).toHaveCount(2);
    await expect(page.locator('[data-profiles] li').filter({ hasText: 'Camille' })).toContainText(
      'Actif',
    );

    /* D4 — la suppression emporte l'historique : elle se confirme. */
    await page.getByRole('button', { name: /Supprimer Camille/ }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Oui, supprimer' }).click();
    await expect(page.locator('[data-profiles] li')).toHaveCount(1);
  });

  /* 05-SPEC-VUES.md § 11 : l'identité, c'est nom, identifiant, fonction et
     date d'entrée. Les deux du milieu manquaient jusqu'à la recette visuelle. */
  test('l’identité porte le nom, l’identifiant et la fonction', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByLabel('Nom', { exact: true }).fill('Amina Sarr');
    await page.getByLabel('Identifiant').fill('amina');
    /* « Fonction » n'est plus un `<select>` natif — son panneau était dessiné
       par le système et restait blanc quel que soit le thème. C'est désormais
       un combobox à nous, d'où le clic sur l'option plutôt que
       `selectOption()`, qui n'existe que sur l'élément natif. */
    await page.getByRole('combobox', { name: 'Fonction' }).click();
    await page.getByRole('option', { name: 'Chercheuse' }).click();
    /* La tranche écrit en base AVANT de mettre le store à jour : le libellé
       affiché est donc la preuve que l'enregistrement a abouti. Recharger sans
       l'attendre, c'est courir contre l'écriture — même raison qu'au début de
       semaine, plus haut. */
    await expect(page.getByRole('combobox', { name: 'Fonction' })).toContainText('Chercheuse');

    await page.reload();
    await attendreHydratation(page);
    await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Amina Sarr');
    await expect(page.getByLabel('Identifiant')).toHaveValue('amina');
    await expect(page.getByRole('combobox', { name: 'Fonction' })).toContainText('Chercheuse');
  });

  test('le dernier profil ne se supprime pas', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.locator('[data-profiles] li')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Supprimer/ })).toHaveCount(0);
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
