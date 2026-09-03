import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo } from './helpers/app';
import { releverDebordements } from './helpers/debordement';

/* La mesure vit dans `helpers/debordement.ts` depuis le lot B : le tableau d'un
   projet ne s'atteint pas par une route (l'ouverture est un état local de
   `WorkView`), donc `vue-work.spec.ts` la réemploie plutôt que de la recopier —
   une deuxième copie de la doctrine d'exclusion aurait divergé de celle-ci au
   premier ajustement. */

const LARGEURS = [360, 390, 768, 1060, 1440] as const;

/* Les cinq vues de la recette (voir `docs/handoff`), et non les trois de
   l'audit initial : `/app/tasks` et `/app/calendar` sont corrigées par des
   tâches ultérieures du même lot, qui ont besoin de ce filet pour ne pas
   travailler à l'aveugle. L'audit n'y a relevé aucune coupe, donc leur ajout
   ne crée aucun échec supplémentaire attendu.

   `/app/habits` rejoint la liste en clôture de lot (tâche 7) : c'est la vue
   que la tâche 5 vient de modifier (bouton crayon sur `HabitCard`), donc la
   moins couverte du lot avant cet ajout. Mesurée à la main à 360 px par la
   revue : aucun débordement, titres intacts.

   `/app/profile` rejoint la liste en revue finale : dernière vue du produit à
   porter le même motif de tuile (`rounded-field`, libellé en petites
   majuscules) sans être surveillée — un oubli, pas un choix. */
const VUES = [
  '/app',
  '/app/stats',
  '/app/today',
  '/app/tasks',
  '/app/calendar',
  '/app/habits',
  '/app/profile',
] as const;

for (const largeur of LARGEURS) {
  for (const vue of VUES) {
    test(`aucun texte coupé — ${vue} à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await ouvrirAvecDemo(page, vue);

      const { releve, balayes, exclusSwitch, exclusSwitchAttendus } =
        await releverDebordements(page);

      /* Le filet peut passer au vert sans avoir rien mesuré : un `<main>`
         renommé, déplacé, ou une route qui ne rend plus rien, et
         `querySelectorAll('main *')` rend `[]` — zéro débordement, zéro
         preuve, 35 tests verts pour de mauvaises raisons. On assertionne donc
         le nombre d'éléments RETENUS après exclusions, pas seulement
         l'absence de coupe : sous 20, quelque chose d'anormal s'est produit
         et le test doit le dire plutôt que se taire. */
      expect(
        balayes,
        `${vue} à ${largeur}px : seulement ${balayes} élément(s) balayé(s) — la mesure est suspecte, pas concluante`,
      ).toBeGreaterThan(20);

      /* GARDE-FOU contre le trou que ce filet a lui-même creusé une première
         fois (voir l'en-tête de `helpers/debordement.ts`) : l'exclusion du
         Switch ne doit écarter QUE le `<label>` de sa ligne et le parent
         direct de ce `<label>`, jamais plus. L'attente n'est plus écrite en
         dur par ROUTE (`/app/profile` ? 2 : 0) : elle dérive de la PAGE
         elle-même — `exclusSwitchAttendus`, rendu par `releverDebordements`,
         compte les parents directs et grands-parents directs des rails
         RÉELLEMENT rendus. Un compte en dur par route confondait la route
         avec l'appareil : `ProfileView` ne rend l'interrupteur que sur
         pointeur fin, et le projet mobile (Pixel 7) n'en affiche aucun — 0
         rail, 0 ancêtre à écarter, et un garde-fou qui réclamait pourtant 2 à
         chaque exécution. Un chiffre `exclusSwitch` plus HAUT que
         `exclusSwitchAttendus` reste, lui, toujours un trou qui s'élargit :
         c'est l'exclusion qui recommence à couvrir plus que le rail et ses
         deux ancêtres directs — exactement le défaut relevé en revue finale,
         quand `span[data-reason]` s'y était glissé sans que rien ne le
         remarque. */
      expect(
        exclusSwitch,
        `${vue} à ${largeur}px : l'exclusion du Switch écarte ${exclusSwitch} élément(s), ${exclusSwitchAttendus} attendu(s) d'après les rails réellement rendus — un nombre plus haut est un trou qui s'élargit`,
      ).toBe(exclusSwitchAttendus);

      expect(releve).toEqual([]);
    });
  }
}
