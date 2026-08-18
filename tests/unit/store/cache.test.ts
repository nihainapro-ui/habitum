import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { seedEmpty } from '@/lib/data';
import { dateKey, today } from '@/lib/domain';
import { cacheDerive, useStore } from '@/lib/store';

/* Tâche 5.9 — le cache dérivé branché sur les écritures réelles.

   Le test unitaire du cache prouve la mécanique ; celui-ci prouve le
   BRANCHEMENT, c'est-à-dire la seule chose qui casse en pratique : une
   écriture qui oublie d'invalider. Elle ne se voit pas à l'écran tout de
   suite — elle se voit six jours plus tard, sous la forme d'un record qui
   n'avance plus. */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  await seedEmpty();
  await useStore.getState().hydrate();
  cacheDerive.clear();
});

const creer = async (name: string) => {
  await useStore.getState().createHabit({
    name,
    category: 'health',
    goal: { kind: 'check', target: 1, step: 1, unit: '' },
    mode: 'dow',
    days: [0, 1, 2, 3, 4, 5, 6],
    subItems: [],
    reminders: [],
    archived: false,
    note: '',
  });
  return useStore.getState().habits.find((h) => h.name === name)!;
};

describe('invalidation du cache dérivé', () => {
  it('journaliser une valeur oublie les métriques de CETTE habitude', async () => {
    const h1 = await creer('Boire de l’eau');
    const h2 = await creer('Méditer');

    cacheDerive.get(h1.id, 'streak', 420, () => 7);
    cacheDerive.get(h2.id, 'streak', 420, () => 3);
    expect(cacheDerive.size).toBe(2);

    await useStore.getState().setLogValue(h1.id, dateKey(today()), 1);

    /* Celle de `h2` est intacte : c'est tout l'objet de la correction B3. */
    expect(cacheDerive.size).toBe(1);
    expect(cacheDerive.get(h2.id, 'streak', 420, () => 99)).toBe(3);
  });

  it('modifier la définition oublie ses métriques', async () => {
    const h = await creer('Courir');
    cacheDerive.get(h.id, 'best', 365, () => 12);

    await useStore.getState().updateHabit(h.id, { days: [0] });
    expect(cacheDerive.size).toBe(0);
  });

  it('une réinitialisation oublie tout', async () => {
    const h = await creer('Lire');
    cacheDerive.get(h.id, 'best', 365, () => 12);

    await useStore.getState().resetAccount();
    expect(cacheDerive.size).toBe(0);
  });

  it('l’hydratation repart d’un cache vide', async () => {
    cacheDerive.get('h1', 'best', 365, () => 12);
    await useStore.getState().hydrate();
    expect(cacheDerive.size).toBe(0);
  });

  /* Tâche 8.5 — la même propriété, mais À L'ÉCHELLE DU PLAN.
     Les tests ci-dessus travaillent sur deux habitudes : avec deux, invalider
     tout ou invalider juste ce qu'il faut se ressemble beaucoup. La question du
     plan porte sur DEUX CENTS — « cocher une habitude ne recalcule pas les
     métriques des 199 autres », moins de dix recalculs au clic.

     Le plan mesurait cela par un compteur posé sur `window` depuis un test de
     navigateur. On le mesure ici, où c'est DÉTERMINISTE et où l'unité est
     exacte : le nombre d'entrées oubliées EST le nombre de recalculs que le
     prochain rendu devra payer. Un compteur de navigateur aurait mesuré la même
     chose, plus tard, moins précisément, et au prix d'une trappe en
     production. */
  it('à 200 habitudes, cocher n’en oublie que trois métriques', async () => {
    const habitudes = [];
    for (let i = 0; i < 200; i++) habitudes.push(await creer(`Habitude ${i}`));

    /* Trois fenêtres par habitude, comme les vues en demandent : série
       courante, record, taux à 30 jours. Six cents entrées en cache. */
    for (const h of habitudes) {
      cacheDerive.get(h.id, 'streak', 420, () => 1);
      cacheDerive.get(h.id, 'best', 365, () => 1);
      cacheDerive.get(h.id, 'pct30', 30, () => 1);
    }
    expect(cacheDerive.size).toBe(600);

    const cible = habitudes[0]!;
    await useStore.getState().setLogValue(cible.id, dateKey(today()), 1);

    /* Trois oubliées, 597 conservées. Le seuil du plan est « moins de dix » :
       on est à trois, et surtout le nombre ne dépend PAS du nombre
       d'habitudes — c'est ce qui distingue une invalidation ciblée d'un
       `clear()` qui passerait aussi ce test à petite échelle. */
    const oubliees = 600 - cacheDerive.size;
    expect(oubliees, `${oubliees} métriques recalculées au clic`).toBeLessThan(10);
    expect(oubliees).toBe(3);

    /* Et les autres sont bien LES MÊMES valeurs, pas des entrées recréées. */
    expect(cacheDerive.get(habitudes[1]!.id, 'streak', 420, () => 99)).toBe(1);
    expect(cacheDerive.get(habitudes[199]!.id, 'pct30', 30, () => 99)).toBe(1);
  });
});
