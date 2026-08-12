import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  ecrireEnBase,
  JOUR_FIGE,
  ouvrir,
  ouvrirAvecDemo,
  ouvrirVierge,
  verifierPaliers,
} from './helpers/app';

/* Vue « Aujourd'hui » — 05-SPEC-VUES.md § 2, plan 5 tâche 5.1.
   Le jeu de démonstration est daté du mercredi 5 août 2026. */

const ROUTE = '/app/today';

/** Les lignes de la file, sans les sous-listes qu'elles contiennent : une
 *  sous-tâche est aussi un `listitem`, et la compter fausserait tout. */
const lignes = (page: Page) => page.locator('[data-queue] > [data-row]');

test.describe('today', () => {
  test('affiche la file d’exécution du jour, triée par heure', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    /* Mercredi : `film` (vendredi et samedi) n'est pas planifié, les cinq
       autres le sont, et trois tâches sont datées d'aujourd'hui.
       Ordre attendu : 07:00 course · 10:00 réunion · 13:30 lecture ·
       15:00 méditation · 16:00 guitare · 20:00 chien · puis les sans-heure. */
    await expect(lignes(page)).toHaveCount(8);

    const intitules = await page.locator('[data-queue] > [data-row] [data-name]').allTextContents();
    expect(intitules.slice(0, 3)).toEqual([
      'Courir au moins 3 km',
      'Réunion de travail',
      'Lire au moins 20 pages',
    ]);

    await expect(page.getByText('4/8', { exact: true })).toBeVisible();
  });

  test('le compteur − / + journalise la valeur du jour', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    const eau = page.getByRole('checkbox', { name: "Boire 8 verres d'eau" });
    await expect(eau).not.toBeChecked();
    await expect(page.getByText('5/8 verres')).toBeVisible();

    await page.getByRole('button', { name: /Augmenter : Boire 8 verres/ }).click();
    await expect(page.getByText('6/8 verres')).toBeVisible();

    await page.getByRole('button', { name: /Diminuer : Boire 8 verres/ }).click();
    await expect(page.getByText('5/8 verres')).toBeVisible();
  });

  /* G9 — la règle la plus facile à casser au portage. Une habitude à plafond
     n'est jamais réussie d'avance : sur aujourd'hui, tant que rien n'est
     journalisé, la case est VIDE. */
  test("une habitude 'limit' n'est jamais réussie d'avance", async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    /* Le jeu de démonstration n'a pas d'habitude à plafond : on en ajoute une,
       sans aucune entrée du jour. C'est exactement le cas qui piège — la cible
       est atteinte « par défaut », et une lecture naïve la coche. */
    await ecrireEnBase(page, {
      habits: [
        {
          id: 'plafond',
          name: 'Pas plus de 2 cafés',
          category: 'health',
          goal: { kind: 'limit', target: 2, step: 1, unit: 'cafés' },
          mode: 'dow',
          days: [0, 1, 2, 3, 4, 5, 6],
          subItems: [],
          reminders: ['06:00'],
          archived: false,
          note: '',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    await ouvrir(page, ROUTE);

    const plafond = page.getByRole('checkbox', { name: 'Pas plus de 2 cafés' });
    await expect(plafond).not.toBeChecked();

    await page.getByRole('button', { name: /Augmenter : Pas plus de 2 cafés/ }).click();
    await expect(plafond).toBeChecked();

    /* Deux cafés : toujours dans le plafond. Le troisième le dépasse. */
    await page.getByRole('button', { name: /Augmenter : Pas plus de 2 cafés/ }).click();
    await expect(plafond).toBeChecked();
    await page.getByRole('button', { name: /Augmenter : Pas plus de 2 cafés/ }).click();
    await expect(plafond).not.toBeChecked();
  });

  test('le tiroir d’actions propose les actions de l’habitude', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    await page.getByRole('button', { name: /Plus d’actions : Méditer/ }).click();
    for (const action of ['Marquer réussi', 'Ignorer', 'Ajouter une note', 'Supprimer']) {
      await expect(page.getByRole('menuitem', { name: action })).toBeVisible();
    }
    /* « Reporter » n'a pas de sens pour une habitude : l'occurrence de demain
       existe déjà. Un bouton qui n'agit pas est un mensonge d'interface. */
    await expect(page.getByRole('menuitem', { name: 'Reprogrammer' })).toHaveCount(0);
  });

  test('le tiroir d’actions propose le report pour une tâche', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    await page.getByRole('button', { name: /Plus d’actions : Cours de guitare/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Reprogrammer' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Ignorer' })).toHaveCount(0);
  });

  test('supprimer puis annuler restaure l’élément', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const avant = await lignes(page).count();

    await page.getByRole('button', { name: /Plus d’actions : Cours de guitare/ }).click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await expect(lignes(page)).toHaveCount(avant - 1);

    await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
    await expect(lignes(page)).toHaveCount(avant);
    await expect(page.getByText('Cours de guitare')).toBeVisible();
  });

  test('reporter une tâche la sort de la journée, et l’annulation la ramène', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    /* Le nom reparaît dans le toast : on regarde la LIGNE, pas le texte. */
    const chien = lignes(page).filter({ hasText: 'Promener le chien' });

    await page.getByRole('button', { name: /Plus d’actions : Promener le chien/ }).click();
    await page.getByRole('menuitem', { name: 'Reprogrammer' }).click();
    await expect(chien).toHaveCount(0);

    await page.getByRole('status').getByRole('button', { name: 'Annuler' }).click();
    await expect(chien).toHaveCount(1);
  });

  test('les sous-tâches se cochent une par une', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    /* Les seules sous-tâches du jeu de démonstration sont datées de J+2, donc
       d'un jour à venir — non cochable par construction. On en pose donc une
       aujourd'hui : c'est la sous-tâche qu'on veut éprouver, pas la date. */
    await ecrireEnBase(page, {
      tasks: [
        {
          id: 'sous',
          name: 'Préparer le sac',
          category: 'home',
          date: JOUR_FIGE,
          time: '08:00',
          duration: 30,
          priority: 2,
          done: false,
          subTasks: [
            { label: 'Chaussures', done: true },
            { label: 'Gourde', done: false },
            { label: 'Clés', done: false },
          ],
          note: '',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    await ouvrir(page, ROUTE);

    await expect(page.getByText('1/3')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Gourde' }).click();
    await expect(page.getByText('2/3')).toBeVisible();
  });

  test('un jour à venir n’est pas cochable', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Jour suivant' }).click();

    await expect(page.getByRole('checkbox', { name: 'Méditer' })).toBeDisabled();

    await page.getByRole('button', { name: "Aujourd'hui", exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Méditer' })).toBeEnabled();
  });

  test('le filtre ne garde que les habitudes, puis que les tâches', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);

    await page.getByRole('radio', { name: 'Habitudes' }).click();
    await expect(lignes(page)).toHaveCount(5);

    await page.getByRole('radio', { name: 'Tâches' }).click();
    await expect(lignes(page)).toHaveCount(3);
  });

  test('état vide : rien de prévu', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await expect(page.getByText(/rien de prévu/i)).toBeVisible();
    await expect(lignes(page)).toHaveCount(0);
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
