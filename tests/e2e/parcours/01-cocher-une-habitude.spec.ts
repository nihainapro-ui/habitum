import { expect, test } from '@playwright/test';
import golden from '@/tests/fixtures/golden.json';
import { attendreHydratation, ecrireEnBase, ouvrirAvecDemo } from '../helpers/app';

/* ============================================================================
   PARCOURS 1 — Cocher une habitude quantifiée, puis recharger.

   Le cœur du produit. Trois choses doivent tenir ENSEMBLE, et c'est leur
   conjonction qui fait le parcours : la valeur du jour est journalisée, les
   métriques qui en dépendent suivent immédiatement, et tout cela survit à un
   rechargement — c'est-à-dire que c'est réellement écrit en base, pas seulement
   dans un état React.

   Un test de vue vérifie l'un ou l'autre. Le parcours exige les trois, et sur
   deux vues : on incrémente depuis « Aujourd'hui », on relit depuis
   « Habitudes ». Une écriture qui ne se propage qu'à la vue d'origine est
   exactement le défaut que ce parcours doit attraper.
   ========================================================================= */

test('cocher, décocher, recharger : la valeur, la série et le taux suivent', async ({ page }) => {
  await ouvrirAvecDemo(page, '/app/today', { historique: true });

  const eau = page.getByRole('checkbox', { name: "Boire 8 verres d'eau" });
  await expect(eau).not.toBeChecked();
  /* Le jeu de démonstration journalise 5 verres sur 8 au 5 août. */
  await expect(page.getByText('5/8 verres')).toBeVisible();

  /* Trois incréments : 5 → 8, la cible est atteinte et la case se coche. */
  for (const attendu of ['6/8 verres', '7/8 verres', '8/8 verres']) {
    await page.getByRole('button', { name: /Augmenter : Boire 8 verres/ }).click();
    await expect(page.getByText(attendu)).toBeVisible();
  }
  await expect(eau).toBeChecked();

  /* RECHARGEMENT — la seule preuve que la valeur est en base et non en
     mémoire. Le prototype écrivait dans `localStorage` à chaque geste ; le
     portage écrit dans IndexedDB, et une écriture avalée ne se voit qu'ici. */
  await page.reload();
  await attendreHydratation(page);
  await expect(page.getByText('8/8 verres')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: "Boire 8 verres d'eau" })).toBeChecked();

  /* La série suit, sur une AUTRE vue. `golden.habit.water.streak` vaut 2 : le
     jour courant réussi la porte à 3. Le chiffre vient de l'oracle, pas d'une
     observation — si le portage dérive, c'est ici qu'on le voit à l'écran. */
  await page.goto('/app/habits');
  await attendreHydratation(page);
  const carte = page.getByRole('article', { name: "Boire 8 verres d'eau" });
  await expect(carte.getByTestId('streak')).toHaveText(String(golden['habit.water'].streak + 1));

  /* DÉCOCHER doit revenir en arrière, sans reliquat. Une remise à zéro qui
     laisserait la série gonflée serait pire qu'un compteur figé : elle mentirait
     dans le sens flatteur. */
  const mercredi = carte.getByRole('checkbox', { name: /mercredi 5 août/ });
  await expect(mercredi).toBeChecked();
  await mercredi.click();
  await expect(mercredi).not.toBeChecked();
  await expect(carte.getByTestId('streak')).toHaveText(String(golden['habit.water'].streak));

  await page.reload();
  await attendreHydratation(page);
  await expect(
    page.getByRole('article', { name: "Boire 8 verres d'eau" }).getByTestId('streak'),
  ).toHaveText(String(golden['habit.water'].streak));
});

/* G9 — la règle la plus facile à casser au portage, et la seule dont
   l'inversion ne se voit pas à l'œil : une habitude à plafond réussie
   « d'avance » a l'air parfaitement normale.
   `vue-today.spec.ts` éprouve déjà les trois seuils. Ce que le PARCOURS ajoute,
   et qu'aucun test de vue ne fait, c'est le RECHARGEMENT entre les seuils :
   l'état « dans le plafond » ne se recalcule pas à partir de rien, il se
   recalcule à partir de ce qui a été écrit — et une valeur absente doit rester
   absente, jamais devenir zéro. */
test('une habitude à plafond ne se coche pas d’avance, même après rechargement', async ({
  page,
}) => {
  /* Le jeu de démonstration ne porte aucune habitude à plafond : on en pose
     une, SANS aucune entrée du jour. C'est exactement le cas qui piège. */
  await ouvrirAvecDemo(page, '/app/today');
  await ecrireEnBase(page, {
    habits: [
      {
        id: 'cafe',
        name: 'Pas plus de 2 cafés',
        category: 'health',
        goal: { kind: 'limit', target: 2, step: 1, unit: 'cafés' },
        mode: 'dow',
        days: [0, 1, 2, 3, 4, 5, 6],
        subItems: [],
        reminders: [],
        archived: false,
        note: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
  });

  const plafond = () => page.getByRole('checkbox', { name: 'Pas plus de 2 cafés' });
  const augmenter = () => page.getByRole('button', { name: /Augmenter : Pas plus de 2 cafés/ });

  await page.reload();
  await attendreHydratation(page);
  /* Rien de journalisé : PAS réussi. Le piège serait de lire « 0 ≤ 2 » sur une
     clé absente et de cocher la case. */
  await expect(plafond()).not.toBeChecked();

  /* Un café : dans le plafond, et ça survit au rechargement. */
  await augmenter().click();
  await expect(plafond()).toBeChecked();
  await page.reload();
  await attendreHydratation(page);
  await expect(plafond()).toBeChecked();

  /* Deux : encore dedans. Trois : dehors — et ça survit aussi. */
  await augmenter().click();
  await expect(plafond()).toBeChecked();
  await augmenter().click();
  await expect(plafond()).not.toBeChecked();

  await page.reload();
  await attendreHydratation(page);
  await expect(plafond()).not.toBeChecked();
});
