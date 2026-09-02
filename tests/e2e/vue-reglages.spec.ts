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

  /* --- Synchronisation ----------------------------------------------------

     Ces deux tests sont EXCLUSIFS : chacun ne vaut que dans une configuration,
     et se saute dans l'autre. C'est voulu — la disponibilité du relais est
     figée à la construction Next, une même exécution ne peut donc pas voir les
     deux états. Les écrire tous les deux garde la dégradation couverte le jour
     où quelqu'un clonerà le dépôt sans relais. */
  const RELAIS = process.env.NEXT_PUBLIC_SYNC_URL ?? '';

  test('sans relais configuré, la synchronisation ne s’affiche pas du tout', async ({ page }) => {
    test.skip(RELAIS !== '', 'ce déploiement a un relais');
    await ouvrirVierge(page, ROUTE);
    await attendreHydratation(page);

    /* Proposer un appairage qui ne peut aboutir serait le même mensonge
       d'interface que l'ancien réglage `cloud` juste au-dessus. */
    await expect(page.getByRole('heading', { name: 'Synchronisation' })).toHaveCount(0);
    await expect(page.getByText('Créer un code')).toHaveCount(0);
    await expect(page.getByTestId('sync-code')).toHaveCount(0);
  });

  test('avec un relais configuré, appairer engendre un code et signale le succès', async ({
    page,
  }) => {
    test.skip(RELAIS === '', 'aucun relais configuré sur ce déploiement');

    /* LE RELAIS EST SIMULÉ, et ce n'est pas de la commodité. Le laisser
       joindre le vrai ferait écrire ce test dans la base de production à
       chaque exécution, et rendrait la recette dépendante d'une panne réseau.
       Ce qu'on éprouve ici est le BRANCHEMENT — l'écran, la tranche, le
       chiffrement, le transport —, pas le serveur, qui a ses propres tests. */
    let appels = 0;
    /* Le filtre est un PRÉDICAT sur l'hôte, pas un motif glob. Un motif qui ne
       correspondrait pas laisserait l'appel joindre le VRAI relais : le test
       passerait au vert en écrivant dans la base de production, et le compteur
       resterait à zéro sans qu'on sache pourquoi. Comparer l'hôte ne peut pas
       rater. */
    const hote = new URL(RELAIS).host;
    await page.route(
      (url) => url.host === hote,
      async (route) => {
        appels += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ seq: 0, lignes: [] }),
        });
      },
    );

    await ouvrirVierge(page, ROUTE);
    await attendreHydratation(page);

    await expect(page.getByRole('heading', { name: 'Synchronisation' })).toBeVisible();
    await page.getByRole('button', { name: 'Créer un code' }).click();

    /* Le code est MASQUÉ d'abord : c'est le seul secret, et une capture
       d'écran de réglages circule plus facilement qu'un mot de passe. */
    const code = page.getByTestId('sync-code');
    await expect(code).toBeVisible();
    await expect(code).toHaveText(/^•+$/);

    await page.getByRole('button', { name: 'Afficher' }).click();
    /* Vingt caractères de l'alphabet de Crockford, groupés par quatre — et
       jamais I, L, O ni U, qu'on confond en lisant à voix haute. Le motif est
       déplié plutôt qu'écrit `(-\w{4}){4}` : `security/detect-unsafe-regex`
       refuse les quantificateurs imbriqués, et il a raison de ne pas faire
       d'exception pour un cas où ils seraient inoffensifs. */
    await expect(code).toHaveText(
      /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
    );

    /* L'ÉCRAN D'ABORD, LE COMPTEUR ENSUITE. L'appairage dérive une clé par
       PBKDF2 — 600 000 itérations, près d'une seconde sur une machine chargée —
       puis fait son aller-retour. Interroger le compteur juste après le clic
       le trouve encore à zéro : ce n'est pas une panne, c'est une course. On
       attend donc le seul signal qui dit que la passe est TERMINÉE, et le
       compteur n'est plus qu'une confirmation. */
    await expect(page.getByTestId('sync-state')).toContainText('Dernière synchronisation');
    expect(appels).toBeGreaterThan(0);
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
