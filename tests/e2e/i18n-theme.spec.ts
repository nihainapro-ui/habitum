import { expect, test } from '@playwright/test';
import { installer } from './helpers/app';

/* D6 — 311 clés traduites et symétriques, aucune atteignable : les libellés
   étaient écrits en français dans le JSX.
   D26 — trois thèmes livrés en CSS, `data-theme` figé sur `neural`. */

/* Tâche 5.5 — une base sans `onboarded` renvoie au parcours d'accueil. Les
   tests de ce fichier parlent de l'application installée : on pose donc un
   compte accueilli avant chaque navigation. */
test.beforeEach(async ({ page }) => {
  await installer(page);
});

const pret = async (page: import('@playwright/test').Page, chemin: string) => {
  await page.goto(chemin);
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
};

test('la bascule FR → EN change les libellés sans rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await pret(page, '/app/settings');

  /* Le rail est repéré par un identifiant de test, pas par son nom accessible :
     ce nom est justement ce que la bascule traduit. */
  const rail = page.getByTestId('rail');
  await expect(rail.getByRole('link', { name: 'Habitudes' })).toBeVisible();

  await page.getByRole('radio', { name: 'English' }).click();

  await expect(rail.getByRole('link', { name: 'Habits' })).toBeVisible();
  /* Pas de segment de langue dans l'URL : la langue est une préférence de
     profil, pas une propriété de la ressource. */
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test('la langue survit au rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await pret(page, '/app/settings');
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /main/i);

  await page.reload();
  await expect(page.getByTestId('rail')).toHaveAttribute('aria-label', /main/i);
});

test('aucune clé de traduction brute n’est affichée', async ({ page }) => {
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
  ];
  for (const route of ROUTES) {
    await page.goto(route);
    const texte = await page.locator('main').innerText();
    /* Une clé non résolue s'affiche telle quelle : « app.navHabits ».
       Le motif vise ce cas, pas les noms de fichiers légitimes. */
    expect(texte, `clé brute visible sur ${route}`).not.toMatch(/\bapp\.[a-zA-Z]+\b/);
    expect(texte, `clé brute visible sur ${route}`).not.toMatch(/\bsystem\.[a-zA-Z]+\b/);
  }
});

test('le thème bascule et survit au rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await pret(page, '/app/settings');

  await page.getByRole('radio', { name: /plasma/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'plasma');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'plasma');
});

test('aucun clignotement de thème au chargement', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await pret(page, '/app/settings');
  await page.getByRole('radio', { name: /clinical/i }).click();

  /* On observe le thème AU TOUT DÉBUT du document suivant : si le script
     anti-clignotement n'était pas bloquant, on verrait « neural » d'abord. */
  const observe: string[] = [];
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__themeInitial = null;
    document.addEventListener('DOMContentLoaded', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__themeInitial = document.documentElement.dataset.theme;
    });
  });
  await page.reload();
  observe.push(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (await page.evaluate(() => (window as any).__themeInitial)) as string,
  );
  expect(observe[0]).toBe('clinical');
});

test('les trois thèmes changent réellement le fond', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await pret(page, '/app/settings');

  const fonds: string[] = [];
  for (const nom of ['neural', 'plasma', 'clinical']) {
    await page.getByRole('radio', { name: new RegExp(nom, 'i') }).click();
    fonds.push(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  }
  expect(new Set(fonds).size, `fonds obtenus : ${fonds.join(', ')}`).toBe(3);
});
