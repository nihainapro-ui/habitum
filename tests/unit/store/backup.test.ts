import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, metaRepo, seedEmpty } from '@/lib/data';
import { lireCopie } from '@/lib/features/backup/snapshot';
import { useStore } from '@/lib/store';

/* Tâche 5.8 — la copie de secours est prise avant les DEUX seules opérations
   qui peuvent tout effacer : l'import et la réinitialisation. */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  await seedEmpty();
  await useStore.getState().hydrate();
});

const creerHabitude = async (name: string) => {
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
};

describe('copie de secours', () => {
  it('est prise avant une réinitialisation, et SURVIT à l’effacement', async () => {
    await creerHabitude('Boire de l’eau');

    await useStore.getState().resetAccount();

    /* La réinitialisation vide `meta` : une copie posée avant aurait été
       effacée avec le reste, au moment exact où elle sert. */
    const copie = await lireCopie();
    expect(copie?.payload.habits.map((h) => h.fr)).toEqual(['Boire de l’eau']);
    expect(useStore.getState().habits).toHaveLength(0);
    expect(useStore.getState().backupAt).toBe(copie?.at);
  });

  it('se restaure par le MÊME importeur que les fichiers d’utilisateur', async () => {
    await creerHabitude('Méditer');
    await useStore.getState().resetAccount();

    const rapport = await useStore.getState().restoreBackup();

    expect(rapport?.byEntity.habits.kept).toBe(1);
    expect(useStore.getState().habits.map((h) => h.name)).toEqual(['Méditer']);
  });

  it('est prise avant un import', async () => {
    await creerHabitude('Courir');

    /* L'import AJOUTE au compte courant et écrase ce qui porte le même
       identifiant — il ne remplace pas tout. La copie de secours est donc là
       pour le fichier importé par erreur, pas pour un effacement. */
    const charge = JSON.stringify({
      app: 'Habitum',
      habits: [
        {
          id: 'importee',
          fr: 'Marcher',
          cat: 'health',
          g: { k: 'check', t: 1, step: 1 },
          mode: 'dow',
          days: [0, 1, 2, 3, 4, 5, 6],
          sub: [],
          rem: [],
          arch: false,
          note: '',
        },
      ],
      tasks: [],
      obj: [],
    });
    const rapport = await useStore.getState().importJson(charge);

    expect(rapport.byEntity.habits.kept).toBe(1);
    expect(
      useStore
        .getState()
        .habits.map((h) => h.name)
        .sort(),
    ).toEqual(['Courir', 'Marcher']);
    expect((await lireCopie())?.payload.habits.map((h) => h.fr)).toEqual(['Courir']);
  });

  it('n’en existe aucune sur un compte neuf', async () => {
    expect(await metaRepo.get(META_KEYS.backup)).toBeUndefined();
    expect(useStore.getState().backupAt).toBeNull();
    expect(await useStore.getState().restoreBackup()).toBeNull();
  });
});
