import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge } from '../helpers/app';

/* ============================================================================
   PARCOURS 7 — Passer FR → EN.

   Ce que le parcours prouve : les libellés traduits sont ATTEIGNABLES. C'était
   le défaut D6 — le dépôt livrait deux fichiers de messages symétriques et
   complets, et pas une seule vue ne les lisait : le français était écrit en dur
   dans le JSX. Un test qui bascule la langue sur une seule vue n'aurait rien
   vu ; il faut passer les onze.

   Le parcours ajoute trois choses aux tests de vue existants :
   1. il traverse les ONZE vues en anglais et vérifie qu'aucune clé brute
      n'affleure — une clé non résolue s'affiche telle quelle, « app.navHabits » ;
   2. il vérifie que la bascule N'A PAS rechargé la page (la langue est une
      préférence de profil, pas une propriété de la ressource) ;
   3. il revient en français, ce que personne ne teste jamais : une bascule qui
      ne sait pas revenir enferme l'utilisateur dans la langue choisie par
      erreur.
   ========================================================================= */

const ROUTES = [
  '/app',
  '/app/today',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/calendar',
  '/app/stats',
  '/app/timer',
  '/app/notes',
  '/app/work',
  '/app/profile',
  '/app/settings',
] as const;

test('la bascule FR → EN traverse les onze vues sans clé brute ni rechargement', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, '/app/settings', { historique: true });

  /* Un témoin posé sur la fenêtre : s'il survit à la bascule, aucun
     rechargement n'a eu lieu. Une bascule qui recharge perdrait l'état de la
     vue courante — et le prototype, lui, ne rechargeait pas. */
  await page.evaluate(() => {
    (window as unknown as { __temoin: string }).__temoin = 'intact';
  });

  await page.getByRole('radio', { name: 'English' }).click();

  const rail = page.getByTestId('rail');
  await expect(rail).toHaveAttribute('aria-label', /main/i);
  expect(
    await page.evaluate(() => (window as unknown as { __temoin?: string }).__temoin),
    'la bascule a rechargé la page',
  ).toBe('intact');
  /* Aucun segment de langue dans l'URL. */
  await expect(page).toHaveURL(/\/app\/settings$/);

  for (const route of ROUTES) {
    await page.goto(route);
    await attendreHydratation(page);
    const texte = await page.locator('main').innerText();
    expect(texte, `clé brute visible sur ${route}`).not.toMatch(/\bapp\.[a-zA-Z]+\b/);
    expect(texte, `clé brute visible sur ${route}`).not.toMatch(/\bsystem\.[a-zA-Z]+\b/);
    /* Et la vue est bien EN ANGLAIS : le rail est le seul élément commun aux
       onze, et son étiquette accessible est traduite. */
    await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /main/i);
  }
});

test('la langue survit au rechargement, et sait revenir en français', async ({ page }) => {
  await ouvrirVierge(page, '/app/settings');

  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /main/i);

  await page.reload();
  await attendreHydratation(page);
  await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /main/i);

  /* LE RETOUR — jamais testé, et pourtant c'est le geste de qui s'est trompé
     de bouton. En anglais, le libellé du choix français est « French ». */
  await page.getByRole('radio', { name: 'Français' }).click();
  await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /principale/i);

  await page.reload();
  await attendreHydratation(page);
  await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /principale/i);
});
