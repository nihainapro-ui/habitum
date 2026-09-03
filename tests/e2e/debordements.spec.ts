import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo } from './helpers/app';

/* Débordements MESURÉS, pas devinés — la version permanente de l'audit du
   2026-09-02. Un texte coupé par sa boîte ne se voit dans aucune capture
   comparée (la coupe est stable d'une exécution à l'autre) : seule la mesure
   `scrollWidth > clientWidth` l'attrape.

   CE QUI EST EXCLU, et pourquoi ce n'est pas de la complaisance :
   `sr-only` (boîte de 1 px par définition), `truncate` (troncature choisie,
   assumée par des points de suspension), les conteneurs défilants (déborder
   est leur fonction), le halo du logo (`aria-hidden`, décoratif) et la ligne
   d'un `Switch` — 3 px de marge négative DOCUMENTÉE là où le composant est
   défini (la cible tactile de 44 px dépasse volontairement le rail dessiné de
   38 px), rencontrée pour la première fois par ce filet en clôture de lot
   avec l'ajout de `/app/profile`, la première vue surveillée à en afficher
   une.

   RESSERRÉ EN REVUE FINALE : une première version marquait le `<label>`
   lui-même de `data-switch-row` et l'excluait via `closest` OU
   `querySelector` — cette dernière descend TOUT le sous-arbre du `<label>`,
   donc n'importe lequel de ses ANCÊTRES en hérite aussi (il a, quelque part
   en dessous, un descendant marqué), sans limite de hauteur. Sur
   `/app/profile`, cette formule écartait 8 éléments — la racine de la vue, la
   `<section>` « Préférences » entière, et surtout `span[data-reason]`, un
   VRAI texte traduit (`soundHint`, `vibrateHint`…) partagé par trois vues —
   alors que seuls 2 éléments débordent réellement.

   `components/ui/Switch.tsx` porte maintenant `data-switch-rail` sur le RAIL
   (`RadixSwitch.Root`), pas sur le `<label>`. Le rail lui-même ne déborde
   jamais (sa largeur est fixée à 44 px) ; ce sont ses deux ANCÊTRES DIRECTS —
   le `<label>`, puis le parent de ce `<label>` — qui absorbent le
   débordement, et seulement eux : le rembourrage du panneau y met fin plus
   haut dans l'arbre. `estRailOuConteneurDeSwitch` ci-dessous ne descend donc
   que de DEUX niveaux exacts sous chaque élément testé (enfant direct marqué,
   ou petit-enfant direct marqué) — jamais `closest` (remontée sans limite),
   jamais `querySelector` non borné (sous-arbre entier) : rien d'autre que ces
   deux ancêtres précis ne peut plus se glisser dans l'exclusion.

   `button` N'EST PAS exclu, à la différence de l'audit dont ce test hérite.
   Ce test ne mesure que les COUPES (`scrollWidth > clientWidth`) ; l'audit
   n'en a relevé aucune sur un bouton — ses relevés `button` étaient des
   SORTIES de boîte (débordement du parent), une autre mesure que celle-ci.
   Exclure `button` ici masquerait sans le vouloir le libellé d'un bouton
   réellement coupé, un vrai défaut, sans protéger contre quoi que ce soit.

   ANGLES MORTS ASSUMÉS, à ne pas découvrir en production :
   - Le périmètre est `main *` : l'en-tête, la barre de navigation basse et
     tout contenu porté par un portail (`Dialog`, tiroir/`Sheet`, palette,
     menu de `Select`) vivent HORS de `<main>` — React les monte dans un nœud
     séparé du corps du document — et ne sont donc jamais balayés ici. Un
     débordement dans un de ces trois emplacements resterait invisible à ce
     filet ; il demande son propre test, comme `tiroir-mobile.spec.ts` pour le
     tiroir mobile.
   - `el.clientWidth === 0` écarte aussi les boîtes EN LIGNE (`span`, `a`
     inline) sans dimension de mise en page propre — un `<span>` qui hérite de
     la largeur de son parent texte a un `clientWidth` nul par nature, pas par
     défaut d'affichage ; le mesurer ferait du bruit sans jamais protéger
     contre un vrai débordement, puisque son parent bloc, lui, reste balayé. */

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

async function releverDebordements(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    /* Le rail (`data-switch-rail`, posé par `components/ui/Switch.tsx` sur
       `RadixSwitch.Root`) ne déborde jamais lui-même — sa largeur est fixée.
       Ce sont ses deux ANCÊTRES DIRECTS qui absorbent les 3 px de la cible
       tactile : le `<label>` de la ligne, et le parent de ce `<label>`. On ne
       descend donc que de DEUX niveaux exacts sous l'élément testé — un
       enfant direct marqué, ou un petit-enfant direct marqué — jamais par
       `closest` (remontée sans limite) ni par un `querySelector` qui
       fouillerait tout le sous-arbre : rien au-delà de ces deux ancêtres
       précis ne peut matcher. */
    const estRailOuConteneurDeSwitch = (el: Element): boolean =>
      el.querySelector(':scope > [data-switch-rail]') !== null ||
      el.querySelector(':scope > * > [data-switch-rail]') !== null;

    const releve: string[] = [];
    let balayes = 0;
    let exclusSwitch = 0;
    for (const el of Array.from(document.querySelectorAll('main *'))) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      if (st.overflowX === 'auto' || st.overflowX === 'scroll') continue;
      if (el.closest('[aria-hidden="true"], .sr-only, [class*="truncate"]')) continue;
      if (estRailOuConteneurDeSwitch(el)) {
        exclusSwitch++;
        continue;
      }
      if (el.clientWidth === 0) continue;
      balayes++;
      if (el.scrollWidth > el.clientWidth + 1) {
        const texte = (el.textContent ?? '').trim().slice(0, 40);
        releve.push(`${el.tagName.toLowerCase()} « ${texte} » ${el.scrollWidth}>${el.clientWidth}`);
      }
    }
    return { releve, balayes, exclusSwitch };
  });
}

for (const largeur of LARGEURS) {
  for (const vue of VUES) {
    test(`aucun texte coupé — ${vue} à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await ouvrirAvecDemo(page, vue);

      const { releve, balayes, exclusSwitch } = await releverDebordements(page);

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
         fois (voir l'en-tête du fichier) : l'exclusion du Switch ne doit
         écarter QUE le `<label>` de sa ligne et le parent direct de ce
         `<label>`, jamais plus. `/app/profile` est la seule vue surveillée à
         afficher un interrupteur — 2 éléments y sont donc attendus ; 0
         partout ailleurs. Un chiffre plus HAUT que celui-ci n'est jamais un
         hasard : c'est l'exclusion qui recommence à couvrir plus que le rail
         et ses deux ancêtres directs — exactement le défaut relevé en revue
         finale, quand `span[data-reason]` s'y était glissé sans que rien ne
         le remarque. */
      const exclusSwitchAttendus = vue === '/app/profile' ? 2 : 0;
      expect(
        exclusSwitch,
        `${vue} à ${largeur}px : l'exclusion du Switch écarte ${exclusSwitch} élément(s), ${exclusSwitchAttendus} attendu(s) — un nombre plus haut est un trou qui s'élargit`,
      ).toBe(exclusSwitchAttendus);

      expect(releve).toEqual([]);
    });
  }
}
