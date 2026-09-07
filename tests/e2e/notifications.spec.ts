import { expect, test, type Page } from '@playwright/test';
import { ouvrirVierge } from './helpers/app';
import { LARGEURS_MESUREES, releverDebordements } from './helpers/debordement';

/* Tâche 5.2 — la permission de notifier se demande au bon moment, ou pas.

   Le navigateur de test ne montrera jamais la vraie invite : on remplace
   `Notification.requestPermission` par une réponse choisie, ce qui laisse
   observable la SEULE chose qui nous intéresse — quand l'application demande,
   et ce qu'elle fait de la réponse. */

/** Remplace l'API de notification avant tout script de page. */
const poserNotification = async (page: Page, reponse: NotificationPermission): Promise<void> => {
  await page.addInitScript((r) => {
    /* La permission est une propriété du NAVIGATEUR : elle survit aux
       rechargements. Un faux qui repartirait de « default » à chaque
       navigation ferait échouer l'application sur un défaut qui n'est pas le
       sien — d'où `sessionStorage`, qui dure ce que dure l'onglet. */
    const CLE = '__perm';
    let etat = (sessionStorage.getItem(CLE) as NotificationPermission | null) ?? 'default';
    const faux = function Notification() {
      /* Une notification affichée n'a rien à faire dans un test : on compte. */
      (window as unknown as { __notifs: number }).__notifs =
        ((window as unknown as { __notifs?: number }).__notifs ?? 0) + 1;
    } as unknown as typeof window.Notification;

    Object.defineProperty(faux, 'permission', { get: () => etat, configurable: true });
    Object.defineProperty(faux, 'requestPermission', {
      configurable: true,
      value: async () => {
        (window as unknown as { __demandes: number }).__demandes =
          ((window as unknown as { __demandes?: number }).__demandes ?? 0) + 1;
        etat = r as NotificationPermission;
        sessionStorage.setItem(CLE, etat);
        return etat;
      },
    });

    Object.defineProperty(window, 'Notification', { configurable: true, value: faux });
  }, reponse);
};

const demandes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __demandes?: number }).__demandes ?? 0);

const interrupteur = (page: Page) => page.getByRole('switch').first();

test('la permission n’est JAMAIS demandée au chargement', async ({ page }) => {
  await poserNotification(page, 'granted');

  await ouvrirVierge(page, '/app');
  expect(await demandes(page)).toBe(0);

  await ouvrirVierge(page, '/app/settings');
  expect(await demandes(page)).toBe(0);
  expect(await page.evaluate(() => Notification.permission)).toBe('default');
});

test('elle est demandée au clic sur l’interrupteur, et une fois accordée il reste actif', async ({
  page,
}) => {
  await poserNotification(page, 'granted');
  await ouvrirVierge(page, '/app/settings');

  await interrupteur(page).click();

  expect(await demandes(page)).toBe(1);
  await expect(interrupteur(page)).toHaveAttribute('aria-checked', 'true');

  /* Le réglage est PERSISTÉ : il ne survit pas seulement au rendu. */
  await ouvrirVierge(page, '/app/settings');
  await expect(interrupteur(page)).toHaveAttribute('aria-checked', 'true');
});

test('un refus ramène l’interrupteur à l’arrêt, et dit que c’est le navigateur', async ({
  page,
}) => {
  await poserNotification(page, 'denied');
  await ouvrirVierge(page, '/app/settings');

  await interrupteur(page).click();

  await expect(interrupteur(page)).toHaveAttribute('aria-checked', 'false');
  /* `p[role=alert]` et non `getByRole('alert')` : Next pose son propre
     annonceur de route, lui aussi `role="alert"`. */
  await expect(page.locator('p[role="alert"]')).toContainText(/navigateur/i);
});

test('un navigateur sans API n’affiche pas un interrupteur inopérant', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'Notification');
  });
  await ouvrirVierge(page, '/app/settings');

  await expect(interrupteur(page)).toBeDisabled();
  /* Désactivé, mais JAMAIS muet : la raison est lisible et annoncée. */
  const raison = await interrupteur(page).getAttribute('aria-describedby');
  expect(raison).toBeTruthy();
  await expect(page.locator(`[id="${raison}"]`)).toContainText(/notification/i);
});

/* --- Réglages fins — spec du 2026-09-07 ----------------------------------

   Quatre sources peuvent désormais rappeler, et tout se règle. Ce qui est
   éprouvé ici est ce qu'aucun test unitaire ne voit : les réglages
   n'apparaissent que quand quelque chose peut sonner, et ils sont ÉCRITS. */

const details = (page: Page) => page.locator('[data-notif-details]');

test('les réglages fins n’apparaissent pas tant que rien ne peut sonner', async ({ page }) => {
  await poserNotification(page, 'granted');
  await ouvrirVierge(page, '/app/settings');

  /* Douze lignes de réglage au-dessus d'une permission jamais demandée
     donneraient à croire que quelque chose est armé. */
  await expect(details(page)).toHaveCount(0);

  await interrupteur(page).click();
  await expect(details(page)).toBeVisible();
});

test('ils disparaissent avec l’interrupteur maître', async ({ page }) => {
  await poserNotification(page, 'granted');
  await ouvrirVierge(page, '/app/settings');

  await interrupteur(page).click();
  await expect(details(page)).toBeVisible();

  await interrupteur(page).click();
  await expect(details(page)).toHaveCount(0);
});

test('une source coupée et un préavis choisi survivent au rechargement', async ({ page }) => {
  await poserNotification(page, 'granted');
  await ouvrirVierge(page, '/app/settings');
  await interrupteur(page).click();

  const sourceWork = page.getByRole('switch', { name: 'Étapes de projet' });
  await sourceWork.click();
  await expect(sourceWork).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('combobox', { name: 'Préavis des tâches' }).click();
  await page
    .getByRole('listbox', { name: 'Préavis des tâches' })
    .getByRole('option', { name: '30 minutes avant' })
    .click();

  /* ATTENDRE QUE L'ÉCRAN AFFICHE LE CHOIX AVANT DE RECHARGER, et ce n'est pas
     une politesse : `setSetting` écrit au dépôt PUIS met le store à jour
     (`lib/store/slices/settings.ts`). Voir la nouvelle valeur affichée prouve
     donc que l'écriture est faite. Recharger sans attendre, c'était courir
     l'écriture — vert sur une machine au repos, rouge dès que la recette
     complète occupe les huit ouvriers. */
  await expect(page.getByRole('combobox', { name: 'Préavis des tâches' })).toContainText(
    '30 minutes avant',
  );

  await ouvrirVierge(page, '/app/settings');
  await expect(page.getByRole('switch', { name: 'Étapes de projet' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(page.getByRole('combobox', { name: 'Préavis des tâches' })).toContainText(
    '30 minutes avant',
  );
});

test('les heures silencieuses n’exposent leurs champs qu’une fois allumées', async ({ page }) => {
  await poserNotification(page, 'granted');
  await ouvrirVierge(page, '/app/settings');
  await interrupteur(page).click();

  const depuis = page.getByLabel('À partir de');
  await expect(depuis).toHaveCount(0);

  await page.getByRole('switch', { name: 'Heures silencieuses' }).click();
  await expect(depuis).toHaveValue('22:00');

  await depuis.fill('23:15');
  await ouvrirVierge(page, '/app/settings');
  await expect(page.getByLabel('À partir de')).toHaveValue('23:15');
});

/* LE FILET DE MESURE NE VOIT PAS CES RÉGLAGES, et c'est structurel :
   `debordements.spec.ts` ouvre les vues telles qu'elles s'offrent, or ce bloc
   n'existe que permission accordée ET interrupteur allumé. Il a donc échappé
   au balayage — et il s'y est repris : une rangée de quatre libellés en toutes
   lettres (« 30 minutes avant ») débordait à 390 px, jusqu'à rendre le réglage
   inatteignable au doigt. Ce test est ce qui l'a attrapé ; il reste ici pour
   que le prochain ajout ne recommence pas. */
test.describe('les réglages fins ne débordent nulle part', () => {
  for (const largeur of LARGEURS_MESUREES) {
    test(`aucun débordement ni texte coupé à ${largeur}px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await poserNotification(page, 'granted');
      await ouvrirVierge(page, '/app/settings');
      await interrupteur(page).click();

      /* Tout est DÉPLIÉ : récapitulatif et heures silencieuses cachent chacun
         des champs, et un champ jamais rendu n'est jamais mesuré. */
      await page.getByRole('switch', { name: 'Récapitulatif du jour' }).click();
      await page.getByRole('switch', { name: 'Heures silencieuses' }).click();
      await expect(page.getByLabel('À partir de')).toBeVisible();

      const { releve, balayes } = await releverDebordements(page);
      expect(balayes, 'la mesure est suspecte : trop peu d’éléments balayés').toBeGreaterThan(20);
      expect(releve).toEqual([]);
    });
  }
});
