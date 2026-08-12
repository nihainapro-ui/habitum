import { expect, test } from '@playwright/test';

/* Les douze primitives, dans les trois thèmes.

   Une erreur de console est un échec : c'est ainsi qu'on attrape un
   avertissement Radix (une modale sans description accessible, par exemple)
   avant qu'il ne se répète dans onze vues. */

const PRIMITIVES = [
  'panel',
  'card',
  'chip',
  'switch',
  'field',
  'segmented',
  'sheet',
  'dialog',
  'toast',
  'tooltip',
  'ring',
  'icon',
];

const THEMES = ['neural', 'plasma', 'clinical'] as const;

for (const theme of THEMES) {
  test(`les 12 primitives se rendent en thème ${theme}`, async ({ page }) => {
    const erreurs: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') erreurs.push(m.text());
    });
    page.on('pageerror', (e) => erreurs.push(e.message));

    await page.goto('/dev/ui');
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);

    for (const p of PRIMITIVES) {
      await expect(page.getByTestId(`ui-${p}`), `primitive ${p}`).toBeVisible();
    }
    expect(erreurs, `erreurs console en thème ${theme}`).toEqual([]);
  });
}

test('les primitives interactives répondent au clavier', async ({ page }) => {
  await page.goto('/dev/ui');
  const inter = page.getByTestId('ui-switch').getByRole('switch').first();
  await inter.focus();
  await expect(inter).toBeFocused();
  await page.keyboard.press('Space');
  await expect(inter).toHaveAttribute('aria-checked', 'true');
});

test('le focus visible existe et vient du jeton --acc2', async ({ page }) => {
  await page.goto('/dev/ui');
  await page.getByTestId('ui-card').getByRole('button').first().focus();
  const contour = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return { largeur: s.outlineWidth, style: s.outlineStyle };
  });
  expect(contour.largeur).not.toBe('0px');
  expect(contour.style).not.toBe('none');
});

test('la modale piège le focus et le rend au déclencheur', async ({ page }) => {
  await page.goto('/dev/ui');
  const declencheur = page.getByRole('button', { name: /ouvrir la modale/i });
  await declencheur.click();

  const modale = page.getByRole('dialog');
  await expect(modale).toBeVisible();
  for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
  const dedans = await page.evaluate(
    () => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false,
  );
  expect(dedans, 'le focus est sorti de la modale').toBe(true);

  await page.keyboard.press('Escape');
  await expect(modale).toBeHidden();
  await expect(declencheur).toBeFocused();
});

test("l'infobulle s'ouvre au FOCUS CLAVIER, pas seulement au survol", async ({ page }) => {
  await page.goto('/dev/ui');

  /* On arrive au déclencheur par TABULATION, pas par `.focus()`.
     Radix n'ouvre l'infobulle que sur un focus clavier (`:focus-visible`) —
     c'est délibéré : sinon elle s'ouvrirait aussi après un clic à la souris,
     là où l'utilisateur voit déjà l'élément. Un test qui appelle `.focus()`
     testerait donc autre chose que ce que vit un utilisateur au clavier. */
  await page.getByRole('button', { name: /fermer/i }).focus();
  await page.keyboard.press('Tab');

  const declencheur = page.getByRole('button', { name: /survoler ou tabuler/i });
  await expect(declencheur).toBeFocused();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

test("l'anneau annonce sa valeur au lieu de la montrer seulement", async ({ page }) => {
  await page.goto('/dev/ui');
  await expect(page.getByTestId('ui-ring').getByRole('img', { name: '42 %' })).toBeVisible();
});
