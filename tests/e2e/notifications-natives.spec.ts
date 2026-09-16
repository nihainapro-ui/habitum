import { expect, test, type Page } from '@playwright/test';
import { attendreHydratation, ecrireEnBase, ouvrirVierge } from './helpers/app';

/* Seul le pont Android est remplacé. Le vrai plugin JS, les permissions,
   l'interface, le store et le planificateur restent ceux de l'application. */
async function preparer(page: Page, actif = false) {
  await page.addInitScript(() => {
    type Alarme = { id: number; title: string; schedule?: { at: string } };
    const lire = (): Alarme[] => JSON.parse(sessionStorage.getItem('__alarmes') ?? '[]');
    const sauver = (alarmes: Alarme[]) =>
      sessionStorage.setItem('__alarmes', JSON.stringify(alarmes));
    Object.assign(window, {
      androidBridge: {},
      Capacitor: {
        isNativePlatform: () => true,
        PluginHeaders: [
          {
            name: 'LocalNotifications',
            methods: [
              'checkPermissions',
              'requestPermissions',
              'checkExactNotificationSetting',
              'createChannel',
              'getPending',
              'cancel',
              'schedule',
            ].map((name) => ({ name, rtype: 'promise' })),
          },
        ],
        nativePromise: async (
          _plugin: string,
          methode: string,
          options?: { notifications: Alarme[] },
        ) => {
          if (methode === 'checkPermissions') {
            sessionStorage.setItem('__lecturePermission', 'oui');
            return { display: sessionStorage.getItem('__permission') ?? 'prompt' };
          }
          if (methode === 'requestPermissions') {
            return new Promise((resolve) => {
              Object.assign(window, {
                __accorder: () => {
                  sessionStorage.setItem('__permission', 'granted');
                  resolve({ display: 'granted' });
                },
              });
            });
          }
          if (methode === 'checkExactNotificationSetting') return { exact_alarm: 'granted' };
          if (methode === 'getPending') return { notifications: lire() };
          if (methode === 'cancel') {
            sauver(lire().filter((n) => !options?.notifications.some((x) => x.id === n.id)));
          }
          if (methode === 'schedule') {
            const nouvelles = options?.notifications ?? [];
            sauver([...lire().filter((n) => !nouvelles.some((x) => x.id === n.id)), ...nouvelles]);
          }
          return {};
        },
      },
    });
  });
  await ouvrirVierge(page, '/app/settings');
  await ecrireEnBase(page, {
    tasks: [
      {
        id: 'dentiste',
        name: 'Dentiste',
        category: 'health',
        date: '2026-08-05',
        time: '10:00',
        duration: 30,
        priority: 1,
        done: false,
        subTasks: [],
        note: '',
        updatedAt: '2026-08-05T07:00:00.000Z',
      },
    ],
    meta: [
      { key: 'settings', value: { notifications: actif }, updatedAt: '2026-08-05T07:00:00.000Z' },
    ],
  });
  if (actif) await page.evaluate(() => sessionStorage.setItem('__permission', 'granted'));
  await page.reload();
  await attendreHydratation(page);
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('__lecturePermission')))
    .toBe('oui');
}

const alarmes = (page: Page) =>
  page.evaluate(() =>
    (JSON.parse(sessionStorage.getItem('__alarmes') ?? '[]') as { title: string }[]).map(
      (n) => n.title,
    ),
  );
const interrupteur = (page: Page) => page.getByRole('switch').first();

test('Android : programme après la réponse tardive à la permission', async ({ page }) => {
  await preparer(page);
  await interrupteur(page).click();
  await expect(interrupteur(page)).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('État rapporté par le système : default.')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as unknown as { __accorder?: unknown }).__accorder),
    )
    .toBe('function');
  await page.evaluate(() => (window as unknown as { __accorder: () => void }).__accorder());
  await expect.poll(() => alarmes(page)).toEqual(['Dentiste']);
});

test('Android : réarme au retour des réglages système, sans rechargement', async ({ page }) => {
  await preparer(page);
  await interrupteur(page).click();
  await expect(interrupteur(page)).toHaveAttribute('aria-checked', 'true');
  await page.evaluate(() => {
    sessionStorage.setItem('__permission', 'granted');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => alarmes(page)).toEqual(['Dentiste']);
});

test('Android : couper les notifications retire les alarmes déjà programmées', async ({ page }) => {
  await preparer(page, true);
  await expect.poll(() => alarmes(page)).toEqual(['Dentiste']);
  await interrupteur(page).click();
  await expect(interrupteur(page)).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => alarmes(page)).toEqual([]);
});

test('Android : les alarmes survivent à la fermeture de la page', async ({ page }) => {
  await preparer(page, true);
  await expect.poll(() => alarmes(page)).toEqual(['Dentiste']);
  await page.goto('/');
  expect(await alarmes(page)).toEqual(['Dentiste']);
  await page.goto('/app/settings');
  await attendreHydratation(page);
  await expect.poll(() => alarmes(page)).toEqual(['Dentiste']);
});
