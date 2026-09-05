import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge } from './helpers/app';
import { ETIQUETTES } from './helpers/a11y';

/* ============================================================================
   Accessibilité approfondie — tâche 8.3, référence T7.4.

   `a11y.spec.ts` audite les onze vues sur un compte VIERGE, et deux thèmes sur
   une seule vue. Cela laisse deux angles morts, et ce sont ceux où les défauts
   vivent :

   1. **Les vues PEUPLÉES.** Un état vide n'a ni carte, ni pastille, ni bloc de
      calendrier : la moitié des composants n'est jamais auditée. Le défaut de
      la vitrine relevé en phase 6 — un conteneur défilant non focalisable —
      n'existait justement que quand il y avait quelque chose à faire défiler.

   2. **Les onze vues × les TROIS thèmes.** Le contraste dépend du thème. Les
      contrôler sur une seule vue laisse deux tiers du produit sans vérification
      dans deux thèmes sur trois.

   S'y ajoutent trois contrôles qui ne sont pas du ressort d'axe, parce qu'ils
   demandent d'AGIR : la taille des cibles tactiles, l'alternative clavier au
   glisser-déposer, et la région live qui annonce les changements.

   Ce que ce fichier ne peut PAS faire : entendre. Les trois parcours au lecteur
   d'écran sont consignés dans `docs/a11y/rapport-lecteur-ecran.md` — une
   annonce correcte ne se déduit pas d'un attribut ARIA présent.
   ========================================================================= */

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
  '/app/work',
  '/app/profile',
  '/app/settings',
] as const;

const THEMES = ['neural', 'plasma', 'clinical'] as const;

/** Pose le thème, et attend qu'il soit RÉELLEMENT posé.
 *
 *  Les commandes portent `transition: color .2s` : auditer aussitôt après avoir
 *  changé `data-theme` mesure des couleurs INTERMÉDIAIRES, à mi-chemin entre
 *  l'ancien thème et le nouveau. On relève alors des violations qui n'existent
 *  dans aucun état stable du produit — et, pire, on risque de « corriger » un
 *  jeton sur la foi d'une mesure qui ne correspond à rien. La feuille injectée
 *  supprime les transitions ; la couleur mesurée est celle que l'œil finit par
 *  voir. */
const poserTheme = async (page: Page, theme: string): Promise<void> => {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; }',
  });
  await page.evaluate((t) => {
    document.documentElement.dataset['theme'] = t;
  }, theme);
};

const violationsGraves = async (page: Page): Promise<string[]> => {
  const { violations } = await new AxeBuilder({ page }).withTags([...ETIQUETTES]).analyze();
  return violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} nœud(s)`);
};

/* --------------------------------------------------------------------------
   1. axe sur les onze vues, dans les trois thèmes, compte PEUPLÉ.
   -------------------------------------------------------------------------- */

for (const theme of THEMES) {
  test(`axe — les onze vues peuplées, thème ${theme}`, async ({ page }) => {
    /* Onze audits axe dans un seul test : découpé en trente-trois, chacun
       rouvrirait le jeu de démonstration complet — plusieurs minutes pour
       vérifier une propriété qui ne dépend pas de la fraîcheur du semis. */
    test.slow();
    await ouvrirAvecDemo(page, ROUTES[0], { historique: true });

    const releve: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      await attendreHydratation(page);
      await poserTheme(page, theme);
      for (const v of await violationsGraves(page)) releve.push(`${route} · ${theme} — ${v}`);
    }
    expect(releve).toEqual([]);
  });
}

/* --------------------------------------------------------------------------
   2. Cibles tactiles — deux seuils, un seul bloquant, et un écart au plan
      qu'il vaut mieux écrire que subir.

   **La conformité est jugée par `target-size` d'axe**, la règle WCAG 2.2
   § 2.5.8 apportée par l'étiquette `wcag22aa` ci-dessus. Elle est déjà couverte
   par les trois audits de la section 1 ; ce qui suit ne la refait pas, il
   vérifie qu'elle a réellement TOURNÉ, puis mesure l'écart au confort.

   Pourquoi ne pas mesurer nous-mêmes les 24 px : le critère n'est pas « chaque
   cible fait 24 px ». Une cible plus petite CONFORME si elle est assez espacée
   de ses voisines — un cercle de 24 px centré sur elle ne doit croiser aucune
   autre cible. Une mesure maison qui ignore cette exception invente des
   violations : elle en a inventé trente-quatre ici, sur des cases à cocher de
   18 à 22 px qu'axe déclare conformes, à raison. Le produit passe `target-size`
   sur les onze vues.

   **44 px est le CONFORT**, pas la norme : la recommandation d'Apple et
   d'Android, et ce que demande le plan 8. L'atteindre partout voudrait dire
   épaissir toutes les commandes de l'application — un remaniement visuel que
   la phase n'a pas budgété et qui s'écarterait du prototype, référence visuelle
   du portage. Il est donc MESURÉ et RAPPORTÉ, jamais passé sous silence : le
   compte part au journal du test, et `docs/a11y/rapport-lecteur-ecran.md` en
   porte la liste datée. Un seuil qu'on abaisse sans le dire est un seuil qu'on
   a franchi.
   -------------------------------------------------------------------------- */

/** Seuil de confort — Apple HIG et Material. Rapporté, pas imposé. */
const CIBLE_CONFORT = 44;

/** Commandes trop petites, avec leur taille — le message d'échec doit dire
 *  QUOI corriger, pas seulement qu'il y a quelque chose à corriger. */
const ciblesTropPetites = async (page: Page, minimum: number): Promise<string[]> =>
  page.evaluate((min) => {
    const SELECTEUR = 'button, a[href], input:not([type="hidden"]), select, [role="checkbox"]';
    const trop: string[] = [];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>(SELECTEUR))) {
      const r = el.getBoundingClientRect();
      /* Un élément masqué n'est pas une cible manquée : il n'est pas une
         cible. On ne juge que ce qui est réellement à l'écran. */
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;

      /* Une commande INLINE dans une phrase est explicitement exclue par
         WCAG 2.2 : l'agrandir déformerait le texte qui la porte. */
      if (style.display.startsWith('inline') && !style.display.includes('flex')) continue;

      /* Le lien d'évitement est une affordance de CLAVIER : masqué tant qu'il
         n'a pas le focus, il n'est jamais atteint au doigt. Le mesurer comme
         une cible tactile reviendrait à exiger 44 px d'un élément que le
         tactile ne voit pas. */
      if (el.matches('.sr-only, .sr-only *')) continue;

      if (r.width < min || r.height < min) {
        const nom = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? '';
        trop.push(
          `${el.tagName.toLowerCase()}[${nom}] ${Math.round(r.width)}×${Math.round(r.height)}`,
        );
      }
    }
    return trop;
  }, minimum);

test('la règle de taille des cibles tourne, et l’écart au confort est chiffré', async ({
  page,
}, info) => {
  /* Le tactile se mesure sur un GABARIT TACTILE. À 1440 px avec une souris, la
     contrainte n'a pas de sens : le pointeur est précis au pixel, et WCAG 2.2
     § 2.5.8 vise le doigt. */
  test.skip(info.project.name !== 'mobile', 'contrainte du doigt, pas du pointeur');
  test.slow();

  await ouvrirAvecDemo(page, ROUTES[0], { historique: true });

  /* LA RÈGLE A-T-ELLE TOURNÉ ? La question n'est pas rhétorique : le budget
     Lighthouse de la phase 6 était vert parce qu'il n'assertait rien. Une
     étiquette mal orthographiée, une version d'axe sans `target-size`, et le
     contrôle de la section 1 passerait au vert sans avoir rien mesuré. On exige
     donc des NŒUDS RÉELLEMENT ÉVALUÉS, et zéro indécis. */
  await page.goto('/app/tasks');
  await attendreHydratation(page);
  const rapport = await new AxeBuilder({ page }).withTags([...ETIQUETTES]).analyze();
  const noeuds = (liste: { id: string; nodes: unknown[] }[]) =>
    liste.filter((r) => r.id === 'target-size').reduce((n, r) => n + r.nodes.length, 0);

  expect(
    noeuds(rapport.passes) + noeuds(rapport.violations),
    'target-size n’a rien évalué',
  ).toBeGreaterThan(0);
  expect(noeuds(rapport.incomplete), 'target-size laisse des cibles indécises').toBe(0);
  expect(noeuds(rapport.violations)).toBe(0);

  /* L'écart au CONFORT, mesuré et écrit. Il ne fait pas échouer : il empêche de
     découvrir la dette comme une surprise, et permet de la voir se réduire
     d'une version à l'autre. */
  const sousConfort: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await attendreHydratation(page);
    for (const c of await ciblesTropPetites(page, CIBLE_CONFORT))
      sousConfort.push(`${route} — ${c}`);
  }

  console.log(
    `cibles tactiles — WCAG 2.2 § 2.5.8 : conforme (${noeuds(rapport.passes)} nœuds évalués sur /app/tasks). ` +
      `${sousConfort.length} commande(s) sous ${CIBLE_CONFORT} px, seuil de CONFORT non bloquant :`,
  );
  for (const c of sousConfort) console.log(`  · ${c}`);
});

/* --------------------------------------------------------------------------
   3. L'alternative clavier au glisser-déposer — TESTÉE, pas déclarée.
      C'est le point le plus exposé du produit : un geste continu qu'on déclare
      volontiers accessible sans jamais l'éprouver.
   -------------------------------------------------------------------------- */

test('le glisser-déposer du calendrier a une alternative clavier atteignable au Tab', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'le mode grille n’existe pas sous 768 px');
  await ouvrirAvecDemo(page, '/app/calendar');

  /* ATTEIGNABLE : un bloc déplaçable qui n'est pas dans l'ordre de tabulation
     est inaccessible à qui n'a pas de souris, quelles que soient ses touches. */
  const bloc = page.locator('[data-event]').first();
  await expect(bloc).toHaveAttribute('tabindex', /^0$/);

  await bloc.focus();
  await expect(bloc).toBeFocused();

  /* Et le mode déplacement s'ouvre au clavier, avec un état ANNONCÉ — un mode
     invisible est un mode dont on ne sait pas qu'on y est. */
  await page.keyboard.press('Enter');
  await expect(bloc).toHaveAttribute('data-moving', 'true');
  await page.keyboard.press('Escape');
  await expect(bloc).not.toHaveAttribute('data-moving', 'true');
});

/* --------------------------------------------------------------------------
   4. Région live — un changement qui ne s'annonce pas n'existe pas pour qui
      n'a pas l'écran sous les yeux.
   -------------------------------------------------------------------------- */

test('les changements passent par une région live polie', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/today');

  /* La région existe AVANT l'événement : une région insérée en même temps que
     son contenu n'est pas annoncée par la plupart des lecteurs.

     `#__next-route-announcer__` est EXCLU : il appartient à Next, qui annonce
     les changements de route en `assertive` — un choix de cadre, délibéré et
     hors de notre main. Le confondre avec nos régions ferait échouer le
     contrôle sur du code qu'on ne peut pas corriger, et cacherait ce qu'il
     doit voir. */
  const live = page.locator('[aria-live]:not(#__next-route-announcer__)');
  await expect(live.first()).toBeAttached();
  const politesses = await live.evaluateAll((n) => n.map((e) => e.getAttribute('aria-live')));
  /* `assertive` interrompt la lecture en cours : réservé à l'urgence, et le
     produit n'en a aucune. */
  expect(politesses).toEqual(politesses.map(() => 'polite'));

  /* Et elle est réellement alimentée : supprimer une ligne annonce l'annulation
     possible, pas seulement l'affiche. */
  await page.getByRole('button', { name: /Plus d’actions : Cours de guitare/ }).click();
  await page.getByRole('menuitem', { name: 'Supprimer' }).click();
  await expect(page.getByRole('status')).toContainText(/annuler/i);
});

/* --------------------------------------------------------------------------
   5. Le curseur personnalisé est DÉSACTIVÉ par défaut. Un réticule qui suit la
      souris désoriente, masque le pointeur système et ne survit pas au
      mouvement réduit. Le prototype le posait d'office.
   -------------------------------------------------------------------------- */

test('le curseur réticule est désactivé par défaut', async ({ page, isMobile }) => {
  await ouvrirVierge(page, '/app/profile');

  const interrupteur = page.getByRole('switch', { name: /curseur/i });

  /* Sur pointeur grossier, la ligne n'est plus seulement décochée : elle est
     ABSENTE. Un téléphone n'a pas de curseur à remplacer, et `cursor: none`
     n'y veut rien dire — un réglage qui n'a aucun sens sur l'appareil n'a rien
     à y expliquer. Le réticule n'y est pas monté non plus. */
  if (isMobile) {
    await expect(interrupteur).toHaveCount(0);
    return;
  }

  await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
});
