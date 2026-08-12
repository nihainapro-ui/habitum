import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateKey,
  dayAgenda,
  estCochable,
  habitWeek,
  habitTime,
  logKey,
  type Habit,
  type LogIndex,
  type Task,
} from '@/lib/domain';

const NOW = new Date(2026, 7, 5); // mercredi 5 août 2026 — date figée du dossier
const JOUR = dateKey(NOW);

const habit = (over: Partial<Habit> & Pick<Habit, 'id'>): Habit => ({
  name: over.id,
  category: 'health',
  goal: { kind: 'check', target: 1, step: 1, unit: '' },
  mode: 'dow',
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const task = (over: Partial<Task> & Pick<Task, 'id'>): Task => ({
  name: over.id,
  category: 'work',
  date: JOUR,
  duration: 60,
  priority: 2,
  done: false,
  subTasks: [],
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('dayAgenda', () => {
  it('trie habitudes et tâches ensemble, par heure', () => {
    const habits = [
      habit({ id: 'soir', reminders: ['20:00'] }),
      habit({ id: 'matin', reminders: ['07:00'] }),
    ];
    const tasks = [task({ id: 'midi', time: '12:00' })];

    expect(dayAgenda(new Map(), habits, tasks, NOW, NOW).map((e) => e.id)).toEqual([
      'matin',
      'midi',
      'soir',
    ]);
  });

  it('place les entrées sans heure à la fin, habitude avant tâche à heure égale', () => {
    const habits = [habit({ id: 'sansHeure' }), habit({ id: 'dixH', reminders: ['10:00'] })];
    const tasks = [task({ id: 'tacheDixH', time: '10:00' }), task({ id: 'tacheSansHeure' })];

    expect(dayAgenda(new Map(), habits, tasks, NOW, NOW).map((e) => e.id)).toEqual([
      'dixH',
      'tacheDixH',
      'sansHeure',
      'tacheSansHeure',
    ]);
  });

  it("n'inclut que les habitudes planifiées et les tâches de la date demandée", () => {
    const habits = [habit({ id: 'lundi', days: [0] }), habit({ id: 'mercredi', days: [2] })];
    const tasks = [task({ id: 'demain', date: dateKey(addDays(NOW, 1)) })];

    expect(dayAgenda(new Map(), habits, tasks, NOW, NOW).map((e) => e.id)).toEqual(['mercredi']);
  });

  /* G9 — la règle la plus facile à casser au portage, et la seule dont
     l'erreur est invisible : une case cochée d'avance ressemble à un succès. */
  it("ne déclare jamais une habitude 'limit' réussie d'avance", () => {
    const plafond = habit({
      id: 'alcool',
      goal: { kind: 'limit', target: 2, step: 1, unit: 'verres' },
    });

    const vierge = dayAgenda(new Map(), [plafond], [], NOW, NOW)[0];
    expect(vierge?.done).toBe(false);

    const log: LogIndex = new Map([[logKey('alcool', JOUR), 1]]);
    expect(dayAgenda(log, [plafond], [], NOW, NOW)[0]?.done).toBe(true);
  });

  it('porte la valeur journalisée et la cible du jour', () => {
    const eau = habit({ id: 'eau', goal: { kind: 'count', target: 8, step: 1, unit: 'verres' } });
    const log: LogIndex = new Map([[logKey('eau', JOUR), 5]]);

    const entree = dayAgenda(log, [eau], [], NOW, NOW)[0];
    expect(entree).toMatchObject({ kind: 'habit', value: 5, target: 8, done: false });
  });

  it("prend pour cible d'une liste le nombre de sous-éléments", () => {
    const courses = habit({
      id: 'liste',
      goal: { kind: 'list', target: 1, step: 1, unit: '' },
      subItems: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
    });

    expect(dayAgenda(new Map(), [courses], [], NOW, NOW)[0]).toMatchObject({ target: 3 });
  });
});

describe('habitTime', () => {
  it("prend le premier rappel, ou aucune heure s'il n'y en a pas", () => {
    expect(habitTime(habit({ id: 'a', reminders: ['07:00', '19:00'] }))).toBe('07:00');
    expect(habitTime(habit({ id: 'b' }))).toBeNull();
  });
});

describe('estCochable', () => {
  it("refuse l'avenir et accepte le passé", () => {
    expect(estCochable(addDays(NOW, 1), NOW)).toBe(false);
    expect(estCochable(NOW, NOW)).toBe(true);
    expect(estCochable(addDays(NOW, -1), NOW)).toBe(true);
  });
});

describe('habitWeek', () => {
  it('rend les sept jours de la semaine, du lundi au dimanche', () => {
    const semaine = habitWeek(new Map(), habit({ id: 'h' }), 'mon', NOW);
    expect(semaine).toHaveLength(7);
    expect(semaine[0]?.key).toBe('2026-08-03'); // lundi
    expect(semaine[6]?.key).toBe('2026-08-09'); // dimanche
  });

  it('respecte une semaine commençant le dimanche', () => {
    const semaine = habitWeek(new Map(), habit({ id: 'h' }), 'sun', NOW);
    expect(semaine[0]?.key).toBe('2026-08-02');
    expect(semaine[6]?.key).toBe('2026-08-08');
  });

  /* Une pastille de jour non planifié ne se coche pas, et ne se lit pas comme
     un échec : la distinction est portée par `scheduled`, pas par la couleur. */
  it('distingue jour planifié, jour fait et jour à venir', () => {
    const lundiMercredi = habit({ id: 'lm', days: [0, 2] });
    const log: LogIndex = new Map([[logKey('lm', '2026-08-03'), 1]]);
    const semaine = habitWeek(log, lundiMercredi, 'mon', NOW);

    expect(semaine[0]).toMatchObject({ scheduled: true, done: true, future: false });
    expect(semaine[1]).toMatchObject({ scheduled: false, done: false, future: false });
    expect(semaine[2]).toMatchObject({ scheduled: true, done: false, future: false });
    expect(semaine[3]).toMatchObject({ future: true });
  });
});
