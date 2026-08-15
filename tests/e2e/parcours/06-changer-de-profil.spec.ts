import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge } from '../helpers/app';

/* ============================================================================
   PARCOURS 6 — Changer de profil.

   ÉCART AU PLAN, ASSUMÉ ET ÉCRIT ICI. Le plan 8 annonce que ce parcours prouve
   que « l'isolation des profils tient ». Il n'y a pas d'isolation à éprouver :
   dans le portage comme dans le prototype, un profil est une IDENTITÉ — nom,
   identifiant, fonction, avatar, date d'entrée — et non une partition de
   données. Les tables `habits`, `tasks`, `logs`… n'ont aucune colonne de
   profil, et `activeProfile` est une simple clé de `meta` (03-ARCHITECTURE
   § Clés d'état persistées). Un test qui vérifierait une isolation inexistante
   ne serait pas un test : ce serait une affirmation fausse rendue verte par
   construction.

   Ce parcours éprouve donc ce que la bascule GARANTIT réellement :

   1. le profil actif change, et l'identité affichée le suit ;
   2. le choix survit au rechargement — il est écrit, pas seulement affiché ;
   3. la suppression se confirme, et réattribue l'actif sans laisser le compte
      sans titulaire ;
   4. le dernier profil ne se supprime pas ;
   5. les données sont PARTAGÉES entre profils, délibérément — le parcours le
      fixe explicitement pour qu'un lecteur futur ne suppose pas le contraire,
      et pour qu'une isolation ajoutée un jour casse ici, visiblement, plutôt
      que d'être introduite sans que personne s'en aperçoive.
   ========================================================================= */

const ROUTE = '/app/profile';

test('la bascule change l’identité affichée, et le choix est écrit', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  /* Le compte est amorcé avec un profil unique : on lui donne une identité
     reconnaissable avant d'en créer une seconde. */
  await page.getByLabel('Nom', { exact: true }).fill('Amina');
  await page.getByLabel('Identifiant').fill('amina');

  const lignes = page.locator('[data-profiles] li');
  await expect(lignes).toHaveCount(1);

  /* Créer un profil l'ACTIVE : c'est le comportement du prototype, et il évite
     le geste en deux temps « créer puis activer ». */
  await page.getByLabel('Nom du nouveau profil').fill('Bilal');
  await page.getByRole('button', { name: 'Nouveau profil' }).click();

  await expect(lignes).toHaveCount(2);
  await expect(lignes.filter({ hasText: 'Bilal' })).toContainText('Actif');
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Bilal');

  /* Retour sur le premier profil, par le bouton « Activer ». */
  await lignes.filter({ hasText: 'Amina' }).getByRole('button', { name: 'Activer' }).click();
  await expect(lignes.filter({ hasText: 'Amina' })).toContainText('Actif');
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Amina');
  await expect(page.getByLabel('Identifiant')).toHaveValue('amina');

  /* ÉCRIT, pas seulement affiché. */
  await page.reload();
  await attendreHydratation(page);
  await expect(page.locator('[data-profiles] li').filter({ hasText: 'Amina' })).toContainText(
    'Actif',
  );
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Amina');
});

test('supprimer le profil actif se confirme, et réattribue l’actif', async ({ page }) => {
  await ouvrirVierge(page, ROUTE);

  await page.getByLabel('Nom', { exact: true }).fill('Amina');
  await page.getByLabel('Nom du nouveau profil').fill('Bilal');
  await page.getByRole('button', { name: 'Nouveau profil' }).click();

  const lignes = page.locator('[data-profiles] li');
  await expect(lignes.filter({ hasText: 'Bilal' })).toContainText('Actif');

  /* D4 — la suppression se confirme, toujours. */
  await page.getByRole('button', { name: 'Supprimer Bilal' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();

  await expect(lignes).toHaveCount(1);
  /* Le compte ne reste jamais sans titulaire : l'actif retombe sur le
     survivant. */
  await expect(lignes.filter({ hasText: 'Amina' })).toContainText('Actif');
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Amina');

  await page.reload();
  await attendreHydratation(page);
  await expect(page.locator('[data-profiles] li')).toHaveCount(1);
  /* Et le dernier profil ne s'efface pas : le bouton n'est plus proposé. */
  await expect(page.getByRole('button', { name: /^Supprimer/ })).toHaveCount(0);
});

test('les données sont partagées entre profils — délibérément', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  /* Six habitudes sous le profil d'origine. */
  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(6);

  await page.goto(ROUTE);
  await attendreHydratation(page);
  await page.getByLabel('Nom du nouveau profil').fill('Second');
  await page.getByRole('button', { name: 'Nouveau profil' }).click();
  await expect(page.locator('[data-profiles] li').filter({ hasText: 'Second' })).toContainText(
    'Actif',
  );

  /* LES MÊMES SIX. Un profil n'est pas un compte : c'est une carte d'identité
     posée sur les mêmes données. Le prototype faisait exactement cela, et le
     portage ne s'en écarte pas — mais l'écrire noir sur blanc évite qu'on
     promette un jour une confidentialité entre profils que le produit n'a
     jamais offerte. */
  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(6);
});
