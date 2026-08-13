import { expect, test, type Page } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge } from './helpers/app';

/* Aucune erreur de console sur aucune vue — critère de `RECETTE.md` § 1.

   Ce test existe parce qu'une clé de libellé manquante (`app.emStatsT`) est
   passée à travers toute la recette de la vue Statistiques : next-intl ne lève
   pas, il journalise et affiche le CHEMIN DE LA CLÉ. Les sept tests de la vue
   étaient verts, l'écran affichait « app.emStatsT ». Une vérification qu'on
   n'automatise pas est une vérification qu'on ne fait pas. */

const ROUTES = [
  '/app',
  '/app/today',
  '/app/calendar',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/stats',
  '/app/timer',
  '/app/notes',
  '/app/profile',
  '/app/settings',
];

const ecouter = (page: Page): string[] => {
  const erreurs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') erreurs.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => erreurs.push(`pageerror: ${e.message}`));
  return erreurs;
};

test('aucune erreur de console sur les onze vues, compte de démonstration', async ({ page }) => {
  const erreurs = ecouter(page);

  for (const route of ROUTES) {
    await ouvrirAvecDemo(page, route, { historique: true });
    expect(erreurs, `console sur ${route}`).toEqual([]);
  }
});

test('aucune erreur de console sur les onze vues, compte vierge', async ({ page }) => {
  const erreurs = ecouter(page);

  for (const route of ROUTES) {
    await ouvrirVierge(page, route);
    expect(erreurs, `console sur ${route}`).toEqual([]);
  }
});
