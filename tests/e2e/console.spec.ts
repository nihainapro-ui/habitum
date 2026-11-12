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
  '/app/work',
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

/* Aucune violation de CSP — 12 novembre 2026.

   Une violation n'est PAS une erreur de console : le navigateur la range dans
   son panneau « Issues », que les deux tests ci-dessus n'écoutent pas. zod 4
   en a produit une sur chaque page (un `new Function` d'essai, attrapé, donc
   invisible), et c'est le budget Lighthouse — 0,96 au lieu de 1 — qui l'a
   signalée, sans dire laquelle. Ici, elle a un nom et une ligne. */
test('aucune violation de la politique de sécurité de contenu', async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('__cspViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const w = window as unknown as { __cspViolation: (v: string) => void };
      w.__cspViolation(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}`);
    });
  });

  /* La vitrine, puis l'application : les deux partagent des morceaux de code. */
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(violations, 'CSP sur /').toEqual([]);

  for (const route of ['/app/habits', '/app/settings']) {
    await ouvrirAvecDemo(page, route, { historique: true });
    await page.waitForLoadState('networkidle');
    expect(violations, `CSP sur ${route}`).toEqual([]);
  }
});
