import { expect, test, type Page } from '@playwright/test';

/* Critère de sortie n° 1 de la phase : les onze routes sont alimentées par
   IndexedDB.

   Les VUES elles-mêmes sont portées en phase 4 — ce test ne prétend pas le
   contraire. Ce qu'il vérifie est le socle : une donnée écrite une fois est
   relue depuis IndexedDB sur chacune des onze routes, après rechargement
   complet. Si l'hydratation cassait sur une route, elle se verrait ici.  */

const ROUTES = [
  '/app',
  '/app/today',
  '/app/calendar',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/stats',
  '/app/timer',
  '/app/notes',
  '/app/profile',
  '/app/settings',
];

const ouvrir = async (page: Page, chemin: string) => {
  await page.goto(chemin);
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
};

test('une donnée écrite une fois se relit sur les onze routes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await ouvrir(page, '/app');
  await page.keyboard.press('Meta+k');
  await page.getByRole('combobox').fill('Arroser les plantes');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();

  for (const route of ROUTES) {
    await ouvrir(page, route);
    await page.keyboard.press('Meta+k');
    await page.getByRole('combobox').fill('Arroser');
    await expect(page.getByRole('listbox'), `hydratation sur ${route}`).toContainText(
      /arroser les plantes/i,
    );
    await page.keyboard.press('Escape');
  }
});

/* G3 — un compte vierge n'affiche rien de fabriqué. Vrai en base (phase 1),
   vrai dans le store (phase 2) : il faut que ce soit encore vrai à l'écran. */
test("un compte vierge n'affiche aucun jeu de démonstration", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ouvrir(page, '/app');

  await expect(page.getByLabel(/démonstration/i)).toHaveCount(0);

  await page.keyboard.press('Meta+k');
  await page.getByRole('combobox').fill('a');
  /* Seule la création rapide subsiste : aucune habitude, aucune tâche,
     aucun objectif n'a été inventé. */
  await expect(page.getByRole('option')).toHaveCount(1);
});
