import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Statistiques » — 05-SPEC-VUES.md § 8, plan 5 tâche 5.6. */

const ROUTE = '/app/stats';

/** Score global des 30 jours de référence : fait / prévu. */
const scoreReference = (() => {
  const paires = String(golden['global.dayRatios30'])
    .split(' ')
    .map((p) => p.split('/').map(Number));
  const prevu = paires.reduce((s, [p]) => s + (p ?? 0), 0);
  const fait = paires.reduce((s, [, f]) => s + (f ?? 0), 0);
  return Math.round((fait / prevu) * 100);
})();

test.describe('stats', () => {
  test('les indicateurs correspondent aux valeurs de référence', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    await expect(page.getByTestId('score')).toHaveText(String(scoreReference));
    await expect(page.getByTestId('kpi-parfaits')).toHaveText(
      String(golden['global.perfectDays30']),
    );
    /* Le meilleur record toutes habitudes confondues, c'est celui d'`alc`. */
    await expect(page.getByTestId('kpi-record')).toHaveText(String(golden['habit.alc'].best));
    /* 138 minutes de focus enregistrées → 2 h 18. */
    await expect(page.getByTestId('kpi-focus')).toHaveText('2 h 18');
  });

  test('changer de fenêtre recalcule les indicateurs', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    const avant = await page.getByTestId('score').textContent();

    await page.getByRole('radio', { name: /^7 / }).click();
    await expect(page.getByTestId('kpi-parfaits')).not.toHaveText(
      String(golden['global.perfectDays30']),
    );
    await expect(page.getByTestId('score')).not.toHaveText(avant ?? '');
  });

  test('le classement descend du taux le plus haut au plus bas', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const lignes = page.locator('[data-score-row]');
    await expect(lignes).toHaveCount(6);

    const taux = await lignes.locator('td').first().allTextContents();
    const nombres = taux.map((t) => Number.parseInt(t, 10));
    expect([...nombres].sort((a, b) => b - a)).toEqual(nombres);
    /* `alc` est la mieux tenue sur 30 jours : 87 %. */
    expect(nombres[0]).toBe(golden['habit.alc'].pct30);
  });

  test('la carte de chaleur couvre six mois, en DOM', async ({ page }, info) => {
    /* Tâche 8.4 — la fenêtre DÉPEND de la place : six mois au-dessus de 768 px,
       trois en dessous, où vingt-six colonnes ne tiennent pas et où la carte
       défilait au lieu de se réorganiser. Ce test-ci parle du grand écran ; le
       comportement étroit et l'intitulé qui le suit sont éprouvés dans
       `recette-responsive.spec.ts`, avec leur raison. */
    test.skip(info.project.name === 'mobile', 'fenêtre réduite sous 768 px — voir 8.4');
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    /* 182 jours : la décision B7 garde le DOM sous 400 cellules. */
    await expect(page.locator('[data-heatmap] [data-cell]')).toHaveCount(182);
  });

  test('état vide : aucune statistique fabriquée', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByText('Pas encore de statistiques')).toBeVisible();
    await expect(page.getByTestId('score')).toHaveCount(0);
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
