import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo } from '../helpers/app';

/* ============================================================================
   PARCOURS 3 — Déplacer une tâche au calendrier, à la SOURIS et au CLAVIER.

   Ce que le parcours prouve : le glisser-déposer n'exclut personne. C'est le
   point d'accessibilité le plus exposé du produit — un geste continu, sans
   équivalent naturel, qu'on déclare volontiers « accessible » sans jamais
   l'éprouver. Ici, les deux chemins mènent au même état observable : la tâche
   a changé de jour, et elle y est encore après rechargement.

   Le mode grille n'existe pas sous 768 px : le calendrier y retombe sur un
   agenda, où il n'y a rien à déplacer. Le parcours est donc un parcours de
   BUREAU, et il le dit plutôt que de sauter en silence.
   ========================================================================= */

const ROUTE = '/app/calendar';
const TACHE = 'Réunion de travail';

/** Bloc d'une tâche dans une case de jour donnée. */
const bloc = (page: import('@playwright/test').Page, jour: string) =>
  page.locator(`[data-day="${jour}"] [data-event]`).filter({ hasText: TACHE });

/** Motif du saut : le mode grille n'existe pas sous 768 px. */
const MOTIF = 'le mode grille retombe sur l’agenda sous 768 px : il n’y a rien à déplacer';

test.describe('déplacer une tâche au calendrier', () => {
  test('au clavier : la tâche change de jour, et l’écriture tient', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', MOTIF);
    await ouvrirAvecDemo(page, ROUTE);
    await expect(bloc(page, '2026-08-05')).toHaveCount(1);

    /* Entrée ouvre le mode déplacement, les flèches travaillent en jours,
       Entrée valide. Aucune souris n'intervient. */
    const cible = page.locator('[data-event]').filter({ hasText: TACHE }).first();
    await cible.focus();
    await page.keyboard.press('Enter');
    await expect(cible).toHaveAttribute('data-moving', 'true');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-toast]')).toContainText('Replanifié');
    await expect(bloc(page, '2026-08-06')).toHaveCount(1);
    await expect(bloc(page, '2026-08-05')).toHaveCount(0);

    /* ÉTAT OBSERVABLE, pas geste réussi : la nouvelle date doit être en base.
       Un déplacement qui ne survit pas au rechargement a déplacé un pixel. */
    await page.reload();
    await attendreHydratation(page);
    await expect(bloc(page, '2026-08-06')).toHaveCount(1);
  });

  test('à la souris : le même déplacement, le même état', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', MOTIF);
    await ouvrirAvecDemo(page, ROUTE);
    await expect(bloc(page, '2026-08-05')).toHaveCount(1);

    const source = page.locator('[data-event]').filter({ hasText: TACHE }).first();
    const destination = page.locator('[data-day="2026-08-07"]');

    /* `dragTo` seul ne suffit pas à dnd-kit, qui exige un mouvement en
       plusieurs étapes pour franchir sa distance d'activation : un saut unique
       du point A au point B ne déclenche jamais le capteur. */
    const depart = await source.boundingBox();
    const arrivee = await destination.boundingBox();
    expect(depart, 'bloc introuvable').toBeTruthy();
    expect(arrivee, 'case du 7 août introuvable').toBeTruthy();

    await page.mouse.move(depart!.x + depart!.width / 2, depart!.y + depart!.height / 2);
    await page.mouse.down();
    await page.mouse.move(depart!.x + depart!.width / 2 + 12, depart!.y + depart!.height / 2 + 12, {
      steps: 6,
    });
    await page.mouse.move(arrivee!.x + arrivee!.width / 2, arrivee!.y + arrivee!.height / 2, {
      steps: 12,
    });
    await page.mouse.up();

    await expect(bloc(page, '2026-08-07')).toHaveCount(1);
    await expect(bloc(page, '2026-08-05')).toHaveCount(0);

    await page.reload();
    await attendreHydratation(page);
    await expect(bloc(page, '2026-08-07')).toHaveCount(1);
  });

  test('Échap abandonne : rien n’est écrit', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', MOTIF);
    await ouvrirAvecDemo(page, ROUTE);

    const cible = page.locator('[data-event]').filter({ hasText: TACHE }).first();
    await cible.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(cible).not.toHaveAttribute('data-moving', 'true');
    await expect(bloc(page, '2026-08-05')).toHaveCount(1);

    /* Un abandon qui écrirait quand même ne se verrait qu'au rechargement. */
    await page.reload();
    await attendreHydratation(page);
    await expect(bloc(page, '2026-08-05')).toHaveCount(1);
  });
});
