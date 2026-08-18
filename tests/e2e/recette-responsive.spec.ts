import { expect, test, type Page } from '@playwright/test';
import { attendreHydratation, LARGEURS, ouvrirAvecDemo } from './helpers/app';

/* ============================================================================
   Recette responsive — tâche 8.4, référence T7.1.

   `recette-vues.spec.ts` couvre déjà le débordement de la PAGE aux quatre
   paliers, dans les trois thèmes. Ce fichier traite ce qu'il ne voit pas : un
   conteneur INTÉRIEUR qui déborde discrètement, sans jamais faire déborder le
   document parce qu'il défile tout seul.

   C'est le dernier point responsive resté ouvert depuis l'audit du prototype :
   la carte de chaleur doit **se réorganiser plutôt que défiler** sous 768 px.
   Un défilement horizontal dans un panneau est deux problèmes à la fois — la
   moitié droite est invisible sans geste, et elle est hors d'atteinte pour qui
   n'a ni souris ni doigt (le même défaut a été relevé sur la vitrine en
   phase 6, sur les tableaux comparatifs).
   ========================================================================= */

/** Conteneurs qui défilent horizontalement SANS que leur contenu soit
 *  atteignable autrement.
 *
 *  Le critère n'est pas « ça défile » : un bandeau de dates qui défile sous le
 *  doigt est un bon motif mobile. Le critère est celui de WCAG § 2.1.1, et
 *  c'est la règle `scrollable-region-focusable` d'axe qui le formule le mieux :
 *  un conteneur qui défile doit pouvoir être parcouru au clavier. Il l'est de
 *  deux façons — soit il porte lui-même `tabindex`, soit il contient des
 *  éléments focalisables, et le navigateur fait défiler en les atteignant.
 *
 *  C'est exactement ce qui séparait les deux cas trouvés ici : le bandeau de
 *  dates est fait de BOUTONS (on y arrive au Tab, la moitié droite n'est jamais
 *  perdue), tandis que la carte de chaleur était faite de `<span>` — six mois
 *  d'historique dont la moitié n'existait que pour qui pouvait glisser
 *  horizontalement. */
const conteneursInatteignables = async (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const FOCALISABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const trouves: string[] = [];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *'))) {
      const debordement = el.scrollWidth - el.clientWidth;
      if (debordement <= 1) continue;
      const style = getComputedStyle(el);
      if (!['auto', 'scroll'].includes(style.overflowX)) continue;

      /* Atteignable au clavier : soit le conteneur est focalisable, soit son
         contenu l'est. */
      if (el.matches('[tabindex]:not([tabindex="-1"])')) continue;
      if (el.querySelector(FOCALISABLE)) continue;

      const repere =
        Array.from(el.attributes)
          .filter((a) => a.name.startsWith('data-'))
          .map((a) => a.name)
          .join(',') || el.className.slice(0, 40);
      trouves.push(`${repere} (+${debordement} px)`);
    }
    return trouves;
  });

test('la carte de chaleur se réorganise au lieu de défiler sous 768 px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await ouvrirAvecDemo(page, '/app/stats', { historique: true });

  const carte = page.locator('[data-heatmap]');
  await expect(carte).toBeVisible();

  /* Elle tient dans son cadre — c'est cela, « se réorganiser » : moins de
     semaines affichées, pas les mêmes semaines poussées hors du cadre. */
  const debordement = await carte.evaluate((el) => {
    const cadre = el.parentElement!;
    return el.scrollWidth - cadre.clientWidth;
  });
  expect(debordement, `la carte déborde de ${debordement} px de son cadre`).toBeLessThanOrEqual(0);

  /* Et elle montre RÉELLEMENT moins : une carte vidée tiendrait aussi. */
  const cellules = await page.locator('[data-heatmap] [data-cell]').count();
  expect(cellules).toBeGreaterThan(60);
  expect(cellules).toBeLessThan(182);
});

test('à 1440 px, la carte de chaleur montre bien six mois', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ouvrirAvecDemo(page, '/app/stats', { historique: true });

  /* Le pendant du test précédent : réduire sur mobile ne doit pas réduire
     partout. Sans lui, supprimer la moitié des colonnes passerait les deux. */
  await expect(page.locator('[data-heatmap] [data-cell]')).toHaveCount(182);
});

test('l’intitulé de la carte dit la période réellement affichée', async ({ page }) => {
  /* G3 — aucun chiffre affiché ne doit être fabriqué. Annoncer « 6 derniers
     mois » au-dessus de trois mois de cellules est exactement cela. */
  await page.setViewportSize({ width: 390, height: 900 });
  await ouvrirAvecDemo(page, '/app/stats', { historique: true });
  await expect(page.getByText('3 derniers mois')).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByText('6 derniers mois')).toBeVisible();
});

const ROUTES = [
  '/app',
  '/app/today',
  '/app/habits',
  '/app/tasks',
  '/app/goals',
  '/app/calendar',
  '/app/stats',
  '/app/timer',
  '/app/notes',
  '/app/profile',
  '/app/settings',
] as const;

test('aucun contenu n’est enfermé dans un conteneur qui défile, aux quatre paliers', async ({
  page,
}) => {
  test.slow();
  await ouvrirAvecDemo(page, ROUTES[0], { historique: true });

  const releve: string[] = [];
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      await attendreHydratation(page);
      for (const c of await conteneursInatteignables(page)) {
        releve.push(`${route} · ${largeur} px — ${c}`);
      }
    }
  }
  expect(releve).toEqual([]);
});
