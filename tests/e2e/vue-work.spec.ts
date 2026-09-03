import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';
import { LARGEURS_MESUREES, releverDebordements } from './helpers/debordement';

/* Vue « Work » — spec du 2026-08-31.

   Work est NEUF : il n'a pas d'oracle dans les 62 valeurs de référence. Ces
   contrôles posent donc la recette. */

const ROUTE = '/app/work';

test.describe('work', () => {
  test('un compte vierge le dit, et propose de créer', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('Aucun projet')).toBeVisible();
  });

  test('créer un projet, y ajouter une étape, la faire avancer', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('button', { name: 'Nouveau projet' }).first().click();
    await page.getByRole('dialog').getByRole('textbox').first().fill('Déménagement');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(page.getByText('Déménagement')).toBeVisible();
    /* Un projet SANS étape affiche « 0 sur 0 », pas 100 % : c'est la règle 3
       du CLAUDE.md, et elle se vérifie à l'écran, pas seulement en unitaire. */
    await expect(page.getByText('0 sur 0')).toBeVisible();

    await page.getByRole('button', { name: 'Ouvrir Déménagement' }).click();
    await page.getByRole('button', { name: 'Nouvelle tâche' }).first().click();

    const boite = page.getByRole('dialog');
    await boite.getByRole('textbox').first().fill('Réserver le camion');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(page.getByText('Réserver le camion')).toBeVisible();
    /* Une étape neuve tombe dans « À faire » : le défaut du formulaire est
       aussi celui du modèle. */
    await expect(page.locator('[data-colonne="todo"] [data-ptask]')).toHaveCount(1);

    /* Le statut se change SUR LA LIGNE, sans passer par l'éditeur. */
    await page.getByRole('combobox', { name: /statut.*réserver le camion/i }).click();
    await page.getByRole('option', { name: 'Terminé' }).click();

    await expect(page.locator('[data-colonne="done"] [data-ptask]')).toHaveCount(1);
    await expect(page.locator('[data-colonne="todo"] [data-ptask]')).toHaveCount(0);
  });

  test('le jeu de démonstration montre un projet réel', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await expect(page.getByText('Refonte du site')).toBeVisible();

    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    /* Les TROIS colonnes existent toujours, même vides : une colonne absente
       ferait disparaître un statut sans bruit. */
    await expect(page.locator('[data-colonne]')).toHaveCount(3);
    await expect(page.locator('[data-ptask]')).toHaveCount(5);
  });

  test('une étape en retard se signale, une étape terminée non', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    /* Le jeu de démonstration pose une étape échue et non terminée, et deux
       étapes échues mais TERMINÉES. Seule la première compte. */
    await expect(page.getByText(/1 en retard/)).toBeVisible();
  });

  test('les sous-tâches se comptent, se déplient et se cochent sur la ligne', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();

    const detail = page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' });
    await expect(detail).toContainText('1/3');

    /* Une étape SANS sous-tâche n'affiche pas « 0/0 » : il n'y a rien à
       avancer, et un compteur vide serait un chiffre fabriqué (règle 3). */
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Mise en ligne' }),
    ).toHaveCount(0);

    /* Replié par défaut : trois colonnes de listes ouvertes rendraient le
       tableau illisible sur téléphone. */
    await expect(page.getByRole('checkbox', { name: 'Menu mobile' })).toHaveCount(0);
    /* `aria-expanded` reflète le pli, et pas seulement la présence de la case
       à l'écran : cette assertion n'avait été écartée que faute d'un
       `aria-controls` pour lui donner un sens — il existe désormais
       (`ProjectBoard.tsx`). */
    await expect(detail).toHaveAttribute('aria-expanded', 'false');
    await detail.click();
    await expect(detail).toHaveAttribute('aria-expanded', 'true');

    const projet = page.getByText('2 sur 5');
    await expect(projet).toBeVisible();

    await page.getByRole('checkbox', { name: 'Menu mobile' }).click();
    await expect(detail).toContainText('2/3');

    /* LA JAUGE DU PROJET NE BOUGE PAS. Les sous-tâches détaillent une étape,
       elles ne la fractionnent pas : deux jauges qui bougent d'un même geste
       ne mesurent plus rien de compréhensible. */
    await expect(projet).toBeVisible();
    await expect(page.locator('[data-colonne="done"] [data-ptask]')).toHaveCount(2);

    /* ÉCRIT EN BASE, pas seulement à l'écran : un cochage qui ne survit pas au
       rechargement est un cochage perdu. */
    await page.reload();
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }),
    ).toContainText('2/3');
  });

  test('l’éditeur nomme les sous-tâches, et ne défait pas ce qui est fait', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();

    const detail = page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' });
    await expect(detail).toContainText('1/3');

    await page.getByRole('button', { name: 'Modifier Intégration' }).click();
    const boite = page.getByRole('dialog');
    await boite.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await boite.getByLabel('Sous-tâches 4').fill('Pied de page');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    /* 1/4, PAS 0/4. `done` traverse le formulaire sans être modifié : un
       éditeur qui ne transporte que les intitulés décocherait toutes les
       sous-tâches faites au premier enregistrement de l'étape — une perte
       silencieuse, invisible à la relecture du diff. */
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }),
    ).toContainText('1/4');
  });

  test('renommer une sous-tâche DÉJÀ FAITE ne la décoche pas', async ({ page }) => {
    /* Le test voisin n'édite que la sous-tâche neuve, dont `done` vaut `false`
       d'office : la branche `j === i` de l'éditeur n'y est jamais exercée sur
       un élément coché, et remplacer `{ ...s, label: x }` par
       `{ label: x, done: false }` y passerait inaperçu. Ici, l'intitulé
       modifié est celui de la seule sous-tâche faite du jeu de démonstration —
       la seule position où ce choix se voit. */
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }),
    ).toContainText('1/3');

    await page.getByRole('button', { name: 'Modifier Intégration' }).click();
    const boite = page.getByRole('dialog');
    await boite.getByLabel('Sous-tâches 1').fill('Pages statiques et 404');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }),
    ).toContainText('1/3');
  });

  test('une étape neuve peut naître avec ses sous-tâches', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('button', { name: 'Nouveau projet' }).first().click();
    await page.getByRole('dialog').getByRole('textbox').first().fill('Déménagement');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await page.getByRole('button', { name: 'Ouvrir Déménagement' }).click();
    await page.getByRole('button', { name: 'Nouvelle tâche' }).first().click();

    const boite = page.getByRole('dialog');
    await boite.getByRole('textbox').first().fill('Réserver le camion');
    await boite.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await boite.getByLabel('Sous-tâches 1').fill('Comparer trois loueurs');
    await boite.getByRole('button', { name: 'Ajouter une sous-tâche' }).click();
    await boite.getByLabel('Sous-tâches 2').fill('Réserver');
    await page.getByRole('button', { name: /enregistrer/i }).click();

    await expect(
      page.getByRole('button', { name: 'Afficher les sous-tâches : Réserver le camion' }),
    ).toContainText('0/2');
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await verifierPaliers(page, ROUTE);
  });

  test('le tableau ouvert, sous-tâches dépliées, ne coupe aucun texte', async ({ page }) => {
    /* `verifierPaliers` ci-dessus ne voit que le défilement du DOCUMENT : un
       libellé coupé PAR SA BOÎTE n'y paraît jamais. C'est la mesure du lot A
       qui l'attrape, et le tableau d'un projet lui échappe faute d'être une
       route — il s'ouvre au clic. */
    await ouvrirAvecDemo(page, ROUTE);
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    await page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }).click();
    await expect(page.getByRole('checkbox', { name: 'Menu mobile' })).toBeVisible();

    for (const largeur of LARGEURS_MESUREES) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.waitForTimeout(50);
      const { releve, balayes, exclusSwitch, exclusSwitchAttendus } =
        await releverDebordements(page);

      expect(
        balayes,
        `${largeur}px : seulement ${balayes} élément(s) balayé(s) — mesure suspecte`,
      ).toBeGreaterThan(20);
      /* Même garde-fou que `debordements.spec.ts` (tâche 5b) : l'attente ne
         s'écrit plus en dur, elle se déduit des rails de `Switch` RÉELLEMENT
         rendus par la page (`exclusSwitchAttendus`). Work n'en affiche aucun
         aujourd'hui, donc les deux valent 0 — mais ce sera aussi vrai le jour
         où un `Switch` y apparaîtra, sans qu'il faille revenir corriger ce
         chiffre. */
      expect(exclusSwitch, `${largeur}px`).toBe(exclusSwitchAttendus);
      expect(releve, `à ${largeur}px`).toEqual([]);
    }
  });

  test('accessible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ouvrirAvecDemo(page, ROUTE);
    /* Sans ces trois lignes, le scan porte sur la LISTE DES PROJETS : `ouvert`
       vaut `null` au premier rendu (`WorkView.tsx`), et le tableau — donc le
       bouton chevron, sa `SubList` et ses `role="checkbox"` — n'existe pas
       encore dans le DOM. Même angle mort que celui relevé pour le filet de
       débordement (~ligne 185 ci-dessus) : le tableau d'un projet ne s'atteint
       pas par une route, il s'ouvre au clic, et axe ne voit que ce qui est
       monté au moment où il tourne. */
    await page.getByRole('button', { name: 'Ouvrir Refonte du site' }).click();
    await page.getByRole('button', { name: 'Afficher les sous-tâches : Intégration' }).click();
    await expect(page.getByRole('checkbox', { name: 'Menu mobile' })).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const graves = violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id} — ${v.nodes.length} nœud(s)`);
    expect(graves).toEqual([]);
  });
});
