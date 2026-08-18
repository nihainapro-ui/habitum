import { expect, test } from '@playwright/test';
import { version as versionPackage } from '@/package.json';
import { DB_VERSION } from '@/lib/storage/keys';
import { ouvrirVierge } from './helpers/app';

/* ============================================================================
   Page de version — tâche 8.8.

   Elle existe pour rendre un rapport d'anomalie exploitable. Sans compte et
   sans télémétrie, ce que la personne recopie est TOUT ce qu'on saura de
   l'incident (docs/RUNBOOK.md § 4).

   Ce que ce fichier interdit surtout : le retour de la chaîne écrite en dur.
   Le panneau affichait « Habitum 2.4 · Web » — un numéro inventé, jamais mis à
   jour, et faux. Il ne rendait pas le diagnostic difficile : il l'envoyait sur
   une fausse piste. D'où des assertions rattachées aux SOURCES — `package.json`
   et `DB_VERSION` — et non à des valeurs recopiées ici, qui dériveraient de la
   même façon.
   ========================================================================= */

const ROUTE = '/app/settings';

test('les réglages affichent la version applicative, celle du schéma, et la date de construction', async ({
  page,
}) => {
  await ouvrirVierge(page, ROUTE);

  const bloc = page.locator('[data-version]');
  await expect(bloc).toBeVisible();

  /* Lues aux sources : si `package.json` monte en version et que le panneau ne
     suit pas, c'est ici que ça casse. */
  await expect(page.locator('[data-version-value="app"]')).toHaveText(versionPackage);
  await expect(page.locator('[data-version-value="schema"]')).toHaveText(String(DB_VERSION));

  /* La date de construction est FIGÉE à la compilation. Ce qu'on vérifie, c'est
     qu'elle a bien été posée — « inconnue » signifierait que la variable
     d'environnement a disparu, et le rapport d'anomalie perdrait la seule
     information qui date le binaire servi. */
  const construite = page.locator('[data-version-value="built"]');
  await expect(construite).toBeVisible();
  await expect(construite).not.toHaveText(/inconnue|unknown/i);
});

test('plus aucune version écrite en dur', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  /* Le panneau annonçait « Habitum 2.4 · Web ». Aucune version de ce genre ne
     doit revenir, sous aucune forme. */
  await expect(page.getByText(/Habitum\s*2\.4/)).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('· Web');
});

test('la version est atteignable en anglais aussi', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);
  await page.getByRole('radio', { name: 'English' }).click();

  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await expect(page.locator('[data-version-value="app"]')).toHaveText(versionPackage);
});
