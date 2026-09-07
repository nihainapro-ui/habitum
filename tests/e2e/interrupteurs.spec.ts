import { expect, test } from '@playwright/test';
import { ouvrirVierge } from './helpers/app';

/* Tâche 5.4 — G3 : aucun interrupteur mort.

   Ce test est GÉNÉRIQUE, et c'est tout son intérêt : il ne connaît pas la
   liste des réglages. Un interrupteur ajouté demain y passe sans qu'on ait
   pensé à l'y inscrire, et il n'a que deux façons d'être accepté :

   - il est actionnable, et son état CHANGE quand on le manœuvre ;
   - il est désactivé, et il dit pourquoi — visiblement, et pour les lecteurs
     d'écran (`aria-describedby`).

   Il n'y a pas de troisième cas. Un interrupteur allumé qui ne déclenche rien
   est un mensonge d'interface, et un réglage décoratif est exactement ce que la
   phase 5 devait faire disparaître. */

/* Permission ACCORDÉE d'entrée : ici on éprouve l'effet de l'interrupteur, pas
   le parcours de permission — celui-là a son propre fichier
   (`notifications.spec.ts`), et il vérifie justement qu'on ne demande rien
   sans geste. */
test.use({ permissions: ['notifications'] });

const ROUTES_AVEC_INTERRUPTEURS = ['/app/settings'];

for (const route of ROUTES_AVEC_INTERRUPTEURS) {
  test(`chaque interrupteur de ${route} a un effet observable, ou dit pourquoi il n’en a pas`, async ({
    page,
  }) => {
    await ouvrirVierge(page, route);

    /* ITÉRATION PAR NOM, ET NON PAR INDICE — et ce n'est pas une coquetterie.
       Depuis les rappels (spec du 2026-09-07), la liste des interrupteurs de
       cette page CHANGE quand on la manœuvre : allumer l'interrupteur maître
       des notifications fait apparaître les réglages par source. Un
       `nth(i)` lu avant le clic et réévalué après ne désignait alors plus le
       même bouton, et le contrôle échouait sur un interrupteur qu'il n'avait
       jamais touché.

       On relit donc la liste à chaque tour et on traite le premier nom encore
       inconnu. Deux effets, tous deux voulus : le contrôle redevient
       déterministe, et il COUVRE les interrupteurs qui n'apparaissent qu'une
       fois un autre allumé — ce qu'un balayage à indices ne pouvait pas faire.

       Corollaire assumé : on ne remet plus les interrupteurs comme on les a
       trouvés. Rien n'en dépend — la page est neuve à chaque test — et les
       remettre refermerait justement ce qu'on veut visiter. */
    /* Chaque interrupteur traité est MARQUÉ dans le DOM, et on prend toujours
       le premier qui ne l'est pas. Ni indice — la liste bouge —, ni nom :
       le nom accessible d'un interrupteur est composé par le navigateur à
       partir de son libellé ET de sa raison, avec une espace que
       `textContent` ne met pas. Un marqueur ne se compose pas et ne se
       normalise pas ; il désigne exactement l'élément qu'on vient de voir.

       On travaille sur une POIGNÉE (`elementHandle`) et non sur un localisateur :
       cliquer peut faire apparaître d'autres interrupteurs, et un localisateur
       réévalué après coup ne désignerait plus le même bouton — c'est
       exactement ce qui faisait échouer ce contrôle sur un interrupteur qu'il
       n'avait jamais touché. */
    const MARQUE = 'data-vu-par-le-test';
    let manoeuvres = 0;

    /* Borne de sûreté : si un jour un interrupteur en faisait apparaître un
       autre indéfiniment, le test doit échouer, pas tourner sans fin. */
    for (let garde = 0; garde < 40; garde++) {
      /* `count()` d'abord, et c'est ce qui manquait : `elementHandle()` ATTEND
         puis LÈVE quand plus rien ne correspond — il ne rend pas `null`. La
         fin normale de la boucle, c'est-à-dire « tous les interrupteurs ont
         été vus », se signalait donc par un échec du test. */
      const restants = page.locator(`[role="switch"]:not([${MARQUE}])`);
      if ((await restants.count()) === 0) break;

      const poignee = await restants.first().elementHandle();
      if (!poignee) break;

      const nom = await poignee.evaluate(
        (el) => (el.closest('label') as HTMLElement | null)?.innerText?.trim() ?? '?',
      );

      if (await poignee.isDisabled()) {
        const raison = await poignee.getAttribute('aria-describedby');
        expect(raison, `interrupteur désactivé sans raison annoncée : ${nom}`).toBeTruthy();
        await expect(page.locator(`[id="${raison}"]`)).toBeVisible();
        await expect(page.locator(`[id="${raison}"]`)).not.toBeEmpty();
      } else {
        const avant = await poignee.getAttribute('aria-checked');
        await poignee.click();
        await expect
          .poll(() => poignee.getAttribute('aria-checked'), { message: `sans effet : ${nom}` })
          .not.toBe(avant);
        manoeuvres++;
      }

      await poignee.evaluate((el, m) => el.setAttribute(m, 'true'), MARQUE);
    }

    expect(manoeuvres, 'aucun interrupteur manœuvré').toBeGreaterThan(0);
  });
}

test('le réglage `cloud` ne prétend plus rien synchroniser', async ({ page }) => {
  await ouvrirVierge(page, '/app/settings');

  /* Le motif ne couvre plus « synchronis », et le resserrement est volontaire.

     T4.4 reprochait au réglage `cloud` de PROMETTRE un nuage qui n'existait pas :
     il décrivait la persistance locale sous un nom de service distant. Ce
     défaut-là est toujours interdit, et c'est ce que ce test garde.

     Depuis le 2026-09-01, une vraie synchronisation existe (ADR-0009). Continuer
     à bannir le mot ferait échouer la recette sur une fonctionnalité qui, elle,
     tient sa promesse — et pousserait à la cacher plutôt qu'à la nommer. Ce
     qu'elle affiche est vérifié ailleurs, dans `vue-reglages.spec.ts`, y compris
     son absence totale sur un déploiement sans relais. */
  await expect(page.getByText(/cloud|nuage/i)).toHaveCount(0);
  await expect(page.getByText('Sauvegarde locale sur cet appareil')).toBeVisible();
});
