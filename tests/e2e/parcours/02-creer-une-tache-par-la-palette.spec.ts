import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirVierge } from '../helpers/app';

/* ============================================================================
   PARCOURS 2 — Créer une tâche par la palette ⌘K.

   Ce que le parcours prouve : la palette n'est pas décorative. Elle est le
   chemin le plus court du produit, et un chemin court qui n'aboutit pas est
   pire qu'un chemin absent — l'utilisateur croit avoir créé quelque chose.

   Le parcours ne s'arrête donc PAS à « la palette s'est fermée ». Il va lire
   la tâche là où elle doit apparaître : dans la liste des tâches, dans la file
   du jour, et après un rechargement. Une création qui n'atterrit nulle part
   est exactement ce qu'une assertion sur la fermeture de la modale laisse
   passer.

   Compte VIERGE, horloge figée au 5 août 2026 : la tâche créée « aujourd'hui »
   doit tomber dans la journée que la vue affiche. Sans horloge figée, le
   parcours deviendrait intermittent une fois par jour, à minuit.
   ========================================================================= */

const INTITULE = 'Arroser les plantes';

/** Crée la tâche par le chemin clavier, du raccourci à la validation. */
const creerParLaPalette = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.keyboard.press('Meta+k');
  const palette = page.getByRole('dialog', { name: /commandes/i });
  await expect(palette).toBeVisible();

  /* Une recherche infructueuse ne laisse jamais dans un cul-de-sac : la
     création rapide est proposée en dernier. C'est le geste qu'on éprouve. */
  await page.getByRole('combobox').fill(INTITULE);
  const creation = page.getByRole('option').last();
  await expect(creation).toContainText(new RegExp(INTITULE, 'i'));

  await creation.click();
  await expect(palette).toBeHidden();
};

test('⌘K crée une tâche, et la tâche existe vraiment', async ({ page }) => {
  await ouvrirVierge(page, '/app');
  await creerParLaPalette(page);

  /* ÉTAT OBSERVABLE — la tâche est dans la liste, et sous « Aujourd'hui » :
     une tâche créée sans date atterrirait ailleurs, ou nulle part. */
  await page.goto('/app/tasks');
  await attendreHydratation(page);
  await expect(page.locator('[data-task]').filter({ hasText: INTITULE })).toHaveCount(1);
  await expect(
    page.getByRole('region', { name: "Aujourd'hui" }).locator('[data-task]'),
  ).toContainText(INTITULE);

  /* …et dans la file du jour : une tâche qui n'entre pas dans la journée n'a
     pas été créée là où l'utilisateur la cherchera. */
  await page.goto('/app/today');
  await attendreHydratation(page);
  await expect(page.locator('[data-queue] > [data-row]').filter({ hasText: INTITULE })).toHaveCount(
    1,
  );
});

test('la tâche créée par la palette survit au rechargement', async ({ page }) => {
  await ouvrirVierge(page, '/app');
  await creerParLaPalette(page);

  await page.goto('/app/tasks');
  await attendreHydratation(page);
  await expect(page.locator('[data-task]').filter({ hasText: INTITULE })).toHaveCount(1);

  /* La palette écrit-elle en base, ou seulement dans le store ? Seul le
     rechargement répond. */
  await page.reload();
  await attendreHydratation(page);
  await expect(page.locator('[data-task]').filter({ hasText: INTITULE })).toHaveCount(1);
});

test('la palette mène aux onze vues, au clavier seul', async ({ page }) => {
  await ouvrirVierge(page, '/app');

  await page.keyboard.press('Meta+k');
  /* Requête VIDE : la palette propose les onze vues. Dès qu'on saisit quelque
     chose, elle cherche dans les entités — habitudes, tâches, objectifs,
     courses — et non plus dans la navigation. La distinction compte : taper
     « objectifs » sur un compte vierge ne propose PAS la vue du même nom, mais
     la création d'une tâche ainsi intitulée. */
  await expect(page.getByRole('option')).toHaveCount(11);

  /* De bout en bout sans souris : c'est ce que la palette promet à qui n'en
     utilise pas. Deux flèches depuis le premier élément — l'ordre est celui de
     `NAV_ITEMS` : tableau de bord, journée, calendrier. */
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/app\/calendar$/);
  await attendreHydratation(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
