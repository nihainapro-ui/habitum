import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Tableau de bord » — 05-SPEC-VUES.md § 1, plan 5 tâche 5.3. */

const ROUTE = '/app';

test.describe('dash', () => {
  test('l’anneau et les compteurs reprennent les chiffres du jour', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    /* Mercredi 5 août : 4 réussites sur 8 prévus — première paire de
       `golden.dayRatios30`. */
    const [prevu, fait] = String(golden['global.dayRatios30']).split(' ')[0]!.split('/');
    await expect(page.getByTestId('day-ratio')).toHaveText(`${fait}/${prevu}`);
    await expect(page.getByTestId('compteur-habits')).toHaveText(`${fait}/${prevu}`);

    /* Meilleur record toutes habitudes confondues, et minutes de focus. */
    await expect(page.getByTestId('compteur-streak')).toHaveText(String(golden['habit.alc'].best));
    await expect(page.getByTestId('compteur-focus')).toHaveText('2 h 18');
  });

  test('cocher une habitude depuis le tableau de bord met l’anneau à jour', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await expect(page.getByTestId('day-ratio')).toHaveText('4/8');

    await page
      .locator('[data-dash-habits]')
      .getByRole('checkbox', { name: 'Lire au moins 20 pages' })
      .click();
    await expect(page.getByTestId('day-ratio')).toHaveText('5/8');
  });

  test('la mini-carte couvre trente jours', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await expect(page.locator('[data-mini-heatmap] > span')).toHaveCount(30);
  });

  test('les prochaines échéances et les objectifs sont listés', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    await expect(page.locator('[data-dash-tasks] li')).toHaveCount(5);
    await expect(page.locator('[data-dash-goals] li')).toHaveCount(4);
  });

  /* D8 — le rappel de sauvegarde n'apparaît que s'il y a quelque chose à
     perdre, et il ne revient pas une fois refusé. */
  test('le rappel de sauvegarde se refuse une fois pour toutes', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    const rappel = page.getByRole('status').filter({ hasText: 'Aucune sauvegarde' });
    await expect(rappel).toBeVisible();

    await rappel.getByRole('button', { name: 'Plus tard' }).click();
    await expect(rappel).toHaveCount(0);

    await page.reload();
    await expect(page.getByText('Aucune sauvegarde depuis 30 jours')).toHaveCount(0);
  });

  test('un compte vierge n’affiche aucun rappel et aucun chiffre fabriqué', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await expect(page.getByText('Aucune sauvegarde depuis 30 jours')).toHaveCount(0);
    await expect(page.getByTestId('day-ratio')).toHaveText('0/0');
    await expect(page.getByTestId('compteur-focus')).toHaveText('0 h 0');
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
