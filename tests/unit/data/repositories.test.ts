import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import {
  goalsRepo,
  habitsRepo,
  logsRepo,
  metaRepo,
  notesRepo,
  profilesRepo,
  sessionsRepo,
  shoppingRepo,
  tasksRepo,
} from '@/lib/data/repositories';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const habitInput = {
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

describe('habitsRepo', () => {
  it('crée avec un identifiant et des horodatages', async () => {
    const h = await habitsRepo.create(habitInput);
    expect(h.id).toMatch(/.{6,}/);
    expect(h.createdAt).toBe(h.updatedAt);
    expect(h.deletedAt).toBeUndefined();
  });

  it('avance updatedAt à chaque modification, jamais createdAt', async () => {
    const h = await habitsRepo.create(habitInput);
    const modifie = await habitsRepo.update(h.id, { name: 'Méditation' });
    expect(modifie!.createdAt).toBe(h.createdAt);
    expect(modifie!.updatedAt >= h.updatedAt).toBe(true);
    expect(modifie!.name).toBe('Méditation');
  });

  it('supprime logiquement : la ligne reste, la liste ne la rend plus', async () => {
    const h = await habitsRepo.create(habitInput);
    await habitsRepo.softDelete(h.id);
    expect(await habitsRepo.list()).toHaveLength(0);
    expect(await db.habits.count()).toBe(1);
    expect((await db.habits.get(h.id))?.deletedAt).toBeDefined();
  });

  it('restaure une suppression logique', async () => {
    const h = await habitsRepo.create(habitInput);
    await habitsRepo.softDelete(h.id);
    await habitsRepo.restore(h.id);
    expect(await habitsRepo.list()).toHaveLength(1);
  });

  it('listActive exclut les archivées', async () => {
    await habitsRepo.create(habitInput);
    await habitsRepo.create({ ...habitInput, archived: true });
    expect(await habitsRepo.list()).toHaveLength(2);
    expect(await habitsRepo.listActive()).toHaveLength(1);
  });
});

describe('logsRepo', () => {
  it("écrit une valeur et l'écrase sans dupliquer", async () => {
    await logsRepo.setValue('h1', '2026-08-05', 3);
    await logsRepo.setValue('h1', '2026-08-05', 8);
    const rows = await logsRepo.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe(8);
  });

  it('retourne une fenêtre bornée, bornes incluses', async () => {
    for (const [d, v] of [
      ['2026-07-31', 1],
      ['2026-08-01', 2],
      ['2026-08-05', 3],
      ['2026-08-06', 4],
    ] as const) {
      await logsRepo.setValue('h1', d, v);
    }
    const w = await logsRepo.getWindow('h1', '2026-08-01', '2026-08-05');
    expect(w.map((r) => r.value)).toEqual([2, 3]);
  });

  it('ne mélange pas les journaux de deux habitudes', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 1);
    await logsRepo.setValue('h2', '2026-08-05', 9);
    const w = await logsRepo.getWindow('h1', '2026-08-01', '2026-08-31');
    expect(w).toHaveLength(1);
    expect(w[0]!.habitId).toBe('h1');
  });
});

describe('metaRepo', () => {
  it('stocke et relit une valeur typée', async () => {
    await metaRepo.set('onboarded', true);
    expect(await metaRepo.get<boolean>('onboarded')).toBe(true);
  });

  it('retourne undefined sur une clé absente', async () => {
    expect(await metaRepo.get('inconnue')).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------
   Les cas ci-dessous ne figurent pas au plan : ils couvrent les requêtes
   métier des dépôts spécialisés, exigées par le critère de sortie n° 7
   (couverture ≥ 90 % sur lib/data). Une requête non testée est une requête
   dont personne ne sait si elle filtre les entités supprimées.
   --------------------------------------------------------------------------- */

describe('dépôts spécialisés — les requêtes métier filtrent les suppressions', () => {
  it('habitsRepo.listByCategory ne rend que la catégorie demandée, non supprimée', async () => {
    await habitsRepo.create(habitInput);
    const autre = await habitsRepo.create({ ...habitInput, category: 'sport' });
    expect(await habitsRepo.listByCategory('mind')).toHaveLength(1);
    await habitsRepo.softDelete(autre.id);
    expect(await habitsRepo.listByCategory('sport')).toHaveLength(0);
  });

  it('tasksRepo distingue la date et les tâches ouvertes', async () => {
    const commun = {
      category: 'work' as const,
      duration: 60,
      priority: 2 as const,
      subTasks: [],
      note: '',
    };
    await tasksRepo.create({ ...commun, name: 'A', date: '2026-08-05', done: false });
    await tasksRepo.create({ ...commun, name: 'B', date: '2026-08-05', done: true });
    await tasksRepo.create({ ...commun, name: 'C', date: '2026-08-06', done: false });
    expect(await tasksRepo.listByDate('2026-08-05')).toHaveLength(2);
    expect(await tasksRepo.listOpen()).toHaveLength(2);
  });

  it('sessionsRepo.listWindow borne aux deux extrémités', async () => {
    const commun = { label: 'Focus', minutes: 25, mode: 'pomo' as const };
    for (const date of ['2026-07-31', '2026-08-01', '2026-08-05', '2026-08-06']) {
      await sessionsRepo.create({ ...commun, date });
    }
    expect(await sessionsRepo.listWindow('2026-08-01', '2026-08-05')).toHaveLength(2);
  });

  it('notesRepo sépare journal, notes d’habitude et recherche', async () => {
    await notesRepo.create({ kind: 'journal', date: '2026-08-05', body: 'Bonne journée' });
    await notesRepo.create({ kind: 'habit', habitId: 'h1', body: 'Séance courte' });
    expect((await notesRepo.journalOf('2026-08-05'))?.body).toBe('Bonne journée');
    expect(await notesRepo.journalOf('2026-08-04')).toBeUndefined();
    expect(await notesRepo.forHabit('h1')).toHaveLength(1);
    expect(await notesRepo.search('SÉANCE')).toHaveLength(1);
    expect(await notesRepo.search('   ')).toHaveLength(0);
  });

  it('goalsRepo, profilesRepo et shoppingRepo exposent le CRUD commun', async () => {
    const g = await goalsRepo.create({
      name: 'Semi-marathon',
      kind: 'cumul',
      target: 180,
      unit: 'km',
      category: 'sport',
    });
    expect(await goalsRepo.get(g.id)).toBeDefined();
    await goalsRepo.softDelete(g.id);
    expect(await goalsRepo.get(g.id)).toBeUndefined();
    expect(await goalsRepo.listAll()).toHaveLength(1);

    await profilesRepo.create({
      name: 'Amina Sarr',
      handle: 'amina',
      glyph: '◉',
      hue: 188,
      role: 0,
      since: '2026-08-05',
    });
    expect(await profilesRepo.count()).toBe(1);

    const item = await shoppingRepo.create({ label: 'Pommes', done: false });
    expect((await shoppingRepo.update(item.id, { done: true }))?.done).toBe(true);
    expect(await shoppingRepo.update('inconnu', { done: true })).toBeUndefined();
  });

  it('logsRepo sait relire, effacer et purger le journal d’une habitude', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 3);
    await logsRepo.setValue('h1', '2026-08-04', 2);
    await logsRepo.setValue('h2', '2026-08-05', 9);
    expect((await logsRepo.get('h1', '2026-08-05'))?.value).toBe(3);
    await logsRepo.clear('h1', '2026-08-05');
    expect(await logsRepo.get('h1', '2026-08-05')).toBeUndefined();
    await logsRepo.deleteForHabit('h1');
    expect(await logsRepo.all()).toHaveLength(1);
    await logsRepo.bulkPut([
      { habitId: 'h3', date: '2026-08-05', value: 1, updatedAt: '2026-08-05T00:00:00.000Z' },
    ]);
    expect(await logsRepo.all()).toHaveLength(2);
  });

  it('metaRepo efface une clé', async () => {
    await metaRepo.set('demo', true);
    await metaRepo.remove('demo');
    expect(await metaRepo.get('demo')).toBeUndefined();
  });

  it('un identifiant fourni est respecté, et update sur une entité absente ne crée rien', async () => {
    const h = await habitsRepo.create({ ...habitInput, id: 'impose' });
    expect(h.id).toBe('impose');
    expect(await habitsRepo.update('fantome', { name: 'X' })).toBeUndefined();
    expect(await habitsRepo.count()).toBe(1);
  });
});
