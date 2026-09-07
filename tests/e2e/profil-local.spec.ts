import { expect, test, type Page } from '@playwright/test';
import { attendreHydratation, ouvrirVierge } from './helpers/app';
import { pngDeTest } from './helpers/image';

/* ============================================================================
   LOT D — profil local : photo, adresse, poste, verrou biométrique.
   Spec du 2026-09-02 § Lot D.

   Ce que ce fichier éprouve, et qu'aucun test unitaire ne peut atteindre :

   1. la réduction d'image passe par un VRAI `<canvas>` — l'unitaire teste la
      boucle de décision, pas l'encodeur du navigateur ;
   2. les trois champs sont ÉCRITS, pas seulement affichés : le rechargement
      est le seul juge ;
   3. le rideau du verrou remplace vraiment l'application — pas un voile posé
      dessus, avec le contenu toujours dans le DOM.

   WebAuthn est SIMULÉ (`addInitScript`). Il ne peut pas ne pas l'être : aucun
   navigateur d'intégration n'a de capteur d'empreinte. Ce qui est éprouvé ici
   est donc notre câblage — la clé rangée, le rideau tiré, le rideau levé — et
   pas la plateforme, qui n'est pas à nous.
   ========================================================================= */

const ROUTE_PROFIL = '/app/profile';
const ROUTE_REGLAGES = '/app/settings';

test.describe('identité locale', () => {
  test('l’adresse et le poste se saisissent et survivent au rechargement', async ({ page }) => {
    await ouvrirVierge(page, ROUTE_PROFIL);

    await page.getByLabel('Adresse électronique').fill('ada@exemple.org');
    await page.getByLabel('Poste', { exact: true }).fill('Ingénieure de production');

    await page.reload();
    await attendreHydratation(page);

    await expect(page.getByLabel('Adresse électronique')).toHaveValue('ada@exemple.org');
    await expect(page.getByLabel('Poste', { exact: true })).toHaveValue('Ingénieure de production');
  });

  test('l’écran dit que ces champs ne partent nulle part', async ({ page }) => {
    /* Pas de la décoration : la spec en fait une obligation, et la politique de
       confidentialité s'appuie dessus. Un champ « adresse électronique » dans un
       produit sans compte doit s'expliquer là où il se remplit. */
    await ouvrirVierge(page, ROUTE_PROFIL);
    await expect(page.getByText(/ne sont transmis à personne/)).toBeVisible();
  });

  test('une photo choisie est réduite sur l’appareil, affichée, puis retirable', async ({
    page,
  }) => {
    await ouvrirVierge(page, ROUTE_PROFIL);

    /* Aucune photo au départ : l'avatar génératif est un `role="img"`, pas une
       image chargée. */
    await expect(page.locator('img[alt="Avatar"]')).toHaveCount(0);

    /* Image VOLONTAIREMENT non carrée et plus grande que la limite : c'est le
       recadrage et la réduction qu'on regarde, pas le transport d'un fichier. */
    await page.setInputFiles('input[type="file"][aria-label="Photo"]', {
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: pngDeTest(900, 600),
    });

    const image = page.locator('img[alt="Avatar"]').first();
    await expect(image).toBeVisible();

    const source = await image.getAttribute('src');
    expect(source, 'la photo doit être une dataURL locale, jamais une URL distante').toMatch(
      /^data:image\/jpeg;base64,/,
    );

    /* Les deux invariants du domaine, mesurés sur le résultat réel du
       navigateur : carré, ≤ 256 px, ≤ 64 Ko. */
    const mesure = await page.evaluate(async (src) => {
      /* Décodage à la main plutôt que `fetch(dataURL)` : notre propre CSP
         n'autorise pas `connect-src data:`, et le test tomberait sur une
         politique de sécurité au lieu de mesurer une image. */
      const brut = atob(src.split(',')[1]!);
      const octets = new Uint8Array(brut.length);
      for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
      const bitmap = await createImageBitmap(new Blob([octets], { type: 'image/jpeg' }));
      return { l: bitmap.width, h: bitmap.height, octets: brut.length };
    }, source!);

    expect(mesure.l).toBe(mesure.h);
    expect(mesure.l).toBeLessThanOrEqual(256);
    expect(mesure.octets).toBeLessThanOrEqual(64 * 1024);

    /* Écrite, pas seulement affichée. */
    await page.reload();
    await attendreHydratation(page);
    await expect(page.locator('img[alt="Avatar"]').first()).toBeVisible();

    await page.getByRole('button', { name: 'Retirer la photo' }).click();
    await expect(page.locator('img[alt="Avatar"]')).toHaveCount(0);

    await page.reload();
    await attendreHydratation(page);
    await expect(page.locator('img[alt="Avatar"]')).toHaveCount(0);
  });
});

/* --- Verrou biométrique ---------------------------------------------------

   La plateforme est remplacée AVANT le premier script de la page : le réglage
   demande sa disponibilité au montage, une injection tardive arriverait après
   la réponse. `refuser` sert au cas qui compte le plus — celui où l'utilisateur
   annule : rien ne doit s'allumer. */
async function simulerWebAuthn(page: Page, options: { refuser?: boolean } = {}): Promise<void> {
  await page.addInitScript((refuser) => {
    const faux = {
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      type: 'public-key',
    };
    Object.defineProperty(window, 'PublicKeyCredential', {
      configurable: true,
      value: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true },
    });
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        create: async () => {
          if (refuser) throw new Error('NotAllowedError');
          return faux;
        },
        get: async () => {
          if (refuser) throw new Error('NotAllowedError');
          return faux;
        },
      },
    });
  }, options.refuser === true);
}

test.describe('verrou biométrique', () => {
  test('sans verrou posé, aucun rideau — c’est le défaut', async ({ page }) => {
    await ouvrirVierge(page, '/app/today');
    await expect(page.locator('[data-verrou]')).toHaveCount(0);
    await expect(page.locator('main')).toBeVisible();
  });

  test('le réglage dit en toutes lettres que ce n’est pas un chiffrement', async ({ page }) => {
    await simulerWebAuthn(page);
    await ouvrirVierge(page, ROUTE_REGLAGES);
    await expect(page.getByText(/C’est un rideau, pas un chiffrement/)).toBeVisible();
  });

  test('posé, il tire un rideau au rechargement — et le contenu n’est PAS derrière', async ({
    page,
  }) => {
    await simulerWebAuthn(page);
    await ouvrirVierge(page, ROUTE_REGLAGES);

    const interrupteur = page.getByRole('switch', { name: 'Verrouiller à l’ouverture' });
    await expect(interrupteur).toBeEnabled();
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true');

    /* Poser le verrou n'enferme pas celui qui vient de le poser. */
    await expect(page.locator('[data-verrou]')).toHaveCount(0);

    await page.goto('/app/today');
    await expect(page.locator('[data-verrou]')).toBeVisible();
    /* LA MESURE DÉCISIVE : rien de l'application n'est rendu derrière. Un
       voile laisserait `<main>` dans le DOM — lisible au lecteur d'écran et
       dans l'inspecteur. */
    await expect(page.locator('main')).toHaveCount(0);

    await page.getByRole('button', { name: 'Déverrouiller' }).click();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[data-verrou]')).toHaveCount(0);
  });

  test('un enregistrement refusé n’allume rien', async ({ page }) => {
    await simulerWebAuthn(page, { refuser: true });
    await ouvrirVierge(page, ROUTE_REGLAGES);

    const interrupteur = page.getByRole('switch', { name: 'Verrouiller à l’ouverture' });
    await interrupteur.click();

    await expect(interrupteur).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Enregistrement refusé ou annulé.')).toBeVisible();

    /* Et surtout : rien n'a été écrit — le rechargement ne verrouille rien. */
    await page.goto('/app/today');
    await expect(page.locator('[data-verrou]')).toHaveCount(0);
  });

  test('retiré, il ne revient pas', async ({ page }) => {
    await simulerWebAuthn(page);
    await ouvrirVierge(page, ROUTE_REGLAGES);

    const interrupteur = page.getByRole('switch', { name: 'Verrouiller à l’ouverture' });
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'true');
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute('aria-checked', 'false');

    await page.goto('/app/today');
    await expect(page.locator('[data-verrou]')).toHaveCount(0);
  });
});
