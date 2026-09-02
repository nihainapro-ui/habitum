import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Habitudes » — 05-SPEC-VUES.md § 4, plan 5 tâche 5.2. */

const ROUTE = '/app/habits';

test.describe('habits', () => {
  test('une carte par habitude, archivées comprises', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });
    await expect(page.getByRole('article')).toHaveCount(6);
  });

  /* Critère de sortie n° 1 de la phase : la vue affiche LES MÊMES CHIFFRES que
     le prototype à la date figée. Les trois nombres sont lus dans
     `golden.json` — si le portage dérive, c'est ici qu'on le voit, à l'écran
     et non seulement dans le domaine. */
  test('les métriques affichées correspondent aux valeurs de référence', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    for (const [id, nom] of [
      ['alc', "Ne pas boire d'alcool"],
      ['water', "Boire 8 verres d'eau"],
      ['read', 'Lire au moins 20 pages'],
      ['run', 'Courir au moins 3 km'],
      ['med', 'Méditer'],
      ['film', 'Regarder un film'],
    ] as const) {
      const attendu = golden[`habit.${id}`];
      const carte = page.getByRole('article', { name: nom });
      await expect(carte.getByTestId('streak'), `série de ${id}`).toHaveText(
        String(attendu.streak),
      );
      await expect(carte.getByTestId('best'), `record de ${id}`).toHaveText(String(attendu.best));
      await expect(carte.getByTestId('pct30'), `taux 30 j de ${id}`).toHaveText(
        `${attendu.pct30} %`,
      );
    }
  });

  test('les sept pastilles suivent la semaine courante', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const carte = page.getByRole('article', { name: 'Méditer' });
    await expect(carte.getByRole('checkbox')).toHaveCount(7);
    /* Le 5 août 2026 est un mercredi : la semaine va du lundi 3 au dimanche 9. */
    await expect(carte.getByRole('checkbox', { name: /lundi 3 août/ })).toBeVisible();
    await expect(carte.getByRole('checkbox', { name: /dimanche 9 août/ })).toBeVisible();
  });

  test('cocher une pastille journalise le jour, et la série suit', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const carte = page.getByRole('article', { name: "Boire 8 verres d'eau" });
    const mercredi = carte.getByRole('checkbox', { name: /mercredi 5 août/ });
    await expect(mercredi).not.toBeChecked();

    await mercredi.click();
    await expect(mercredi).toBeChecked();
    /* `golden` donne 2 pour l'eau : le jour courant fait passer la série à 3. */
    await expect(carte.getByTestId('streak')).toHaveText('3');
  });

  test('une pastille de jour non planifié ne se coche pas', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    /* « Regarder un film » n'est planifié que vendredi et samedi. */
    const carte = page.getByRole('article', { name: 'Regarder un film' });
    await expect(carte.getByRole('checkbox', { name: /lundi 3 août/ })).toBeDisabled();
    await expect(carte.getByRole('checkbox', { name: /vendredi 7 août/ })).toBeDisabled(); // à venir
  });

  test('la fréquence et l’objectif sont écrits en toutes lettres', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { historique: true });

    const eau = page.getByRole('article', { name: "Boire 8 verres d'eau" });
    await expect(eau).toContainText('Quotidiennement');
    await expect(eau).toContainText('8 verres');

    const course = page.getByRole('article', { name: 'Courir au moins 3 km' });
    await expect(course).toContainText('3 km');
  });

  test('état vide : aucune habitude', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByRole('article')).toHaveCount(0);
    await expect(page.getByText('Aucune habitude')).toBeVisible();
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

  test('le crayon ouvre l’éditeur — l’édition cesse d’être un secret', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await attendreHydratation(page);

    /* Le nom cliquable existait déjà (HabitCard.tsx:45) ; rien ne le signalait.
       Le crayon rend l'action VISIBLE, du même dessin que Work et Tâches.
       Le nom de l'habitude est dans le libellé du bouton — c'est ce que fait
       déjà ProjectCard, et c'est ce qui distingue les crayons entre eux pour
       un lecteur d'écran. */
    await page
      .getByRole('button', { name: /^Modifier / })
      .first()
      .click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
