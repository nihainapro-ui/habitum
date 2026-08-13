import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Calendrier » — 05-SPEC-VUES.md § 3, plan 5 tâche 5.8.

   La partie risquée de la phase : déplacement, redimensionnement, et surtout
   l'ALTERNATIVE CLAVIER, qui n'est pas optionnelle (T3.9, T7.4). */

const ROUTE = '/app/calendar';

/* Le calendrier retombe sur l'agenda sous 768 px (D6) : les modes grille ne
   se testent que sur desktop. */
const bureau = test.extend({});

test.describe('calendar', () => {
  test('les quatre modes sont proposés et s’affichent', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'les grilles retombent sur l’agenda sous 768 px');
    await ouvrirAvecDemo(page, ROUTE);

    await expect(page.locator('[data-month-grid] > div')).toHaveCount(42);

    await page.getByRole('radio', { name: 'Semaine' }).click();
    await expect(page.locator('[data-day-column]')).toHaveCount(7);

    await page.getByRole('radio', { name: 'Jour' }).click();
    await expect(page.locator('[data-day-column]')).toHaveCount(1);

    await page.getByRole('radio', { name: 'Agenda' }).click();
    await expect(page.locator('[data-agenda]')).toBeVisible();
  });

  test('sous 768 px, le calendrier est un agenda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await ouvrirAvecDemo(page, ROUTE);

    await expect(page.locator('[data-agenda]')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Mois' })).toHaveCount(0);
  });

  /* Le test qui compte : une tâche doit pouvoir être déplacée INTÉGRALEMENT au
     clavier. Entrée ouvre le mode déplacement, les flèches travaillent en
     jours et en quarts d'heure, Entrée valide. */
  bureau('déplacer une tâche au clavier change sa date', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'mode grille indisponible sous 768 px');
    await ouvrirAvecDemo(page, ROUTE);

    const bloc = page.locator('[data-event]').filter({ hasText: 'Réunion de travail' }).first();
    await bloc.focus();
    await page.keyboard.press('Enter');
    await expect(bloc).toHaveAttribute('data-moving', 'true');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-toast]')).toContainText('Replanifié');
    /* Le 5 août devient le 6 : la tâche a changé de case. */
    await expect(
      page.locator('[data-day="2026-08-06"] [data-event]').filter({ hasText: 'Réunion' }),
    ).toHaveCount(1);
  });

  bureau('Échap abandonne le déplacement sans rien écrire', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'mode grille indisponible sous 768 px');
    await ouvrirAvecDemo(page, ROUTE);

    const bloc = page.locator('[data-event]').filter({ hasText: 'Réunion de travail' }).first();
    await bloc.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(bloc).not.toHaveAttribute('data-moving', 'true');
    await expect(
      page.locator('[data-day="2026-08-05"] [data-event]').filter({ hasText: 'Réunion' }),
    ).toHaveCount(1);
  });

  bureau('le redimensionnement ne descend pas sous 15 minutes', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'mode grille indisponible sous 768 px');
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('radio', { name: 'Jour' }).click();

    const bloc = page.locator('[data-event]').filter({ hasText: 'Réunion de travail' }).first();
    await expect(bloc).toHaveAttribute('data-duration', '60');

    await bloc.focus();
    await page.keyboard.press('Shift+ArrowDown');
    await expect(bloc).toHaveAttribute('data-duration', '75');

    for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowUp');
    await expect(bloc).toHaveAttribute('data-duration', '15');
    await expect(page.locator('[data-toast]')).toContainText('Durée mise à jour');
  });

  bureau('le déplacement est annulable', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'mode grille indisponible sous 768 px');
    await ouvrirAvecDemo(page, ROUTE);

    const bloc = page.locator('[data-event]').filter({ hasText: 'Réunion de travail' }).first();
    await bloc.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(
      page.locator('[data-day="2026-08-06"] [data-event]').filter({ hasText: 'Réunion' }),
    ).toHaveCount(1);

    await page.locator('[data-toast]').getByRole('button', { name: 'Annuler' }).click();
    await expect(
      page.locator('[data-day="2026-08-05"] [data-event]').filter({ hasText: 'Réunion' }),
    ).toHaveCount(1);
  });

  bureau('cliquer un jour ouvre la vue du jour sur cette date', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'mode grille indisponible sous 768 px');
    await ouvrirAvecDemo(page, ROUTE);

    await page.locator('[data-day="2026-08-07"]').getByRole('button').first().click();
    await expect(page).toHaveURL(/\/app\/today$/);
    /* Vendredi 7 : « Regarder un film » n'est planifié que vendredi et samedi. */
    await expect(page.getByText('Regarder un film')).toBeVisible();
  });

  test('état vide : rien de prévu sur la période', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByText('Rien de prévu')).toBeVisible();
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
