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
});
