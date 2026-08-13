import { expect, test, type Page } from '@playwright/test';
import { ouvrirVierge } from './helpers/app';

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
