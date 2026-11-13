import { expect, test } from '@playwright/test';
import { DATE_FIGEE, ouvrir, ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* ============================================================================
   Phase 1 — plusieurs onglets, une seule base ; et ce que le navigateur dit
   du stockage (12 novembre 2026).

   Aucun test unitaire ne peut voir cela : `BroadcastChannel` et
   `navigator.storage` n'existent que dans un vrai navigateur, et le défaut
   lui-même — un onglet qui affiche et RÉÉCRIT un état périmé — ne se produit
   qu'avec deux pages vivantes sur la même base.
   ========================================================================= */

const ROUTE = '/app/habits';

test.describe('deux onglets', () => {
  /* La forme bureau porte les pastilles de la semaine ; c'est le mécanisme
     qu'on éprouve, pas la vue, et il est le même sous 768 px. */
  test.skip(({ isMobile }) => !!isMobile, 'forme bureau de la vue');

  test('ce qui est coché dans l’un apparaît dans l’autre, sans recharger', async ({
    page,
    context,
  }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const autre = await context.newPage();
    await autre.clock.setFixedTime(DATE_FIGEE);
    await ouvrir(autre, ROUTE);

    const pastille = (p: typeof page) =>
      p
        .getByRole('article', { name: "Boire 8 verres d'eau" })
        .getByRole('checkbox', { name: /mercredi 5 août/ });
    await expect(pastille(autre)).not.toBeChecked();

    await pastille(page).click();
    await expect(pastille(page)).toBeChecked();

    /* AUCUN rechargement : c'est l'annonce de l'écriture qui fait relire. */
    await expect(pastille(autre)).toBeChecked();
    await expect(
      autre.getByRole('article', { name: "Boire 8 verres d'eau" }).getByTestId('streak'),
    ).toHaveText('3');
  });

  test('l’onglet resté ouvert n’écrase pas ce que l’autre a fait', async ({ page, context }) => {
    /* LE VRAI DANGER. Sans relecture, le second onglet écrit à partir d'un
       état périmé. Ici : on coche l'eau dans l'un, puis on DÉCOCHE la
       méditation dans l'autre (le jeu de démonstration la donne faite) — les
       deux gestes doivent survivre au rechargement. */
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const autre = await context.newPage();
    await autre.clock.setFixedTime(DATE_FIGEE);
    await ouvrir(autre, ROUTE);

    const pastille = (p: typeof page, habitude: string) =>
      p.getByRole('article', { name: habitude }).getByRole('checkbox', { name: /mercredi 5 août/ });

    await pastille(page, "Boire 8 verres d'eau").click();
    await expect(pastille(autre, "Boire 8 verres d'eau")).toBeChecked();
    await expect(pastille(autre, 'Méditer')).toBeChecked();
    await pastille(autre, 'Méditer').click();
    await expect(pastille(autre, 'Méditer')).not.toBeChecked();
    /* Et le premier onglet l'apprend à son tour. */
    await expect(pastille(page, 'Méditer')).not.toBeChecked();

    await page.reload();
    await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
    await expect(pastille(page, "Boire 8 verres d'eau")).toBeChecked();
    await expect(pastille(page, 'Méditer')).not.toBeChecked();
  });
});

test.describe('état du stockage', () => {
  test('les réglages disent si le navigateur protège la base', async ({ page }) => {
    await ouvrirVierge(page, '/app/settings');

    const bloc = page.getByTestId('stockage');
    await expect(bloc).toBeVisible();
    /* Ce que le navigateur déclare, tel quel : « oui » ou « non », jamais une
       supposition. Un Chromium de test ne l'accorde pas — mais l'attendu est
       que l'écran RÉPÈTE la réponse, quelle qu'elle soit. */
    const declare = await page.evaluate(() => navigator.storage.persisted());
    await expect(bloc).toHaveAttribute('data-persistant', declare ? 'oui' : 'non');
  });
});
