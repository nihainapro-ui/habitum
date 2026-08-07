import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { isDemo, seedDemo, seedEmpty } from '@/lib/data/seed';
import { habitsRepo, logsRepo, metaRepo, sessionsRepo } from '@/lib/data/repositories';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

describe('seedEmpty — le chemin par défaut', () => {
  it('ne crée AUCUNE habitude, AUCUNE entrée de journal, AUCUNE session', async () => {
    await seedEmpty();
    expect(await habitsRepo.count()).toBe(0);
    expect(await logsRepo.all()).toHaveLength(0);
    expect(await sessionsRepo.count()).toBe(0);
  });

  it("crée un profil et des réglages, rien d'autre", async () => {
    await seedEmpty();
    expect(await db.profiles.count()).toBe(1);
    expect(await isDemo()).toBe(false);
  });

  it('ne réamorce pas une base déjà peuplée', async () => {
    await seedEmpty();
    await seedEmpty();
    expect(await db.profiles.count()).toBe(1);
  });

  it('pose des réglages où aucun interrupteur ne promet ce qui n’existe pas', async () => {
    await seedEmpty();
    const reglages = await metaRepo.get<Record<string, unknown>>('settings');
    expect(reglages).toMatchObject({
      lang: 'fr',
      theme: 'neural',
      weekStart: 'mon',
      notifications: false,
      sound: false,
      vibrate: false,
    });
  });
});

describe('seedDemo — explicite, et jamais confondu avec du réel', () => {
  it('marque la base comme démonstration', async () => {
    await seedDemo();
    expect(await isDemo()).toBe(true);
  });

  it('crée les six habitudes et leurs entrées du jour, mais AUCUN historique fabriqué', async () => {
    await seedDemo();
    expect(await habitsRepo.count()).toBe(6);
    const rows = await logsRepo.all();
    // Les quatre entrées du jour du prototype — et rien de plus.
    expect(rows).toHaveLength(4);
  });

  it('crée aussi les tâches, sessions, objectifs et courses du jeu de démonstration', async () => {
    await seedDemo();
    expect(await db.tasks.count()).toBe(8);
    expect(await sessionsRepo.count()).toBe(4);
    expect(await db.goals.count()).toBe(4);
    expect(await db.shopping.count()).toBe(7);
  });

  it('toutes les entrées du jour portent la date du jour, aucune date passée', async () => {
    await seedDemo();
    const rows = await logsRepo.all();
    const aujourdhui = new Date();
    const k = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;
    expect(rows.every((r) => r.date === k)).toBe(true);
  });
});

describe('B4 — le générateur d’historique n’existe pas en production', () => {
  it("aucun fichier de lib/ ne contient de générateur d'historique", async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const parcourir = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? parcourir(p) : p.endsWith('.ts') ? [p] : [];
      });
    const suspects = parcourir('lib').filter((p) => {
      const src = readFileSync(p, 'utf8');
      return /2166136261|materialize|journalSeed/.test(src);
    });
    expect(suspects, `générateur trouvé dans : ${suspects.join(', ')}`).toEqual([]);
  });
});
