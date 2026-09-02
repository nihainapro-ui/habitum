import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo } from './helpers/app';

/* Débordements MESURÉS, pas devinés — la version permanente de l'audit du
   2026-09-02. Un texte coupé par sa boîte ne se voit dans aucune capture
   comparée (la coupe est stable d'une exécution à l'autre) : seule la mesure
   `scrollWidth > clientWidth` l'attrape.

   CE QUI EST EXCLU, et pourquoi ce n'est pas de la complaisance :
   `sr-only` (boîte de 1 px par définition), `truncate` (troncature choisie,
   assumée par des points de suspension), les conteneurs défilants (déborder
   est leur fonction) et le halo du logo (`aria-hidden`, décoratif).

   `button` N'EST PAS exclu, à la différence de l'audit dont ce test hérite.
   Ce test ne mesure que les COUPES (`scrollWidth > clientWidth`) ; l'audit
   n'en a relevé aucune sur un bouton — ses relevés `button` étaient des
   SORTIES de boîte (débordement du parent), une autre mesure que celle-ci.
   Exclure `button` ici masquerait sans le vouloir le libellé d'un bouton
   réellement coupé, un vrai défaut, sans protéger contre quoi que ce soit. */

const LARGEURS = [360, 390, 768, 1060, 1440] as const;

/* Les cinq vues de la recette (voir `docs/handoff`), et non les trois de
   l'audit initial : `/app/tasks` et `/app/calendar` sont corrigées par des
   tâches ultérieures du même lot, qui ont besoin de ce filet pour ne pas
   travailler à l'aveugle. L'audit n'y a relevé aucune coupe, donc leur ajout
   ne crée aucun échec supplémentaire attendu.

   `/app/habits` rejoint la liste en clôture de lot (tâche 7) : c'est la vue
   que la tâche 5 vient de modifier (bouton crayon sur `HabitCard`), donc la
   moins couverte du lot avant cet ajout. Mesurée à la main à 360 px par la
   revue : aucun débordement, titres intacts. */
const VUES = [
  '/app',
  '/app/stats',
  '/app/today',
  '/app/tasks',
  '/app/calendar',
  '/app/habits',
] as const;

async function releverDebordements(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const releve: string[] = [];
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      if (st.overflowX === 'auto' || st.overflowX === 'scroll') continue;
      if (el.closest('[aria-hidden="true"], .sr-only, [class*="truncate"]')) continue;
      if (el.clientWidth === 0) continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        const texte = (el.textContent ?? '').trim().slice(0, 40);
        releve.push(`${el.tagName.toLowerCase()} « ${texte} » ${el.scrollWidth}>${el.clientWidth}`);
      }
    }
    return releve;
  });
}

for (const largeur of LARGEURS) {
  for (const vue of VUES) {
    test(`aucun texte coupé — ${vue} à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await ouvrirAvecDemo(page, vue);
      await attendreHydratation(page);

      expect(await releverDebordements(page)).toEqual([]);
    });
  }
}
