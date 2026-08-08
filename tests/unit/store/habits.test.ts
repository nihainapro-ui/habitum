import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { useStore } from '@/lib/store';
import { logKey } from '@/lib/domain';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  useStore.setState(useStore.getInitialState());
});

const input = {
  name: 'Méditer',
  category: 'mind' as const,
  goal: { kind: 'time' as const, target: 15, step: 1, unit: 'min' },
  mode: 'dow' as const,
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
};

describe('tranche habitudes', () => {
  it('crée dans le store ET dans la base', async () => {
    await useStore.getState().createHabit(input);
    expect(useStore.getState().habits).toHaveLength(1);
    expect(await db.habits.count()).toBe(1);
  });

  it("coche une habitude : le journal et l'index suivent", async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().setLogValue(h.id, '2026-08-05', 15);
    expect(useStore.getState().logIndex.get(logKey(h.id, '2026-08-05'))).toBe(15);
    expect(await db.logs.count()).toBe(1);
  });

  it('recharge l’état depuis la base après réinitialisation du store', async () => {
    await useStore.getState().createHabit(input);
    useStore.setState({ habits: [] });
    await useStore.getState().hydrate();
    expect(useStore.getState().habits).toHaveLength(1);
  });

  it('supprime logiquement : disparaît du store, reste en base', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().deleteHabit(h.id);
    expect(useStore.getState().habits).toHaveLength(0);
    expect(await db.habits.count()).toBe(1);
  });

  it('modifie sans toucher à createdAt', async () => {
    await useStore.getState().createHabit(input);
    const avant = useStore.getState().habits[0]!;
    await useStore.getState().updateHabit(avant.id, { name: 'Méditation' });
    const apres = useStore.getState().habits[0]!;
    expect(apres.name).toBe('Méditation');
    expect(apres.createdAt).toBe(avant.createdAt);
  });

  it('archive sans supprimer', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;
    await useStore.getState().archiveHabit(h.id, true);
    expect(useStore.getState().habits[0]!.archived).toBe(true);
    expect(await db.habits.count()).toBe(1);
  });

  /* Règle d'implémentation n° 1 du plan : on écrit d'abord au dépôt, ensuite au
     store. L'inverse laisserait une interface qui affiche ce que la base n'a
     pas — et l'utilisateur croirait son geste enregistré. */
  it("n'écrit rien dans le store si le dépôt refuse", async () => {
    await expect(
      useStore.getState().updateHabit('inconnu', { name: 'X' }),
    ).resolves.toBeUndefined();
    expect(useStore.getState().habits).toHaveLength(0);
  });

  it('bascule une habitude : cochée puis décochée', async () => {
    await useStore.getState().createHabit(input);
    const h = useStore.getState().habits[0]!;

    await useStore.getState().toggleHabit(h.id, '2026-08-05');
    expect(useStore.getState().logIndex.get(logKey(h.id, '2026-08-05'))).toBe(15);

    await useStore.getState().toggleHabit(h.id, '2026-08-05');
    expect(useStore.getState().logIndex.get(logKey(h.id, '2026-08-05'))).toBe(0);
  });
});
