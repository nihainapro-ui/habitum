import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

describe('schéma Dexie', () => {
  it('déclare les neuf tables attendues', () => {
    const noms = db.tables.map((t) => t.name).sort();
    expect(noms).toEqual([
      'goals',
      'habits',
      'logs',
      'meta',
      'notes',
      'profiles',
      'sessions',
      'shopping',
      'tasks',
    ]);
  });

  it('indexe le journal par [habitId+date] — une fenêtre sans balayage complet', async () => {
    const now = '2026-08-05T00:00:00.000Z';
    await db.logs.bulkPut([
      { habitId: 'h1', date: '2026-08-01', value: 1, updatedAt: now },
      { habitId: 'h1', date: '2026-08-02', value: 2, updatedAt: now },
      { habitId: 'h1', date: '2026-08-05', value: 3, updatedAt: now },
      { habitId: 'h2', date: '2026-08-02', value: 9, updatedAt: now },
    ]);

    const fenetre = await db.logs
      .where('[habitId+date]')
      .between(['h1', '2026-08-01'], ['h1', '2026-08-03'], true, true)
      .toArray();

    expect(fenetre.map((l) => l.value)).toEqual([1, 2]);
  });

  it('interdit deux entrées de journal pour la même habitude au même jour', async () => {
    const now = '2026-08-05T00:00:00.000Z';
    await db.logs.put({ habitId: 'h1', date: '2026-08-01', value: 1, updatedAt: now });
    await db.logs.put({ habitId: 'h1', date: '2026-08-01', value: 7, updatedAt: now });
    expect(await db.logs.count()).toBe(1);
    expect((await db.logs.get(['h1', '2026-08-01']))?.value).toBe(7);
  });

  it("permet de retrouver les tâches d'une date", async () => {
    const now = '2026-08-05T00:00:00.000Z';
    await db.tasks.bulkPut([
      {
        id: 't1',
        name: 'A',
        category: 'work',
        date: '2026-08-05',
        duration: 60,
        priority: 2,
        done: false,
        subTasks: [],
        note: '',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 't2',
        name: 'B',
        category: 'home',
        date: '2026-08-06',
        duration: 60,
        priority: 1,
        done: false,
        subTasks: [],
        note: '',
        createdAt: now,
        updatedAt: now,
      },
    ]);
    expect(await db.tasks.where('date').equals('2026-08-05').count()).toBe(1);
  });
});
