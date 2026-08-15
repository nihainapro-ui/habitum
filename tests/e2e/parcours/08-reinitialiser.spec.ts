import { expect, test } from '@playwright/test';
import { attendreHydratation, ouvrirAvecDemo } from '../helpers/app';

/* ============================================================================
   PARCOURS 8 — Réinitialiser, avec confirmation en deux temps.

   Ce que le parcours prouve : on ne détruit pas par accident. C'est le seul
   geste du produit qui efface tout, et il n'y a pas de serveur pour rattraper
   l'erreur — la corbeille n'existe pas, l'annulation non plus.

   Trois garanties, et il les faut toutes :
   1. le PREMIER clic n'efface rien. Il pose la question, et rien d'autre ;
   2. renoncer laisse le compte intact — chemin jamais éprouvé jusqu'ici, et
      pourtant le plus fréquent des deux ;
   3. confirmer efface réellement, et laisse une COPIE DE SECOURS qui se
      restaure. Sans elle, un clic de trop coûterait trois ans d'historique.

   B4 — après réinitialisation, le compte est VIERGE, et non repeuplé du jeu de
   démonstration comme le faisait le prototype : on ne rend pas à l'utilisateur
   des habitudes qu'il n'a pas créées.
   ========================================================================= */

const ROUTE = '/app/settings';

test('le premier clic n’efface rien, et renoncer laisse le compte intact', async ({ page }) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  const confirmer = page.getByRole('button', { name: 'Oui, tout réinitialiser' });
  await expect(confirmer).toBeVisible();

  /* Premier temps : la question est posée, RIEN n'est effacé. Les six
     habitudes sont encore là pendant que la confirmation attend. */
  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(6);

  /* Renoncer — le chemin le plus fréquent, et le moins testé. Revenir sur les
     réglages referme la question sans l'exécuter. */
  await page.goto(ROUTE);
  await attendreHydratation(page);
  await expect(page.getByRole('button', { name: 'Oui, tout réinitialiser' })).toHaveCount(0);

  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(6);
});

test('confirmer efface tout, laisse un compte vierge, et une copie restaurable', async ({
  page,
}) => {
  await ouvrirAvecDemo(page, ROUTE, { historique: true });

  /* Aucune copie tant qu'aucun geste destructeur n'a eu lieu. */
  await expect(page.getByTestId('backup-at')).toHaveCount(0);

  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, tout réinitialiser' }).click();

  /* Le badge de démonstration disparaît quand l'état rechargé est en place :
     c'est le signal que les neuf tables ont fini d'être vidées. */
  await expect(page.getByTitle('Jeu de démonstration')).toHaveCount(0);
  /* La copie est posée APRÈS l'effacement — la réinitialisation vide `meta`,
     et une copie écrite avant disparaîtrait au moment exact où elle sert. */
  await expect(page.getByTestId('backup-at')).toBeVisible();

  /* B4 — vierge, pas repeuplé. */
  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();

  await page.goto('/app/tasks');
  await attendreHydratation(page);
  await expect(page.locator('[data-task]')).toHaveCount(0);

  /* L'effacement survit au rechargement : c'est bien la base qui a été vidée,
     pas seulement le store. */
  await page.reload();
  await attendreHydratation(page);
  await expect(page.locator('[data-task]')).toHaveCount(0);

  /* LA COPIE RAMÈNE TOUT. Elle passe par le même importeur que les fichiers
     d'utilisateur : un chemin de restauration privé serait un chemin que
     personne ne teste. */
  await page.goto(ROUTE);
  await attendreHydratation(page);
  await page.getByRole('button', { name: 'Restaurer' }).click();
  await expect(page.getByTestId('import-report')).toBeVisible();

  await page.goto('/app/habits');
  await attendreHydratation(page);
  await expect(page.getByRole('article')).toHaveCount(6);
});
