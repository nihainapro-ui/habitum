import { expect, test, type Page } from '@playwright/test';
import { installer } from './helpers/app';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  /* Tâche 5.5 — sans compte accueilli, toute route applicative renvoie au
     parcours d'accueil, où il n'y a pas de palette à ouvrir. */
  await installer(page);
});

/* Les pages sont prérendues : le HTML arrive AVANT que les raccourcis soient
   écoutés. Presser ⌘K trop tôt ne fait rien — et rend le test instable, pas
   l'application. On attend donc que la coque se déclare interactive. */
const ouvrir = async (page: Page, chemin: string) => {
  await page.goto(chemin);
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
};

test('la palette cherche et navigue au clavier', async ({ page }) => {
  await ouvrir(page, '/app');
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog', { name: /commandes/i });
  await expect(palette).toBeVisible();

  await page.keyboard.type('médit');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(palette).toBeHidden();
});

test('Escape ferme la palette et rend le focus', async ({ page }) => {
  await ouvrir(page, '/app');
  const declencheur = page.getByRole('button', { name: /rechercher/i });
  await declencheur.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  /* Une modale qui se ferme en laissant le focus sur <body> renvoie un
     utilisateur au clavier tout en haut du document. */
  await expect(declencheur).toBeFocused();
});

test('une recherche infructueuse reste une action possible', async ({ page }) => {
  await ouvrir(page, '/app');
  await page.keyboard.press('Meta+k');
  await page.keyboard.type('Arroser les plantes');
  /* Le prototype ne laisse jamais l'utilisateur dans un cul-de-sac : la
     création rapide est toujours proposée en dernier. */
  await expect(page.getByRole('option').last()).toContainText(/arroser les plantes/i);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  await ouvrir(page, '/app/tasks');
  await page.keyboard.press('Meta+k');
  /* `fill` plutôt que `type` : la saisie ne doit pas dépendre de l'instant où
     le champ reçoit le focus. */
  await page.getByRole('combobox').fill('Arroser');
  await expect(page.getByRole('listbox')).toContainText(/arroser les plantes/i);
});

test('vide, la palette propose les douze vues', async ({ page }) => {
  await ouvrir(page, '/app');
  await page.keyboard.press('Meta+k');
  /* DOUZE depuis Work. Ce nombre est en dur À DESSEIN : la palette est le
     seul chemin clavier vers toutes les vues, et une entrée qui cesserait d'y
     apparaître ne se verrait nulle part ailleurs. */
  await expect(page.getByRole('option')).toHaveCount(12);
});

/* ---------------------------------------------------------------------------
   Raccourcis globaux (tâche 3.5).

   Écart assumé au plan : ses deux tests visaient une zone de texte de /notes et
   un bouton « nouvelle habitude » de /habits — deux éléments qui n'existeront
   qu'en phase 4. Plutôt que de reporter le contrôle, on l'exerce sur le champ
   et la boîte de dialogue de la palette : c'est le MÊME mécanisme, et il est
   vérifiable aujourd'hui.
   --------------------------------------------------------------------------- */

test('les raccourcis ne se déclenchent pas dans un champ de saisie', async ({ page }) => {
  await ouvrir(page, '/app');
  await page.keyboard.press('Meta+k');
  const champ = page.getByRole('combobox');
  await champ.click();

  await page.keyboard.type('k');
  await expect(champ).toHaveValue('k');

  /* ⌘\ depuis un champ ne doit pas basculer le mode zen : le rail reste là. */
  await page.keyboard.press('Meta+Backslash');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeVisible();
});

test('Tab reste piégé dans la palette ouverte', async ({ page }) => {
  await ouvrir(page, '/app');
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog');
  await expect(palette).toBeVisible();

  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');

  const dansLaPalette = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return !!dlg && dlg.contains(document.activeElement);
  });
  expect(dansLaPalette, 'le focus est sorti de la palette').toBe(true);
});
