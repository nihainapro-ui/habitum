import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo } from '../helpers/app';

/* ============================================================================
   PARCOURS 4 — Pomodoro complet : démarrer, recharger, reprendre, terminer,
   créditer l'habitude.

   Ce que le parcours prouve : B5 est réellement corrigé. Le prototype comptait
   les ticks d'un `setInterval` ; un onglet en arrière-plan voyait ses minuteries
   étranglées, et vingt-cinq minutes de concentration devenaient dix-neuf minutes
   enregistrées. Le portage se déduit de l'horloge murale.

   Ce parcours va plus loin qu'un test de vue : il enchaîne les cinq étapes
   d'affilée, avec un RECHARGEMENT au milieu — l'endroit exact où le prototype
   perdait le compte — et il finit sur la valeur créditée à l'habitude, deux
   vues plus loin.

   L'horloge est PILOTABLE, pas figée : c'est le passage du temps qu'on éprouve.
   ========================================================================= */

const ROUTE = '/app/timer';

test('démarrer, recharger, reprendre, terminer, créditer l’habitude', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { horlogePilotable: true });

  /* Le minuteur vise une habitude : c'est ce qui rend la session utile plutôt
     que décorative. « Méditer » compte des minutes, et le jeu de démonstration
     en journalise déjà 15 sur 15 aujourd'hui. */
  await page.getByRole('radio', { name: 'Méditer' }).click();
  await expect(page.getByTestId('elapsed')).toHaveText('25:00');
  await expect(page.getByTestId('phase')).toHaveText('Concentration');

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor('05:00');
  await expect(page.getByTestId('elapsed')).toHaveText('20:00');

  /* RECHARGEMENT en pleine session — le moment où le prototype perdait tout.
     La reprise se fait EN PAUSE : additionner le temps passé application
     fermée compterait des heures qui n'ont pas été travaillées. */
  await page.reload();
  await attendreHydratation(page);
  await expect(page.getByRole('status')).toContainText('Session de minuteur restaurée');
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible();
  /* L'écoulé est enregistré par battement de cinq secondes : au plus cinq
     secondes PERDUES, jamais cinq minutes. Perdre de l'écoulé fait remonter le
     restant — d'où 20:00 à 20:05, et non l'inverse. Écrire à chaque tick de
     250 ms coûterait quarante écritures par seconde pour la même garantie à un
     dixième près. */
  await expect(page.getByTestId('elapsed')).toHaveText(/^20:0[0-5]$/);

  await page.getByRole('button', { name: 'Reprendre' }).click();

  /* Les vingt minutes restantes d'un coup — comme un onglet en arrière-plan
     dont les minuteries ont été suspendues. La phase doit avoir basculé, et la
     session enregistrée doit valoir VINGT-CINQ minutes, pas ce qu'un compteur
     de ticks aurait vu passer.

     Dix secondes de rabiot, et elles sont nécessaires : le rechargement a pu
     coûter jusqu'à cinq secondes d'écoulé au battement d'enregistrement.
     Avancer d'exactement vingt minutes laisserait la concentration à 24:56 —
     et la phase, à raison, ne basculerait pas. `sessionMinutes` arrondit :
     25:06 comme 25:00 créditent vingt-cinq minutes. */
  await page.clock.fastForward('20:10');
  await page.clock.runFor(500);

  await expect(page.getByTestId('phase')).toHaveText('Pause');
  const sessions = page.locator('[data-sessions] li');
  await expect(sessions.filter({ hasText: '25 min' })).toHaveCount(1);

  /* L'HABITUDE EST CRÉDITÉE, deux vues plus loin. 15 minutes journalisées plus
     25 de concentration : 40. Un minuteur qui n'alimente rien n'est qu'un
     chronomètre. */
  await page.goto('/app/today');
  await attendreHydratation(page);
  await expect(page.getByText('40/15 min')).toBeVisible();
});

test('la session terminée survit au rechargement', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { horlogePilotable: true });

  await page.getByRole('radio', { name: 'Méditer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.fastForward('25:00');
  await page.clock.runFor(500);
  await expect(page.getByTestId('phase')).toHaveText('Pause');

  await page.reload();
  await attendreHydratation(page);
  /* La session est en base, et le crédit de l'habitude aussi : c'est la
     différence entre « affiché » et « enregistré ». */
  await expect(page.locator('[data-sessions] li').filter({ hasText: '25 min' })).toHaveCount(1);

  await page.goto('/app/today');
  await attendreHydratation(page);
  await expect(page.getByText('40/15 min')).toBeVisible();
});

test('abandonner en cours ne crédite rien', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { horlogePilotable: true });

  const sessionsAvant = await page.locator('[data-sessions] li').count();

  await page.getByRole('radio', { name: 'Méditer' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await page.clock.runFor('10:00');
  await page.getByRole('button', { name: 'Réinitialiser' }).click();

  await expect(page.getByTestId('elapsed')).toHaveText('25:00');
  await expect(page.locator('[data-sessions] li')).toHaveCount(sessionsAvant);

  /* G3 — dix minutes commencées mais abandonnées ne sont pas dix minutes
     travaillées. L'habitude reste à sa valeur du jour. */
  await page.goto('/app/today');
  await attendreHydratation(page);
  await expect(page.getByText('15/15 min')).toBeVisible();
});
