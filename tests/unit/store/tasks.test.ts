import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, metaRepo, seedEmpty } from '@/lib/data';
import { useStore } from '@/lib/store';
import { occurrenceKey } from '@/lib/domain';

/* Tâche 5.6 — cocher une tâche récurrente ne la termine pas : elle revient.

   C'est la promesse que l'interface faisait déjà (« ⟳ Quotidienne ») et que
   rien ne tenait : la tâche cochée disparaissait pour toujours. */

const JOUR = '2026-08-05';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  await seedEmpty();
  await useStore.getState().hydrate();
});

const creerTache = async (recurrence?: { freq: 'daily' | 'weekly' | 'monthly' }) => {
  await useStore.getState().createTask({
    name: 'Promener le chien',
    category: 'home',
    date: JOUR,
    duration: 60,
    priority: 1,
    done: false,
    subTasks: [],
    note: '',
    ...(recurrence ? { recurrence } : {}),
  });
  return useStore.getState().tasks[0]!;
};

describe('toggleTaskOn — tâche unique', () => {
  it('coche et décoche, sans rien mémoriser d’autre', async () => {
    const t = await creerTache();

    await useStore.getState().toggleTaskOn(t.id, JOUR);
    expect(useStore.getState().tasks[0]?.done).toBe(true);
    expect(useStore.getState().occurrences.size).toBe(0);

    await useStore.getState().toggleTaskOn(t.id, JOUR);
    expect(useStore.getState().tasks[0]?.done).toBe(false);
  });
});

describe('toggleTaskOn — tâche récurrente', () => {
  it('mémorise l’occurrence et avance à la suivante', async () => {
    const t = await creerTache({ freq: 'daily' });

    await useStore.getState().toggleTaskOn(t.id, JOUR);

    const apres = useStore.getState();
    expect(apres.occurrences.has(occurrenceKey(t.id, JOUR))).toBe(true);
    expect(apres.tasks[0]?.date).toBe('2026-08-06');
    /* Elle n'est PAS terminée : elle est faite le 5, due le 6. */
    expect(apres.tasks[0]?.done).toBe(false);
  });

  it('écrit les occurrences sous la clé `occ`, au format figé (G1)', async () => {
    const t = await creerTache({ freq: 'daily' });
    await useStore.getState().toggleTaskOn(t.id, JOUR);

    expect(await metaRepo.get<Record<string, number>>(META_KEYS.occ)).toEqual({
      [`${t.id}|${JOUR}`]: 1,
    });
  });

  it('décocher rouvre le jour décoché', async () => {
    const t = await creerTache({ freq: 'daily' });
    await useStore.getState().toggleTaskOn(t.id, JOUR);
    await useStore.getState().toggleTaskOn(t.id, JOUR);

    const apres = useStore.getState();
    expect(apres.occurrences.size).toBe(0);
    expect(apres.tasks[0]?.date).toBe(JOUR);
    expect(apres.tasks[0]?.done).toBe(false);
  });

  it('suit la règle hebdomadaire, pas le lendemain', async () => {
    const t = await creerTache({ freq: 'weekly' });
    await useStore.getState().toggleTaskOn(t.id, JOUR);
    expect(useStore.getState().tasks[0]?.date).toBe('2026-08-12');
  });

  it('survit au rechargement : l’occurrence est relue depuis la base', async () => {
    const t = await creerTache({ freq: 'daily' });
    await useStore.getState().toggleTaskOn(t.id, JOUR);

    await useStore.getState().hydrate();
    expect(useStore.getState().occurrences.has(occurrenceKey(t.id, JOUR))).toBe(true);
  });
});
