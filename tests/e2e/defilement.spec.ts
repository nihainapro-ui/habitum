import { expect, test, type Page } from '@playwright/test';
import { ouvrirAvecDemo } from './helpers/app';

/* ============================================================================
   Défilement — ce qui « accroche », et ce qui n'accrochait pas.

   CE QUE LA MESURE A DIT, ET QU'IL FAUT ÉCRIRE. Le défilement a été profilé sur
   téléphone émulé, processeur bridé 4×, sur les deux vues les plus chargées :
   p50 à 17 ms, soit le plancher du bridage. Retirer le `backdrop-filter` de
   l'en-tête, poser `content-visibility` sur les cartes, rendre l'en-tête non
   collant : AUCUNE de ces trois pistes ne change quoi que ce soit. Le produit
   ne fait pas de travail lourd par image.

   Ce qui accrochait réellement n'est pas une affaire d'images par seconde,
   c'est le CHAÎNAGE : sept conteneurs défilaient à l'intérieur de la page sans
   retenir leur défilement. On fait glisser le bandeau des jours, on arrive au
   bout, et le geste continue dans la page — ou l'on défile l'éditeur ouvert et
   c'est la page derrière qui bouge. `overscroll-behavior: contain` le coupe.

   Ce test garde la règle : un conteneur ajouté demain sans elle le fera
   échouer.
   ========================================================================= */

/** Conteneurs qui défilent DANS la page et ne retiennent pas leur geste. */
const chainageNonRetenu = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const fuites: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const st = getComputedStyle(el);
      const defileX = ['auto', 'scroll'].includes(st.overflowX) && el.scrollWidth > el.clientWidth;
      const defileY =
        ['auto', 'scroll'].includes(st.overflowY) && el.scrollHeight > el.clientHeight;
      if (!defileX && !defileY) continue;

      /* `contain` et `none` conviennent tous deux : les deux coupent le
         chaînage. Seul `auto`, le défaut, le laisse passer. */
      const retenu = (v: string) => v.includes('contain') || v.includes('none');
      if (defileX && !retenu(st.overscrollBehaviorX)) {
        fuites.push(`${repere(el)} — horizontal (${st.overscrollBehaviorX})`);
      }
      if (defileY && !retenu(st.overscrollBehaviorY)) {
        fuites.push(`${repere(el)} — vertical (${st.overscrollBehaviorY})`);
      }
    }
    return fuites;

    function repere(el: HTMLElement): string {
      const data = Array.from(el.attributes)
        .filter((a) => a.name.startsWith('data-'))
        .map((a) => a.name)
        .join(',');
      return data || el.className.slice(0, 48) || el.tagName.toLowerCase();
    }
  });

const ROUTES = ['/app', '/app/today', '/app/stats', '/app/calendar', '/app/work'] as const;

for (const route of ROUTES) {
  test(`aucun conteneur ne laisse fuir son défilement — ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ouvrirAvecDemo(page, route, { historique: true });
    expect(await chainageNonRetenu(page)).toEqual([]);
  });
}

test('l’éditeur ouvert ne fait pas défiler la page derrière lui', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ouvrirAvecDemo(page, '/app/tasks');

  await page
    .getByRole('button', { name: /modifier/i })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();

  expect(await chainageNonRetenu(page)).toEqual([]);
});

test('un ancrage n’atterrit pas sous l’en-tête collant', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ouvrirAvecDemo(page, '/app', { historique: true });

  /* `scroll-padding-top` réserve la hauteur de l'en-tête. Sans lui, le lien
     d'évitement amène le contenu DERRIÈRE la barre : on voit le vide au-dessus
     de ce qu'on cherchait. */
  const marge = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
  );
  const enTete = (await page.locator('header').first().boundingBox())!.height;
  expect(marge, 'la marge doit couvrir l’en-tête').toBeGreaterThanOrEqual(enTete);
});
