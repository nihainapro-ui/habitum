import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { seedDemo, seedEmpty } from '@/lib/data/seed';
import { useStore } from '@/lib/store';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  useStore.setState(useStore.getInitialState());
});

describe('hydratation', () => {
  it('charge tout le jeu de démonstration en une passe', async () => {
    await seedDemo();
    await useStore.getState().hydrate();

    const s = useStore.getState();
    expect(s.habits).toHaveLength(6);
    expect(s.tasks).toHaveLength(8);
    expect(s.goals).toHaveLength(4);
    expect(s.sessions).toHaveLength(4);
    expect(s.shopping).toHaveLength(7);
    expect(s.logIndex.size).toBe(4);
    expect(s.profiles).toHaveLength(1);
    expect(s.activeProfileId).toBe(s.profiles[0]!.id);
    expect(s.isDemo).toBe(true);
  });

  /* G3 — un compte vierge n'affiche rien de fabriqué. C'est vrai en base
     (phase 1) ; ce test dit que c'est encore vrai une fois dans le store. */
  it("un compte vierge n'a aucune donnée, et le sait", async () => {
    await seedEmpty();
    await useStore.getState().hydrate();

    const s = useStore.getState();
    expect(s.habits).toEqual([]);
    expect(s.sessions).toEqual([]);
    expect(s.logIndex.size).toBe(0);
    expect(s.isDemo).toBe(false);
    expect(s.ui.loading).toBe(false);
    expect(s.ui.error).toBeNull();
  });

  it('pose puis retire le drapeau de chargement', async () => {
    const enCours = useStore.getState().hydrate();
    expect(useStore.getState().ui.loading).toBe(true);
    await enCours;
    expect(useStore.getState().ui.loading).toBe(false);
  });

  it('retient les réglages enregistrés, et les valeurs par défaut sinon', async () => {
    await seedEmpty();
    await useStore.getState().setSetting('theme', 'plasma');
    useStore.setState(useStore.getInitialState());
    await useStore.getState().hydrate();
    expect(useStore.getState().settings.theme).toBe('plasma');
    expect(useStore.getState().settings.weekStart).toBe('mon');
  });

  it('signale une panne de lecture sans laisser le drapeau de chargement levé', async () => {
    db.close();
    await useStore.getState().hydrate();
    expect(useStore.getState().ui.loading).toBe(false);
    expect(useStore.getState().ui.error).not.toBeNull();
  });
});
