import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo, ouvrirVierge, verifierPaliers } from './helpers/app';

/* Vue « Focus » — 05-SPEC-VUES.md § 9, plan 5 tâche 5.9. Corrige B5.

   L'horloge de ces tests n'est PAS figée : c'est justement le passage du temps
   qu'on éprouve. On utilise `clock.install`, qui permet de faire avancer le
   temps à la demande — vingt-cinq minutes en quelques millisecondes. */

const ROUTE = '/app/timer';

test.describe('timer', () => {
  test('les quatre modes sont proposés', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    for (const mode of ['Pomodoro', 'Chronomètre', 'Compte à rebours', 'Intervalles']) {
      await expect(page.getByRole('radio', { name: mode })).toBeVisible();
    }
  });

  test('le Pomodoro démarre à 25:00 et décompte', async ({ page }) => {
    await ouvrirVierge(page, ROUTE, { horlogePilotable: true });

    await expect(page.getByTestId('elapsed')).toHaveText('25:00');
    await expect(page.getByTestId('phase')).toHaveText('Concentration');

    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.clock.runFor('00:10');
    await expect(page.getByTestId('elapsed')).toHaveText('24:50');
  });

  /* Le cœur de B5 : le temps se déduit de l'horloge murale, pas d'un compteur
     de ticks. Vingt-cinq minutes d'un coup — comme un onglet en arrière-plan
     dont les minuteries ont été suspendues — et la phase doit avoir basculé. */
  test('une phase entière se termine sans dérive, même sans ticks', async ({ page }) => {
    await ouvrirVierge(page, ROUTE, { horlogePilotable: true });

    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.clock.fastForward('25:00');
    await page.clock.runFor(500);

    await expect(page.getByTestId('phase')).toHaveText('Pause');
    /* La concentration terminée est enregistrée : 25 minutes, pas 19. */
    await expect(page.locator('[data-sessions] li')).toContainText('25 min');
  });

  test('une session survit au rechargement, et reprend en pause', async ({ page }) => {
    await ouvrirVierge(page, ROUTE, { horlogePilotable: true });

    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.clock.runFor('00:30');
    await expect(page.getByTestId('elapsed')).toHaveText('24:30');

    await page.reload();
    await attendreHydratation(page);

    /* Reprise EN PAUSE, écoulé conservé : additionner le temps passé
       application fermée compterait des heures qui n'ont pas été travaillées. */
    await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible();
    /* L'écoulé est enregistré par battement de cinq secondes : on garantit
       qu'au plus cinq secondes sont perdues, pas l'exactitude à la seconde.
       Écrire à chaque tick de 250 ms coûterait quarante écritures par seconde
       pour la même garantie à un dixième près. */
    await expect(page.getByTestId('elapsed')).toHaveText(/^24:3[0-5]$/);
    await expect(page.getByRole('status')).toContainText('Session de minuteur restaurée');
  });

  test('le chronomètre compte à l’endroit', async ({ page }) => {
    await ouvrirVierge(page, ROUTE, { horlogePilotable: true });

    await page.getByRole('radio', { name: 'Chronomètre' }).click();
    await expect(page.getByTestId('elapsed')).toHaveText('00:00');

    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.clock.runFor('00:05');
    await expect(page.getByTestId('elapsed')).toHaveText('00:05');
  });

  test('le compte à rebours suit le préréglage choisi', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);

    await page.getByRole('radio', { name: 'Compte à rebours' }).click();
    await page.getByRole('radio', { name: '45 min' }).click();
    await expect(page.getByTestId('elapsed')).toHaveText('45:00');
  });

  test('enregistrer une session crédite l’habitude visée', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE, { horlogePilotable: true });

    await page.getByRole('radio', { name: 'Méditer' }).click();
    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.clock.runFor('05:00');
    await page.getByRole('button', { name: 'Enregistrer la session' }).click();

    /* Le jeu de démonstration porte déjà « Méditer 15 min » et « Lecture
       profonde 45 min » : un filtre sur « 5 min » les attraperait toutes les
       deux et passerait AVANT que la nouvelle session soit écrite. On attend
       donc la troisième ligne, puis son intitulé exact. */
    const sessions = page.locator('[data-sessions] li');
    await expect(sessions).toHaveCount(3);
    await expect(sessions.filter({ hasText: /^Méditer5 min$/ })).toHaveCount(1);

    /* « Méditer » compte des minutes : la session s'ajoute à sa valeur du jour.
       Le jeu de démonstration en journalise 15 ; cinq de plus font 20. */
    await page.goto('/app/today');
    await attendreHydratation(page);
    await expect(page.getByText('20/15 min')).toBeVisible();
  });

  test('remettre à zéro ne crée aucune session', async ({ page }) => {
    await ouvrirVierge(page, ROUTE, { horlogePilotable: true });

    await page.getByRole('button', { name: 'Démarrer' }).click();
    await page.clock.runFor('02:00');
    await page.getByRole('button', { name: 'Réinitialiser' }).click();

    await expect(page.getByTestId('elapsed')).toHaveText('25:00');
    await expect(page.locator('[data-sessions] li')).toHaveCount(0);
  });

  test('état vide : aucune session enregistrée', async ({ page }) => {
    await ouvrirVierge(page, ROUTE);
    await expect(page.getByText('Aucune session enregistrée')).toBeVisible();
  });

  test('sans débordement horizontal aux quatre paliers', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    await verifierPaliers(page, ROUTE);
  });

  test('accessible', async ({ page }) => {
    await ouvrirAvecDemo(page, ROUTE);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
  });
});
