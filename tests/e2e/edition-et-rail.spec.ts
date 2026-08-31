import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo } from './helpers/app';

/* ============================================================================
   Deux manques que la recette ne voyait pas.

   1. LA VUE AUJOURD'HUI ÉTAIT LE SEUL ENDROIT SANS ÉDITION. Habitudes, Tâches
      et Objectifs ont leur crayon depuis toujours ; les lignes d'Aujourd'hui
      n'avaient qu'un tiroir d'actions — réussi, passer, reporter, note,
      supprimer. On pouvait tout faire d'une entité SAUF la corriger, là
      précisément où l'on passe le plus de temps.

   2. LE RAIL NE SE MASQUAIT PAS. Le mode zen l'emporte avec la barre basse et
      l'en-tête ; rendre la largeur au contenu sans quitter la navigation
      n'était pas possible.
   ========================================================================= */

test.describe('édition depuis la vue Aujourd’hui', () => {
  test('une habitude s’édite depuis son tiroir d’actions', async ({ page }) => {
    await ouvrirAvecDemo(page, '/app/today');

    await page.getByRole('button', { name: /plus d’actions.*méditer/i }).click();
    await page.getByRole('menuitem', { name: 'Modifier' }).click();

    /* L'éditeur s'ouvre SUR CETTE habitude, et non sur une création : c'est le
       nom pré-rempli qui le prouve, pas la simple présence du panneau. */
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('textbox').first()).toHaveValue('Méditer');
  });

  test('une tâche s’édite depuis son tiroir d’actions', async ({ page }) => {
    await ouvrirAvecDemo(page, '/app/today');

    const tiroir = page.getByRole('button', { name: /plus d’actions/i });
    const compte = await tiroir.count();
    expect(compte, 'le jeu de démonstration doit peupler la journée').toBeGreaterThan(0);

    await tiroir.last().click();
    await expect(page.getByRole('menuitem', { name: 'Modifier' })).toBeVisible();
  });
});

test.describe('rail masquable sur bureau', () => {
  test('le rail se masque et revient, et l’état survit au rechargement', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ouvrirAvecDemo(page, '/app');

    const rail = page.getByTestId('rail');
    await expect(rail).toBeVisible();

    await page.getByRole('button', { name: /masquer le rail/i }).click();
    await expect(rail).toBeHidden();

    /* LE POINT QUI COMPTE : la préférence est lue AVANT la première peinture
       (`public/theme.js`), donc le rail ne réapparaît pas une fraction de
       seconde au rechargement. Un `useEffect` aurait passé ce test tout en
       faisant clignoter la page à chaque ouverture. */
    await page.reload();
    await attendreHydratation(page);
    await expect(rail).toBeHidden();

    await page.getByRole('button', { name: /afficher le rail/i }).click();
    await expect(rail).toBeVisible();
  });

  test('l’interrupteur n’existe pas sur téléphone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ouvrirAvecDemo(page, '/app');

    /* Sous 768 px le rail n'est pas rendu : un bouton pour le masquer n'aurait
       rien à masquer. */
    await expect(page.getByRole('button', { name: /masquer le rail/i })).toBeHidden();
    await expect(page.getByTestId('bottom-bar')).toBeVisible();
  });

  test('masquer le rail ne masque pas la navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ouvrirAvecDemo(page, '/app');
    await page.getByRole('button', { name: /masquer le rail/i }).click();

    /* Sans ce contrôle, « masquer » deviendrait un cul-de-sac : plus de rail,
       pas de barre basse au-dessus de 768 px, et la palette pour seul recours.
       L'interrupteur du retour reste dans l'en-tête, toujours atteignable. */
    await expect(page.getByRole('button', { name: /afficher le rail/i })).toBeVisible();
  });
});
