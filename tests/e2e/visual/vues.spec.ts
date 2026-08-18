import { expect, test, type Page } from '@playwright/test';
import { ouvrirAvecDemo } from '../helpers/app';

/* ============================================================================
   Non-régression visuelle — tâche 8.2, référence T8.6.

   Onze vues × trois thèmes = trente-trois captures, comparées pixel à pixel à
   un socle versionné. Ce que ce harnais attrape et qu'aucun autre test ne voit :
   un élément qui disparaît sans casser d'assertion, un chevauchement, un cadre
   déformé, un rôle de couleur inversé dans un seul thème.

   TROIS CONDITIONS, sans lesquelles le harnais devient du bruit :

   1. **La date est figée** au 5 août 2026 — celle des 62 valeurs de référence.
      Sans elle, chaque capture diverge du jour au lendemain et le socle demande
      d'être régénéré tous les matins. C'est ce que fournit `ouvrirAvecDemo`.

   2. **Le hasard est neutralisé** : animations désactivées, mouvement réduit,
      curseur personnalisé écarté, et les éléments qui affichent une heure
      MURALE sont masqués. Une capture ne doit dépendre que du code.

   3. **La plateforme est unique.** Le rendu des polices diffère entre Windows,
      macOS et Linux : comparer des captures de plateformes différentes produit
      des écarts qui ne veulent rien dire. Le socle versionné est celui de
      `linux`, celui que produit `ubuntu-latest` en CI. C'est pourquoi ces
      fichiers sont exclus de `npm run test:e2e` et vivent dans un projet à
      part, `visual` — sur une machine Windows ou macOS, on les exécute dans le
      conteneur officiel (`npm run test:visual`), jamais à même l'hôte.

   Un écart au-delà du seuil demande une DÉCISION, jamais une régénération
   réflexe : soit le rendu a régressé, soit l'écart est voulu et le socle est
   régénéré AVEC une entrée au CHANGELOG.
   ========================================================================= */

const VUES = [
  ['dash', '/app'],
  ['today', '/app/today'],
  ['habits', '/app/habits'],
  ['tasks', '/app/tasks'],
  ['goals', '/app/goals'],
  ['cal', '/app/calendar'],
  ['stats', '/app/stats'],
  ['timer', '/app/timer'],
  ['notes', '/app/notes'],
  ['profile', '/app/profile'],
  ['settings', '/app/settings'],
] as const;

const THEMES = ['neural', 'plasma', 'clinical'] as const;

/** Pose le thème sans passer par les réglages : trente-trois allers-retours
 *  par la page de configuration coûteraient plus que les captures elles-mêmes,
 *  et l'attribut est exactement ce que le sélecteur de thème écrit. */
const poserTheme = async (page: Page, theme: string): Promise<void> => {
  await page.evaluate((t) => {
    document.documentElement.dataset['theme'] = t;
  }, theme);
};

/** Neutralise tout ce qui bouge.
 *
 *  `animations: 'disabled'` de Playwright fige les animations CSS et les
 *  transitions au moment de la capture ; la feuille injectée ici les arrête
 *  aussi pendant la mise en place, pour qu'un panneau surpris à mi-course ne
 *  produise pas un écart qui n'existe pas. Le curseur de saisie clignote : il
 *  est rendu transparent.
 *
 *  Aucune horloge murale à masquer : la seule date affichée — celle de
 *  l'en-tête — est calculée après montage sur l'horloge du navigateur, que
 *  `ouvrirAvecDemo` fige au 5 août 2026. Elle est donc déterministe, et la
 *  masquer reviendrait à retirer du contrôle un élément qui a le droit d'être
 *  vérifié. */
const figerLeRendu = async (page: Page): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      ${process.env['VISUEL_CONTROLE_NEGATIF'] ? 'body { filter: hue-rotate(40deg) !important; }' : ''}
    `,
  });
};

test.describe('non-régression visuelle', () => {
  /* Trente-trois captures pleine page sur un jeu peuplé : le budget par défaut
     est trop court sur une machine chargée, et un dépassement ferait échouer
     le harnais sur son outillage plutôt que sur un écart de rendu. */
  test.slow();

  for (const [nom, route] of VUES) {
    for (const theme of THEMES) {
      test(`capture — ${nom} / ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await ouvrirAvecDemo(page, route, { historique: true });

        /* FIGER D'ABORD, POSER LE THÈME ENSUITE — l'ordre inverse coûtait
           quatre captures instables sur trente-trois, toutes en `clinical`.
           Les surfaces portent `transition: background .2s` : changer
           `data-theme` puis capturer aussitôt saisit la page à un instant
           quelconque de l'interpolation entre l'ancien thème et le nouveau.
           L'écart n'apparaissait que dans le thème clair, dont les fonds
           partent de plus loin. */
        await figerLeRendu(page);
        await poserTheme(page, theme);

        /* Les polices doivent être posées AVANT la capture : une capture prise
           pendant le repli produit un écart qui n'existe pas. */
        await page.evaluate(() => document.fonts.ready);

        await expect(page).toHaveScreenshot(`${nom}-${theme}.png`, {
          fullPage: true,
          /* 2 % : le seuil du plan. Assez large pour absorber l'antialiasing
             d'un caractère, assez étroit pour qu'un bloc déplacé ou un panneau
             disparu échoue. */
          maxDiffPixelRatio: 0.02,
          /* Sensibilité PAR PIXEL, en espace YIQ, et elle a été CHOISIE PAR LA
             MESURE plutôt que reprise par défaut.

             `VISUEL_CONTROLE_NEGATIF=1` applique une rotation de teinte de 40°
             à toute la page : c'est le contrôle négatif du harnais, et il doit
             le faire échouer. Relevé, sur les trente-trois captures :

               seuil 0,2 (défaut Playwright) →  0 échec — harnais AVEUGLE
               seuil 0,05                    →  7 échecs
               seuil 0,02                    → 27 échecs

             La valeur par défaut ne voyait RIEN, et c'est propre à ce produit :
             deux thèmes sur trois sont quasi monochromes, et tourner la teinte
             d'un gris ne le déplace presque pas dans YIQ. Le harnais était donc
             aveugle à la régression la plus probable — un jeton de couleur qui
             change — c'est-à-dire exactement ce que la tâche 8.3 venait de
             trouver à la main.

             `npm run test:visual` doit rester vert : c'est le contrôle positif,
             et il l'est, socle et mesure sortant du même conteneur. */
          threshold: 0.02,
          animations: 'disabled',
          /* La date de construction (Réglages → À propos, tâche 8.8) change à
             CHAQUE compilation. C'est la seule valeur affichée qui ne dépend
             pas du code : la masquer évite trois captures rouges à chaque build
             sans qu'aucune régression n'ait eu lieu. On masque la VALEUR, pas
             la ligne : sa présence, sa position et son libellé restent
             comparés. */
          mask: [page.locator('[data-version-value="built"]')],
        });
      });
    }
  }
});
