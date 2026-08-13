import { expect, test } from '@playwright/test';
import { attendreHydratation } from './helpers/app';

/* Tâche 5.5 — la première ouverture, et le compte VIERGE par défaut.

   Ces tests n'utilisent PAS `ouvrirVierge` : ce helper marque justement le
   compte comme accueilli. Ici, on veut la toute première ouverture, celle que
   B4 gouverne — un utilisateur réel ne doit jamais recevoir l'historique de
   démonstration sans l'avoir demandé. */

test('une première ouverture mène à l’accueil, pas au tableau de bord', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('le parcours par défaut produit un compte VIERGE', async ({ page }) => {
  await page.goto('/onboarding');
  await attendreHydratation(page);

  await page.getByRole('button', { name: 'Français' }).click();
  await page.getByRole('button', { name: 'Neural' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  /* Aucune habitude cochée : c'est le chemin par défaut. */
  await page.getByRole('button', { name: 'Commencer' }).click();

  await expect(page).toHaveURL(/\/app$/);

  /* G3 — aucun chiffre fabriqué sur un compte neuf. */
  await page.goto('/app/stats');
  await attendreHydratation(page);
  await expect(page.getByTestId('empty-state').first()).toBeVisible();

  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByTestId('empty-state').first()).toBeVisible();
});

test('les habitudes cochées — et elles seules — sont créées', async ({ page }) => {
  await page.goto('/onboarding');
  await attendreHydratation(page);

  await page.getByRole('button', { name: 'Français' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('checkbox', { name: 'Lire 10 pages' }).check();
  await page.getByRole('button', { name: 'Commencer' }).click();

  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByText('Lire 10 pages')).toBeVisible();
});

test('le jeu de démonstration est un choix explicite, et il reste signalé', async ({ page }) => {
  await page.goto('/onboarding');
  await attendreHydratation(page);

  await page.getByRole('button', { name: 'Français' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: /essayer avec des données/i }).click();

  await expect(page).toHaveURL(/\/app$/);
  /* Le badge se réduit à sa marque sous 1200 px : c'est le conteneur qui porte
     le libellé, visible aux deux paliers. */
  await expect(page.getByTitle('Jeu de démonstration')).toBeVisible();
});

test('une fois franchi, l’accueil ne revient plus', async ({ page }) => {
  await page.goto('/onboarding');
  await attendreHydratation(page);
  await page.getByRole('button', { name: 'Français' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto('/app/today');
  await attendreHydratation(page);
  await expect(page).toHaveURL(/\/app\/today$/);
});
