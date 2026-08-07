import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { exportToJson, importFromJson } from '@/lib/data';
import {
  habitsRepo,
  logsRepo,
  notesRepo,
  sessionsRepo,
  shoppingRepo,
} from '@/lib/data/repositories';
import {
  HABIT_GOAL_KINDS,
  GOAL_KINDS,
  bestStreak,
  completionRate,
  currentStreak,
  sumValues,
} from '@/lib/domain';
import {
  DEMO_NOW,
  demoHabits,
  demoLogIndex,
  demoSessions,
  demoTasks,
} from '@/tests/fixtures/demo-seed';
import { buildLogIndex } from '@/lib/data/log-index';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

/** Export au format du prototype, construit depuis le fixture de démonstration. */
const exportPrototype = () => ({
  app: 'Habitum',
  exported: '2026-08-05T12:00:00.000Z',
  v: 5,
  habits: demoHabits().map((h) => ({
    id: h.id,
    fr: h.name,
    en: h.name,
    cat: h.category,
    g: { k: h.goal.kind, t: h.goal.target, step: h.goal.step, fr: h.goal.unit, en: h.goal.unit },
    mode: h.mode,
    days: h.days,
    sub: [],
    rem: [],
    arch: false,
    note: '',
  })),
  tasks: demoTasks().map((t) => ({
    id: t.id,
    fr: t.name,
    en: t.name,
    cat: t.category,
    d: t.date,
    time: t.time,
    dur: t.duration,
    prio: t.priority,
    done: t.done,
    sub: [],
    note: '',
  })),
  log: Object.fromEntries(demoLogIndex()),
  notes: {},
  obj: [],
  sessions: demoSessions().map((s) => ({ label: s.label, min: s.minutes, d: s.date })),
  shop: [],
});

describe("importFromJson — les SEPT types d'habitude", () => {
  it('accepte les sept types, sans en perdre un seul', async () => {
    const habits = HABIT_GOAL_KINDS.map((kind, i) => ({
      id: `h${i}`,
      fr: kind,
      en: kind,
      cat: 'health',
      g: { k: kind, t: 1, step: 1, fr: '', en: '' },
      mode: 'dow',
      days: [0, 1, 2, 3, 4, 5, 6],
      sub: [{ fr: 'a', en: 'a' }],
      rem: [],
      arch: false,
      note: '',
    }));

    const rapport = await importFromJson({
      app: 'Habitum',
      v: 5,
      habits,
      tasks: [],
      log: {},
      notes: {},
    });

    expect(rapport.dropped).toEqual([]);
    expect(await habitsRepo.count()).toBe(HABIT_GOAL_KINDS.length);
  });

  it("accepte les trois types d'objectif, jalons compris", async () => {
    const obj = GOAL_KINDS.map((kind, i) => ({
      id: `o${i}`,
      fr: kind,
      en: kind,
      kind,
      target: 10,
      unit: { fr: 'u', en: 'u' },
      cat: 'sport',
      ms: [],
      cur: 0,
    }));
    const rapport = await importFromJson({
      app: 'Habitum',
      v: 5,
      habits: [],
      tasks: [],
      log: {},
      notes: {},
      obj,
    });
    expect(rapport.dropped).toEqual([]);
    expect(await db.goals.count()).toBe(GOAL_KINDS.length);
  });

  it('rejette un type inconnu en le signalant, sans avaler le reste', async () => {
    const rapport = await importFromJson({
      app: 'Habitum',
      v: 5,
      tasks: [],
      log: {},
      notes: '',
      habits: [
        {
          id: 'ok',
          fr: 'A',
          en: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
        {
          id: 'ko',
          fr: 'B',
          en: 'B',
          cat: 'health',
          g: { k: 'inventé' },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
    } as never);
    expect(await habitsRepo.count()).toBe(1);
    expect(rapport.dropped.join(' ')).toContain('ko');
  });

  it('ne garde aucune entrée de journal orpheline', async () => {
    await importFromJson({
      app: 'Habitum',
      v: 5,
      tasks: [],
      notes: {},
      habits: [
        {
          id: 'h1',
          fr: 'A',
          en: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      log: { 'h1|2026-08-01': 1, 'fantome|2026-08-01': 5, 'clé invalide': 3 },
    } as never);
    const rows = await logsRepo.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.habitId).toBe('h1');
  });

  it("rejette un fichier qui n'est pas un export Habitum", async () => {
    await expect(importFromJson({ quelquechose: true })).rejects.toThrow(/Habitum/i);
  });
});

describe('aller-retour export → import → les 62 valeurs sont identiques', () => {
  it('reproduit toutes les métriques après un cycle complet', async () => {
    const attendu = demoHabits().map((h) => {
      const log = demoLogIndex();
      return {
        id: h.id,
        streak: currentStreak(log, h, DEMO_NOW),
        best: bestStreak(log, h, DEMO_NOW),
        pct30: completionRate(log, h, 30, DEMO_NOW),
        sum30: sumValues(log, h, 30, DEMO_NOW),
      };
    });

    const rapport = await importFromJson(exportPrototype());
    expect(rapport.dropped).toEqual([]);
    expect(await habitsRepo.count()).toBe(6);

    const habits = await habitsRepo.list();
    const log = buildLogIndex(await logsRepo.all());

    for (const a of attendu) {
      const h = habits.find((x) => x.id === a.id)!;
      expect(currentStreak(log, h, DEMO_NOW), `${a.id}.streak`).toBe(a.streak);
      expect(bestStreak(log, h, DEMO_NOW), `${a.id}.best`).toBe(a.best);
      expect(completionRate(log, h, 30, DEMO_NOW), `${a.id}.pct30`).toBe(a.pct30);
      expect(sumValues(log, h, 30, DEMO_NOW), `${a.id}.sum30`).toBe(a.sum30);
    }
  });

  it('un export réimporté est stable au second tour', async () => {
    await importFromJson(exportPrototype());
    const premier = await exportToJson();
    await db.delete();
    await db.open();
    await importFromJson(premier);
    const second = await exportToJson();
    expect(second.habits).toEqual(premier.habits);
    expect(second.log).toEqual(premier.log);
  });
});

/* ---------------------------------------------------------------------------
   Cas hors plan : les entités que l'aller-retour ci-dessus ne traverse pas.
   L'export du prototype avait déjà perdu les objectifs, les sessions, la liste
   de courses et les habitudes archivées — ne pas les couvrir serait répéter
   l'histoire.
   --------------------------------------------------------------------------- */

describe("aller-retour — les entités que l'export du prototype avait perdues", () => {
  const complet = () => ({
    app: 'Habitum',
    v: 5,
    habits: [
      {
        id: 'h1',
        fr: 'Courir',
        en: 'Run',
        cat: 'sport',
        g: { k: 'count', t: 3, step: 1, fr: 'km', en: 'km' },
        mode: 'every',
        n: 2,
        days: [],
        start: '2026-01-01',
        end: '2026-12-31',
        pause: { from: '2026-02-01', to: '2026-02-07' },
        sub: [{ fr: 'Échauffement', en: 'Warm-up' }],
        rem: ['08:00'],
        arch: true,
        note: 'Genou fragile',
      },
    ],
    tasks: [
      {
        id: 't1',
        fr: 'Payer le loyer',
        en: 'Pay rent',
        cat: 'home',
        d: '2026-08-05',
        time: '12:00',
        dur: 30,
        prio: 3,
        done: false,
        sub: [{ fr: 'Vérifier le montant', en: 'Check amount', done: true }],
        note: '',
        rep: 'monthly',
      },
    ],
    obj: [
      {
        id: 'o4',
        fr: 'Moins de 12 écarts',
        en: 'Under 12 slips',
        kind: 'reduce',
        target: 12,
        unit: { fr: 'écarts', en: 'slips' },
        src: 'h1',
        cat: 'health',
        start: '2026-05-01',
        due: '2026-09-30',
        cur: 4,
        ms: [{ fr: 'Premier mois', en: 'First month', done: true }],
        win: 90,
      },
    ],
    log: { 'h1|2026-08-05': 3 },
    notes: { 'j|2026-08-05': 'Bonne séance', 'm|2026-08-05': 4, 'n|h1': 'Chaussures usées' },
    sessions: [{ label: 'Course', min: 28, d: '2026-08-05' }],
    shop: [{ fr: 'Pommes', en: 'Apples', done: true }],
  });

  it('conserve objectifs, notes, humeur, sessions et courses', async () => {
    const rapport = await importFromJson(complet());
    expect(rapport.dropped).toEqual([]);

    const [goal] = await db.goals.toArray();
    expect(goal).toMatchObject({
      name: 'Moins de 12 écarts',
      kind: 'reduce',
      target: 12,
      unit: 'écarts',
      sourceHabitId: 'h1',
      window: 90,
      deadline: '2026-09-30',
      current: 4,
    });
    expect(goal!.milestones).toEqual([{ label: 'Premier mois', done: true }]);

    const journal = await notesRepo.journalOf('2026-08-05');
    expect(journal?.body).toBe('Bonne séance');
    expect(journal?.mood).toBe(4);
    expect((await notesRepo.forHabit('h1'))[0]?.body).toBe('Chaussures usées');

    expect((await sessionsRepo.list())[0]).toMatchObject({ label: 'Course', minutes: 28 });
    expect((await shoppingRepo.list())[0]).toMatchObject({ label: 'Pommes', done: true });
  });

  it("n'oublie ni les habitudes archivées ni leurs champs de planification", async () => {
    await importFromJson(complet());
    const premier = await exportToJson();
    expect(premier.habits[0]).toMatchObject({
      arch: true,
      mode: 'every',
      n: 2,
      start: '2026-01-01',
      end: '2026-12-31',
      pause: { from: '2026-02-01', to: '2026-02-07' },
      note: 'Genou fragile',
    });

    await db.delete();
    await db.open();
    await importFromJson(premier);
    const second = await exportToJson();
    expect(second.habits).toEqual(premier.habits);
    expect(second.tasks).toEqual(premier.tasks);
    expect(second.obj).toEqual(premier.obj);
    expect(second.notes).toEqual(premier.notes);
    expect(second.sessions).toEqual(premier.sessions);
    expect(second.shop).toEqual(premier.shop);
  });

  it('lit aussi un export ancien, où le journal s’appelait ov', async () => {
    await importFromJson({
      app: 'Habitum',
      habits: [
        {
          id: 'h1',
          fr: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      ov: { 'h1|2026-08-05': 1 },
    } as never);
    expect(await logsRepo.all()).toHaveLength(1);
  });

  it('accepte une charge JSON brute et refuse un fichier trop volumineux', async () => {
    await importFromJson(JSON.stringify({ app: 'Habitum', habits: [] }));
    expect(await habitsRepo.count()).toBe(0);

    const enorme = `{"app":"Habitum","note":"${'x'.repeat(2 * 1024 * 1024)}"}`;
    await expect(importFromJson(enorme)).rejects.toThrow(/Habitum/i);
    await expect(importFromJson('{cassé')).rejects.toThrow(/Habitum/i);
  });

  it('signale les entités invalides sans jamais laisser la base à moitié peuplée', async () => {
    const rapport = await importFromJson({
      app: 'Habitum',
      habits: [
        {
          id: 'h1',
          fr: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      tasks: [{ id: 't1', fr: 'A', cat: 'work', d: '2026-08-05', dur: -5 }],
      obj: [{ id: 'o1', fr: 'X', kind: 'inconnu', target: 1 }],
      sessions: [{ label: 'S', min: -1 }],
      notes: { 'n|fantome': 'orpheline', 'z|bizarre': 'clé inconnue' },
      log: {},
    } as never);

    expect(rapport.byEntity.habits).toEqual({ read: 1, kept: 1 });
    expect(rapport.byEntity.tasks).toEqual({ read: 1, kept: 0 });
    expect(rapport.byEntity.goals).toEqual({ read: 1, kept: 0 });
    expect(rapport.byEntity.sessions).toEqual({ read: 1, kept: 0 });
    expect(rapport.dropped.join(' ')).toContain('fantome');
    expect(rapport.read).toBeGreaterThan(rapport.kept);
    expect(await db.notes.count()).toBe(0);
  });

  it('écarte les valeurs de journal aberrantes en les nommant', async () => {
    const rapport = await importFromJson({
      app: 'Habitum',
      habits: [
        {
          id: 'h1',
          fr: 'A',
          cat: 'health',
          g: { k: 'count', t: 3 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      log: { 'h1|2026-08-05': -4, 'h1|2026-08-06': 0, 'h1|2026-08-07': 2 },
    } as never);
    /* La valeur 0 est une valeur SAISIE : elle entre. Seule la négative sort. */
    expect(rapport.byEntity.logs).toEqual({ read: 3, kept: 2 });
    expect(rapport.dropped.join(' ')).toContain('2026-08-05');
  });

  it('nomme chaque forme de note refusée', async () => {
    const rapport = await importFromJson({
      app: 'Habitum',
      habits: [
        {
          id: 'h1',
          fr: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      notes: {
        'j|pas-une-date': 'x',
        'j|2026-08-05': 42,
        'm|2026-08-05': 'humeur en toutes lettres',
        'n|h1': 12,
        'n|h1bis': 'orpheline',
        bizarre: 'x',
      },
    } as never);
    expect(rapport.byEntity.notes).toEqual({ read: 6, kept: 0 });
    expect(rapport.dropped).toHaveLength(6);
  });

  it("n'écrit pas une note d'habitude vide", async () => {
    await importFromJson({
      app: 'Habitum',
      habits: [
        {
          id: 'h1',
          fr: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      notes: { 'n|h1': '   ', 'j|2026-08-05': '  ' },
    } as never);
    expect(await db.notes.count()).toBe(0);
  });

  it('exporte une base minimale sans champ optionnel fantôme', async () => {
    await importFromJson({
      app: 'Habitum',
      habits: [
        {
          id: 'h1',
          fr: 'A',
          cat: 'health',
          g: { k: 'check', t: 1 },
          mode: 'dow',
          days: [0],
          sub: [],
          rem: [],
        },
      ],
      tasks: [{ id: 't1', fr: 'T', cat: 'work', d: '2026-08-05' }],
      obj: [{ id: 'o1', fr: 'O', kind: 'cumul', target: 5 }],
      sessions: [{ label: 'S', min: 10, d: '2026-08-05' }],
      shop: [{ fr: 'Pommes' }],
      log: { 'h1|2026-08-05': 1 },
    } as never);

    /* Une entrée effacée porte une pierre tombale : elle ne doit pas sortir. */
    await db.logs.put({
      habitId: 'h1',
      date: '2026-08-04',
      value: 1,
      updatedAt: '2026-08-05T00:00:00.000Z',
      deletedAt: '2026-08-05T00:00:00.000Z',
    });

    const sortie = await exportToJson();
    expect(Object.keys(sortie.log)).toEqual(['h1|2026-08-05']);
    expect(sortie.tasks[0]).not.toHaveProperty('time');
    expect(sortie.tasks[0]).not.toHaveProperty('rep');
    expect(sortie.obj[0]).not.toHaveProperty('src');
    expect(sortie.obj[0]!.ms).toEqual([]);
    expect(sortie.sessions[0]).not.toHaveProperty('habitId');
    expect(sortie.habits[0]).not.toHaveProperty('start');
    expect(sortie.notes).toEqual({});
  });
});
