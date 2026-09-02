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

    const interrupteurs = page.getByRole('switch');
    const total = await interrupteurs.count();
    expect(total, `aucun interrupteur trouvé sur ${route}`).toBeGreaterThan(0);

    for (let i = 0; i < total; i++) {
      const inter = interrupteurs.nth(i);
      const nom =
        (await inter.textContent()) ?? (await inter.getAttribute('aria-label')) ?? `#${i}`;

      if (await inter.isDisabled()) {
        const raison = await inter.getAttribute('aria-describedby');
        expect(raison, `interrupteur désactivé sans raison annoncée : ${nom}`).toBeTruthy();
        await expect(page.locator(`[id="${raison}"]`)).toBeVisible();
        await expect(page.locator(`[id="${raison}"]`)).not.toBeEmpty();
        continue;
      }

      const avant = await inter.getAttribute('aria-checked');
      await inter.click();
      await expect(inter, `sans effet : ${nom}`).not.toHaveAttribute('aria-checked', avant ?? '');

      /* Remis comme on l'a trouvé : le test suivant part du même état. */
      await inter.click();
    }
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
