import { expect, test, type Page } from '@playwright/test';
import { ouvrirVierge } from './helpers/app';

/* Curseur réticule — `components/shell/reticle-cursor.tsx`.
 *
 * L'interrupteur « Curseur réticule » existait, basculait, se persistait — et
 * ne faisait RIEN. C'est ce que ces contrôles empêchent de revenir : chacun
 * regarde un effet observable, jamais l'existence d'un réglage. */

const ROUTE = '/app/profile';

const interrupteur = (page: Page) => page.getByRole('switch', { name: 'Curseur réticule' });
const reticule = (page: Page) => page.locator('[data-reticle]');

/** Abscisse du CENTRE, et non du bord gauche.
 *
 *  Les deux disques sont centrés sur la souris mais n'ont pas la même taille —
 *  6 px pour le noyau, 26 pour l'anneau. Leurs bords gauches diffèrent donc de
 *  10 px même parfaitement superposés : comparer les bords mesurerait la
 *  différence de diamètre, pas la traîne. */
const centreX = (l: ReturnType<Page['locator']>) =>
  l.evaluate((el) => {
    const b = el.getBoundingClientRect();
    return b.x + b.width / 2;
  });

/** Écart entre les centres du noyau et de l'anneau. */
const ecart = async (page: Page) => {
  const [n, a] = await Promise.all([
    centreX(reticule(page).locator('div').nth(1)),
    centreX(reticule(page).locator('div').first()),
  ]);
  return Math.abs(n - a);
};

/** Allume le réglage et attend que la coque ait pris l'attribut. */
const allumer = async (page: Page) => {
  await interrupteur(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-cursor', 'reticle');
};

test.describe('curseur réticule — pointeur fin', () => {
  test.skip(({ isMobile }) => !!isMobile, 'garde-fou n° 2 : rien à monter sur pointeur grossier');

  test('coupé par défaut : aucun réticule, aucun attribut', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await expect(reticule(page)).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-cursor', 'reticle');
  });

  test('allumé : le curseur système disparaît et le réticule le remplace', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    await expect(reticule(page)).toHaveCount(1);
    /* `cursor: none` doit valoir jusque SUR les boutons, qui portent
       `cursor: pointer` : sinon la flèche reparaît au moindre survol. */
    const surBouton = await interrupteur(page).evaluate((el) => getComputedStyle(el).cursor);
    expect(surBouton).toBe('none');
  });

  test('le noyau colle à la souris, l’anneau traîne puis le rejoint', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    await page.mouse.move(200, 200);
    await page.mouse.move(900, 600);

    /* Immédiatement après un grand saut : le noyau est arrivé, l'anneau non.
       C'est CE décalage qui donne la sensation d'instrument. */
    expect(await ecart(page), 'l’anneau ne traîne pas').toBeGreaterThan(20);

    /* Puis il rattrape : l'amortissement converge, il ne reste pas en arrière. */
    await expect
      .poll(() => ecart(page), { message: 'l’anneau n’a jamais rejoint le noyau' })
      .toBeLessThan(2);
  });

  test('les trois états sont visibles et distincts', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    const anneau = reticule(page).locator('div').first();
    const noyau = reticule(page).locator('div').nth(1);
    const largeur = (l: typeof anneau) => l.evaluate((el) => el.getBoundingClientRect().width);

    /* Au repos, loin de tout élément cliquable. */
    await page.mouse.move(600, 700);
    await expect.poll(() => largeur(anneau)).toBeGreaterThan(24);
    const repos = await largeur(anneau);

    /* Au-dessus d'un bouton : l'anneau s'ouvre. */
    const boite = (await interrupteur(page).boundingBox())!;
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await expect.poll(() => largeur(anneau)).toBeGreaterThan(repos);

    /* Bouton enfoncé : l'anneau se resserre ET le noyau enfle. */
    const noyauAvant = await largeur(noyau);
    await page.mouse.down();
    await expect.poll(() => largeur(anneau)).toBeLessThan(repos);
    expect(await largeur(noyau)).toBeGreaterThan(noyauAvant);
    await page.mouse.up();
  });

  test('au-dessus d’un champ de texte, le noyau devient une barre', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    const noyau = reticule(page).locator('div').nth(1);
    const champ = page.getByLabel('Nom', { exact: true });
    const boite = (await champ.boundingBox())!;
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);

    await expect
      .poll(async () => {
        const r = await noyau.evaluate((el) => {
          const b = el.getBoundingClientRect();
          return { l: b.width, h: b.height };
        });
        return r.h > r.l * 3;
      })
      .toBe(true);
  });

  test('coupé de nouveau : le curseur système revient, sans résidu', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await allumer(page);
    await interrupteur(page).click();

    /* LE contrôle qui compte. Un état où `cursor: none` survit sans réticule
       dessiné ferait perdre sa souris à l'utilisateur — et pour la retrouver,
       il lui faudrait deviner où cliquer pour couper le réglage. */
    await expect(page.locator('html')).not.toHaveAttribute('data-cursor', 'reticle');
    await expect(reticule(page)).toHaveCount(0);
    expect(await page.locator('body').evaluate((el) => getComputedStyle(el).cursor)).not.toBe(
      'none',
    );
  });

  test('bouger la souris ne redessine RIEN hors du réticule', async ({ page }) => {
    /* La contrainte du rapport : aucun `setState` sur `mousemove`. Ce qu'on
       peut observer d'un navigateur, c'est qu'aucun nœud HORS du réticule ne
       bouge pendant que la souris traverse l'écran — ce qui tomberait tout de
       suite si la position transitait par le store ou par l'état de la coque,
       le défaut réaliste ici, puisque `customCursor` y vit déjà. */
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    await page.evaluate(() => {
      const w = window as unknown as { __mut: number };
      w.__mut = 0;
      new MutationObserver((entrees) => {
        for (const e of entrees) {
          const cible = e.target as Element;
          if (cible.closest?.('[data-reticle]')) continue;
          w.__mut++;
        }
      }).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    });

    for (let i = 0; i < 40; i++) await page.mouse.move(300 + i * 12, 300 + i * 6);

    const mutations = await page.evaluate(() => (window as unknown as { __mut: number }).__mut);
    expect(mutations, 'la coque se redessine au déplacement de la souris').toBe(0);
  });

  test('sous prefers-reduced-motion, l’anneau colle et ne pulse pas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    const anneau = reticule(page).locator('div').first();
    await page.mouse.move(200, 200);
    await page.mouse.move(900, 600);

    /* Pas d'amortissement : l'anneau est arrivé dès l'image suivante. */
    await expect.poll(() => ecart(page)).toBeLessThan(2);

    /* Pas de pulsation : opacité et échelle ne bougent plus d'une image à
       l'autre. On échantillonne deux fois à 400 ms — un quart de la période. */
    const mesure = () =>
      anneau.evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.opacity}|${s.transform.split(',').slice(0, 4).join(',')}`;
      });
    const a1 = await mesure();
    await page.waitForTimeout(400);
    expect(await mesure()).toBe(a1);
  });

  test('le réticule n’intercepte aucun clic', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await allumer(page);

    /* Un décor qui absorbe un clic n'est plus un décor. L'interrupteur est
       sous le réticule : il doit rester actionnable. */
    await interrupteur(page).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-cursor', 'reticle');
  });
});

test.describe('curseur réticule — pointeur grossier', () => {
  test.skip(({ isMobile }) => !isMobile, 'ce bloc ne vaut que sur pointeur grossier');

  test('la ligne de réglage est ABSENTE, et rien n’est monté', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    /* Absente, pas grisée : sur un téléphone il n'y a pas de curseur à
       remplacer, et le réglage n'a rien à expliquer. */
    await expect(interrupteur(page)).toHaveCount(0);
    await expect(reticule(page)).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-cursor', 'reticle');
  });
});
