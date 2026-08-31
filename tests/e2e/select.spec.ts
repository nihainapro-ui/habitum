import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ouvrirVierge } from './helpers/app';

/* Menu déroulant — `components/ui/select.tsx`.
 *
 * CE QUE CE FICHIER PROTÈGE, et pourquoi il est en e2e plutôt qu'en unitaire.
 *
 * Le défaut d'origine ne se voyait NI dans le HTML, NI dans les jetons : le
 * `<select>` natif était correctement thémé fermé, et son panneau — dessiné
 * par le système d'exploitation — était blanc avec une ligne de survol en
 * `#0d6efd`. Aucun test de rendu, aucun contrôle de jeton, aucun instantané du
 * DOM ne pouvait le montrer, parce que le panneau n'était pas dans le DOM.
 *
 * D'où des contrôles qui ouvrent réellement le menu, dans un vrai navigateur,
 * et qui regardent la couleur CALCULÉE de ce qui est peint. */

const ROUTE = '/app/profile';

/** Le menu « Fonction » de la vue Profil — celui des captures du rapport. */
const declencheur = (page: Page) => page.getByRole('combobox', { name: 'Fonction' });
const panneau = (page: Page) => page.getByRole('listbox', { name: 'Fonction' });

/** Couleur de fond effectivement peinte, en remontant les parents transparents. */
const fondPeint = (page: Page, selecteur: string) =>
  page.evaluate((s) => {
    let el = document.querySelector(s);
    while (el) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== 'transparent' && !c.startsWith('rgba(0, 0, 0, 0)')) return c;
      el = el.parentElement;
    }
    return '';
  }, selecteur);

test.describe('menu déroulant', () => {
  test('aucune vue ne contient plus de `select` natif', async ({ page }) => {
    /* Le critère d'arrêt du rapport, vérifié sur la page rendue plutôt que par
       un grep : un `<select>` peut arriver par un composant, pas seulement par
       une vue. */
    await ouvrirVierge(page, ROUTE);
    await expect(page.locator('select')).toHaveCount(0);
  });

  test('le déclencheur est un combobox annoncé, replié au départ', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await expect(declencheur(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(panneau(page)).toHaveCount(0);
  });

  test('ouvrir expose une liste d’options sélectionnables', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).click();

    await expect(declencheur(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(panneau(page)).toBeVisible();
    await expect(panneau(page).getByRole('option')).toHaveCount(6);
    /* Exactement UNE option sélectionnée : `aria-selected` sur toutes serait
       aussi faux que sur aucune. */
    await expect(panneau(page).locator('[role=option][aria-selected=true]')).toHaveCount(1);
  });

  test('le panneau n’est NI blanc NI bleu système, dans les trois thèmes', async ({ page }) => {
    for (const theme of ['neural', 'plasma', 'clinical'] as const) {
      await ouvrirVierge(page, ROUTE);
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await declencheur(page).click();
      await expect(panneau(page)).toBeVisible();

      const fond = await fondPeint(page, '[data-select-panel]');
      /* Le rectangle blanc opaque du panneau natif — le symptôme signalé. */
      expect(fond, `panneau blanc en ${theme}`).not.toBe('rgb(255, 255, 255)');

      /* Le bleu de survol du système, `#0d6efd`. Il n'appartient à aucun des
         trois thèmes : le voir signifie que le panneau natif est revenu. */
      const survol = await panneau(page)
        .getByRole('option')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(survol, `bleu système en ${theme}`).not.toBe('rgb(13, 110, 253)');
    }
  });

  test('le panneau SUIT le thème, même changé menu ouvert', async ({ page }) => {
    /* Le cœur du signalement : « le problème du blanc quand on change
       d'apparence ». Le panneau natif restait blanc pendant que toute
       l'interface passait au magenta. */
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).click();
    await expect(panneau(page)).toBeVisible();

    const avant = await fondPeint(page, '[data-select-panel]');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'plasma'));
    const apres = await fondPeint(page, '[data-select-panel]');

    expect(apres).not.toBe(avant);
  });

  test('se pilote entièrement au clavier, sans souris', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).focus();

    await page.keyboard.press('ArrowDown');
    await expect(panneau(page)).toBeVisible();

    /* L'option active est désignée par `aria-activedescendant` : le focus, lui,
       reste sur le bouton. C'est le contrat d'un combobox. */
    const actif = async () => declencheur(page).getAttribute('aria-activedescendant');
    const depart = await actif();

    await page.keyboard.press('ArrowDown');
    expect(await actif()).not.toBe(depart);

    await page.keyboard.press('End');
    const fin = await actif();
    await page.keyboard.press('Home');
    expect(await actif()).not.toBe(fin);

    await page.keyboard.press('Enter');
    await expect(panneau(page)).toHaveCount(0);
    await expect(declencheur(page)).toBeFocused();
  });

  test('la frappe d’une lettre saute à l’option correspondante', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).focus();
    await page.keyboard.press('ArrowDown');

    await page.keyboard.press('c');
    await page.keyboard.press('Enter');

    await expect(declencheur(page)).toContainText('Chercheuse');
  });

  test('Échap ferme sans choisir, et rend le focus au bouton', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    const avant = await declencheur(page).innerText();

    await declencheur(page).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');

    await expect(panneau(page)).toHaveCount(0);
    await expect(declencheur(page)).toBeFocused();
    await expect(declencheur(page)).toHaveText(avant);
  });

  test('un clic à l’extérieur ferme le menu', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).click();
    await expect(panneau(page)).toBeVisible();

    await page.locator('main').click({ position: { x: 5, y: 5 } });
    await expect(panneau(page)).toHaveCount(0);
  });

  test('le choix est retenu et survit au rechargement', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).click();
    await panneau(page).getByRole('option', { name: 'Chercheuse' }).click();

    await expect(declencheur(page)).toContainText('Chercheuse');

    await page.reload();
    await expect(declencheur(page)).toContainText('Chercheuse');
  });

  test('près du bas de la fenêtre, le menu se retourne vers le haut', async ({ page }) => {
    /* Sans retournement, l'utilisateur voit deux options sur six et rien ne le
       lui dit. La fenêtre est volontairement courte pour forcer le cas. */
    await page.setViewportSize({ width: 1280, height: 420 });
    await ouvrirVierge(page, ROUTE);

    const bouton = declencheur(page);
    await bouton.scrollIntoViewIfNeeded();
    await bouton.click();
    await expect(panneau(page)).toBeVisible();

    const boite = (await bouton.boundingBox())!;
    const liste = (await panneau(page).boundingBox())!;

    expect(liste.y + liste.height, 'le menu déborde par le bas').toBeLessThanOrEqual(420);
    expect(liste.y, 'le menu ne s’est pas retourné').toBeLessThan(boite.y);
  });

  test('ouvert, il reste accessible', async ({ page }) => {
    /* Mouvement réduit, pour la même raison que `a11y.spec.ts` : le panneau
       entre avec une transition de couleur, et axe lit les styles CALCULÉS à
       l'instant où il passe. Pris pendant la fondue, il mesure l'encre d'un
       état sur le fond de l'autre — 176 faux contrastes, et seulement quand la
       machine est chargée. La mesure doit porter sur l'état de REPOS. */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ouvrirVierge(page, ROUTE);
    await declencheur(page).click();
    await expect(panneau(page)).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
