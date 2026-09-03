import { expect, test } from '@playwright/test';
import { installer, ouvrirAvecDemo } from './helpers/app';
import { LARGEURS_MESUREES, releverDebordements } from './helpers/debordement';

/* ADR-0007 : l'application vit sous /app. */

/* Tâche 5.5 — une base sans `onboarded` renvoie au parcours d'accueil. Les
   tests de ce fichier parlent de l'application installée : on pose donc un
   compte accueilli avant chaque navigation. */
test.beforeEach(async ({ page }) => {
  await installer(page);
});

test('le rail marque la page courante', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app/habits');
  await expect(page.getByRole('link', { name: /habitudes/i })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('le tableau de bord ne s’active pas depuis une autre vue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app/today');
  /* `/app` est un préfixe de toutes les autres routes : une comparaison par
     préfixe marquerait le tableau de bord actif partout. */
  await expect(page.getByRole('link', { name: /tableau de bord/i })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('le lien d’évitement mène au contenu principal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /contenu/i });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('le mode zen masque le rail', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  /* Les pages sont prérendues : le HTML arrive avant que les raccourcis soient
     écoutés. On attend que la coque se déclare interactive. */
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
  const rail = page.getByRole('navigation', { name: /principale/i });
  await expect(rail).toBeVisible();
  await page.keyboard.press('Meta+Backslash');
  await expect(rail).toBeHidden();
  await page.keyboard.press('Meta+Backslash');
  await expect(rail).toBeVisible();
});

test('sous 768 px, la barre basse remplace le rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await expect(page.getByTestId('bottom-bar')).toBeVisible();
  await expect(page.getByRole('navigation', { name: /principale/i })).toBeHidden();
});

test('les cibles tactiles de la barre basse font au moins 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  const liens = page.getByTestId('bottom-bar').getByRole('link');
  for (const lien of await liens.all()) {
    const boite = await lien.boundingBox();
    expect(boite!.height, 'hauteur de cible tactile').toBeGreaterThanOrEqual(44);
  }
});

for (const w of [390, 768, 1060, 1440]) {
  test(`aucun débordement horizontal à ${w} px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/app');
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(debordement, `débordement à ${w} px`).toBe(false);
  });
}

test('le changement de vue est annoncé aux lecteurs d’écran', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/app');
  const region = page.locator('[aria-live="polite"]');
  await page
    .getByRole('navigation', { name: /principale/i })
    .getByRole('link', { name: /habitudes/i })
    .click();
  await expect(region).toContainText(/habitudes/i);
});

test('le calendrier de l’en-tête s’ouvre, se ferme, et rend le focus', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/today');

  const bouton = page.getByRole('button', { name: 'Ouvrir le calendrier' });
  await expect(bouton).toBeVisible();
  await bouton.click();

  const boite = page.getByRole('dialog', { name: 'Choisir un jour' });
  await expect(boite).toBeVisible();

  /* Échap ferme, et LE FOCUS REVIENT au bouton : sans ce retour, l'utilisateur
     au clavier est renvoyé au début du document à chaque fermeture. Radix le
     garantit — encore faut-il que le test le dise, sinon un jour où le
     dialogue sera remonté à la main, personne ne s'en apercevra. */
  await page.keyboard.press('Escape');
  await expect(boite).toBeHidden();
  await expect(bouton).toBeFocused();
});

/* L'EN-TÊTE N'ÉTAIT MESURÉ PAR RIEN. `debordements.spec.ts` balaie `main *` et
   documente l'en-tête parmi ses angles morts assumés ; or `header.tsx` porte
   lui-même la trace d'un piège déjà payé — « un élément à largeur fixe dans
   l'en-tête vole la place du titre et du sous-titre ». Le lot C y ajoute un
   bouton : il mesure d'abord, il ajoute ensuite.

   Ce test est VERT dès son écriture, et c'est voulu : il fixe l'état d'avant.
   S'il rougit à la tâche 2, c'est le bouton qui est en trop, pas la mesure. */
test.describe('en-tête', () => {
  for (const largeur of LARGEURS_MESUREES) {
    test(`l'en-tête ne déborde pas et ne coupe aucun texte à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await ouvrirAvecDemo(page, '/app/today');

      /* LA MESURE DÉCISIVE est celle de l'en-tête LUI-MÊME : c'est un conteneur
         en ligne sans repli (`flex-nowrap`), donc un enfant de trop ne coupe
         aucun texte — il pousse la boîte. `scrollWidth > clientWidth` sur le
         `<header>` est la seule chose qui l'attrape. */
      const boite = await page.evaluate(() => {
        const h = document.querySelector('header');
        return h ? { scroll: h.scrollWidth, client: h.clientWidth } : null;
      });
      expect(boite, 'aucun <header> trouvé — la coque a changé de forme').not.toBeNull();
      expect(
        boite!.scroll,
        `l'en-tête déborde de ${boite!.scroll - boite!.client} px à ${largeur} px`,
      ).toBeLessThanOrEqual(boite!.client + 1);

      /* Et les textes de ses enfants, avec la même mesure que le filet des
         vues — mêmes exclusions, même doctrine, une seule implémentation. */
      const { releve, balayes } = await releverDebordements(page, 'header');
      expect(
        balayes,
        `${balayes} élément(s) balayé(s) dans l'en-tête — la mesure est suspecte`,
      ).toBeGreaterThan(5);
      expect(releve).toEqual([]);
    });
  }
});
