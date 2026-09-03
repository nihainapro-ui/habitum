import type { Page } from '@playwright/test';

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

/** Largeurs de la mesure FINE (`releverDebordements`, coupe par boîte), pas
 *  celle du défilement de document.
 *
 *  DEUX CONSTANTES `LARGEURS` COEXISTENT DANS `tests/e2e/`, et ce n'est pas un
 *  oubli : `helpers/app.ts` exporte déjà une `LARGEURS` à QUATRE valeurs (390,
 *  768, 1060, 1440 — les paliers du prototype), consommée par `verifierPaliers`
 *  pour la mesure GROSSIÈRE (`document.documentElement.scrollWidth`). Celle-ci
 *  en a CINQ, avec 360 en plus : 360 est le plus étroit des appareils réels
 *  couverts par la recette, et seule la mesure par boîte (`releverDebordements`)
 *  y a déjà trouvé une coupe qu'un débordement de document ne voit jamais. Les
 *  deux constantes ne se recouvrent donc pas par accident — les nommer pareil
 *  aurait fait choisir la mauvaise par un import mal résolu. Ne renomme pas
 *  celle de `helpers/app.ts` : elle sert des fichiers hors de ce lot. */
export const LARGEURS_MESUREES = [360, 390, 768, 1060, 1440] as const;

export async function releverDebordements(page: Page): Promise<{
  releve: string[];
  balayes: number;
  exclusSwitch: number;
  exclusSwitchAttendus: number;
}> {
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

    /* CE QUE L'EXCLUSION DEVRAIT ÉCARTER, calculé indépendamment d'elle.
       Le garde-fou comparait `exclusSwitch` à un nombre écrit en dur par route
       (« 2 sur /app/profile, 0 ailleurs »). C'était faux dès qu'on changeait
       d'appareil et non de route : `ProfileView` ne rend l'interrupteur que sur
       pointeur FIN, et le projet mobile émule un Pixel 7 — zéro rail, donc zéro
       ancêtre à écarter, et un garde-fou qui réclamait 2. Cinq échecs par
       exécution, sur le seul projet où personne ne l'avait lancé.
       L'attente se DÉDUIT donc de la page : les parents directs et grands-parents
       directs des rails réellement rendus. C'est une seconde écriture de la même
       règle, pas la même : si l'exclusion se remet à remonter par `closest` ou à
       fouiller un sous-arbre entier, elle écartera PLUS que cet ensemble et les
       deux chiffres cesseront de coïncider — ce que le garde-fou existe pour
       dire. */
    const attendus = new Set<Element>();
    for (const rail of Array.from(document.querySelectorAll('main [data-switch-rail]'))) {
      const p = rail.parentElement;
      if (p) attendus.add(p);
      if (p?.parentElement) attendus.add(p.parentElement);
    }

    return { releve, balayes, exclusSwitch, exclusSwitchAttendus: attendus.size };
  });
}
