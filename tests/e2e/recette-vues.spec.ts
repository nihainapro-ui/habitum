import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* Recette de sortie de phase — `RECETTE.md` § 1 et critères 3, 4 et 7 du
   plan 5.

   Les tests par vue éprouvent chacun UNE vue dans SON état. Celui-ci passe sur
   les onze, dans les trois thèmes et les deux langues, et vérifie ce qu'aucun
   test de vue ne peut voir : qu'aucune n'est restée un marqueur de portage,
   qu'aucune ne déborde, et qu'aucune ne dépend de la langue ou du thème pour
   tenir debout. */

const VUES = [
  { route: '/app', titre: { fr: 'Tableau de bord', en: 'Dashboard' } },
  { route: '/app/today', titre: { fr: "Aujourd'hui", en: 'Today' } },
  { route: '/app/calendar', titre: { fr: 'Calendrier', en: 'Calendar' } },
  { route: '/app/habits', titre: { fr: 'Habitudes', en: 'Habits' } },
  { route: '/app/tasks', titre: { fr: 'Tâches', en: 'Tasks' } },
  { route: '/app/goals', titre: { fr: 'Objectifs', en: 'Goals' } },
  { route: '/app/stats', titre: { fr: 'Statistiques', en: 'Statistics' } },
  { route: '/app/timer', titre: { fr: 'Minuteur', en: 'Timer' } },
  { route: '/app/notes', titre: { fr: 'Notes', en: 'Notes' } },
  { route: '/app/profile', titre: { fr: 'Profil', en: 'Profile' } },
  { route: '/app/settings', titre: { fr: 'Paramètres', en: 'Settings' } },
] as const;

const THEMES = ['neural', 'plasma', 'clinical'] as const;

const poserTheme = async (page: Page, theme: string) => {
  await page.evaluate((t) => {
    document.documentElement.dataset['theme'] = t;
  }, theme);
};

test('les onze vues portent leur titre, en français', async ({ page }) => {
  for (const vue of VUES) {
    await ouvrirAvecDemo(page, vue.route, { historique: true });
    await expect(page.getByRole('heading', { level: 1 }), vue.route).toHaveText(vue.titre.fr);
  }
});

test('les onze vues portent leur titre, en anglais', async ({ page }) => {
  /* La bascule de langue vit dans les réglages : c'est de là qu'on part. */
  await ouvrirAvecDemo(page, '/app/settings', { historique: true });
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  for (const vue of VUES) {
    await page.goto(vue.route);
    await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
    await expect(page.getByRole('heading', { level: 1 }), vue.route).toHaveText(vue.titre.en);
  }
});

test('aucune vue ne déborde, dans les trois thèmes', async ({ page }) => {
  /* Un seul semis : 44 remplissages de base coûtaient plus que le délai du
     test, pour vérifier une propriété qui ne dépend pas des données écrites
     mais de leur PRÉSENCE. */
  await ouvrirAvecDemo(page, VUES[0].route, { historique: true });

  for (const largeur of [390, 768, 1060, 1440]) {
    await page.setViewportSize({ width: largeur, height: 900 });

    for (const vue of VUES) {
      await page.goto(vue.route);
      await expect(page.locator('[data-hydrated="true"]')).toBeAttached();
      for (const theme of THEMES) {
        await poserTheme(page, theme);
        const deborde = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(deborde, `${vue.route} · ${theme} · ${largeur} px`).toBe(false);
      }
    }
  }
});

test('axe ne relève rien de sérieux sur les onze vues, compte peuplé', async ({ page }) => {
  /* Onze audits axe dans un seul test, sur une machine qui en fait tourner huit
     en parallèle : l'injection d'axe dépasse parfois le délai par défaut et le
     test échoue sur une erreur d'outillage, pas sur une violation. Le budget est
     triplé plutôt que le test découpé — découpé, il rouvrirait onze fois le jeu
     de démonstration complet. */
  test.slow();

  for (const vue of VUES) {
    await ouvrirAvecDemo(page, vue.route, { historique: true });
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(graves.map((v) => `${vue.route} — ${v.id}`)).toEqual([]);
  }
});

test('aucune vue ne prétend rester à porter', async ({ page }) => {
  for (const vue of VUES) {
    await ouvrirVierge(page, vue.route);
    await expect(page.getByText('Ouvrir le prototype'), vue.route).toHaveCount(0);
    await expect(page.getByText('05-SPEC-VUES'), vue.route).toHaveCount(0);
  }
});
