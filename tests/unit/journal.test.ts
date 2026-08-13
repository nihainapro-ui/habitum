import { describe, expect, it } from 'vitest';
import {
  activeHabits,
  focusTargets,
  habitNotes,
  journalHistory,
  openTasksFrom,
  recentSessions,
  searchNotes,
  sessionsOfDay,
  sortHabitsCatalog,
  upcomingTasks,
  type Habit,
  type Note,
  type Session,
  type Task,
} from '@/lib/domain';

/* Ces sélections vivaient dans les composants : elles en sont descendues à la
   clôture de la phase 4, avec leurs tests. Un filtre écrit dans une vue est un
   filtre que la vue voisine réécrira autrement (G2). */

const ISO = '2026-01-01T00:00:00.000Z';
const NOW = new Date(2026, 7, 5);

const note = (over: Partial<Note> & Pick<Note, 'id' | 'kind'>): Note => ({
  body: '',
  createdAt: ISO,
  updatedAt: ISO,
  ...over,
});

const session = (id: string, date: string, minutes = 10): Session => ({
  id,
  label: id,
  minutes,
  date,
  mode: 'pomo',
  createdAt: ISO,
  updatedAt: ISO,
});

const habit = (id: string, archived = false): Habit => ({
  id,
  name: id,
  category: 'health',
  goal: { kind: 'check', target: 1, step: 1, unit: '' },
  mode: 'dow',
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived,
  note: '',
  createdAt: ISO,
  updatedAt: ISO,
});

const task = (id: string, date: string, done = false, time?: string): Task => ({
  id,
  name: id,
  category: 'work',
  date,
  duration: 60,
  priority: 2,
  done,
  subTasks: [],
  note: '',
  createdAt: ISO,
  updatedAt: ISO,
  ...(time ? { time } : {}),
});

describe('journalHistory', () => {
  it('ne retient que les entrées de journal datées, la plus récente en tête', () => {
    const notes = [
      note({ id: 'a', kind: 'journal', date: '2026-08-01', body: 'un' }),
      note({ id: 'b', kind: 'journal', date: '2026-08-05', body: 'deux' }),
      note({ id: 'c', kind: 'habit', habitId: 'h', body: 'trois' }),
      note({ id: 'd', kind: 'journal', body: 'sans date' }),
    ];
    expect(journalHistory(notes).map((n) => n.id)).toEqual(['b', 'a']);
  });
});

describe('habitNotes', () => {
  it('écarte les notes vides — une ligne sans contenu n’est pas une note', () => {
    const notes = [
      note({ id: 'a', kind: 'habit', habitId: 'h', body: 'utile' }),
      note({ id: 'b', kind: 'habit', habitId: 'h', body: '   ' }),
      note({ id: 'c', kind: 'journal', date: '2026-08-05', body: 'journal' }),
    ];
    expect(habitNotes(notes).map((n) => n.id)).toEqual(['a']);
  });
});

describe('searchNotes', () => {
  const notes = [
    note({ id: 'a', kind: 'journal', date: '2026-08-05', body: 'Course au bord du CANAL' }),
    note({ id: 'b', kind: 'habit', habitId: 'h', body: 'rien à voir' }),
  ];

  it('cherche sans tenir compte de la casse', () => {
    expect(searchNotes(notes, 'canal').map((n) => n.id)).toEqual(['a']);
  });

  it('ne rend rien sur une requête vide — pas tout', () => {
    expect(searchNotes(notes, '   ')).toEqual([]);
  });
});

describe('sessions', () => {
  const sessions = [
    session('a', '2026-08-05'),
    session('b', '2026-08-04'),
    session('c', '2026-08-05'),
  ];

  it('isole les sessions du jour', () => {
    expect(sessionsOfDay(sessions, '2026-08-05').map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('rend les plus récentes, dans la limite demandée', () => {
    expect(recentSessions(sessions, 2)).toHaveLength(2);
    expect(recentSessions(sessions, 2)[0]?.date).toBe('2026-08-05');
    expect(recentSessions(sessions, 0)).toEqual([]);
  });
});

describe('catalogue d’habitudes', () => {
  it('ne compte pas les archivées, mais ne les perd pas', () => {
    const habits = [habit('a'), habit('b', true), habit('c')];
    expect(activeHabits(habits)).toHaveLength(2);
    expect(sortHabitsCatalog(habits).map((h) => h.id)).toEqual(['a', 'c', 'b']);
    expect(sortHabitsCatalog(habits)).toHaveLength(3);
  });
});

describe('focusTargets', () => {
  it('propose les habitudes du jour et les tâches non faites', () => {
    const habits = [habit('quotidienne'), habit('archivée', true)];
    const tasks = [
      task('à faire', '2026-08-05'),
      task('faite', '2026-08-05', true),
      task('demain', '2026-08-06'),
    ];

    expect(focusTargets(habits, tasks, '2026-08-05', NOW).map((c) => c.id)).toEqual([
      'quotidienne',
      'à faire',
    ]);
  });
});

describe('tâches ouvertes et prochaines échéances', () => {
  const tasks = [
    task('hier', '2026-08-04'),
    task('aujourdhui-tard', '2026-08-05', false, '18:00'),
    task('aujourdhui-tot', '2026-08-05', false, '08:00'),
    task('faite', '2026-08-05', true),
    task('plus-tard', '2026-08-20'),
  ];

  /* Le passé non fait reste dû : le compter pour zéro serait se mentir sur sa
     charge. */
  it('garde le passé non fait', () => {
    expect(openTasksFrom(tasks, '2026-08-04').map((t) => t.id)).toContain('hier');
    expect(openTasksFrom(tasks, '2026-08-05').map((t) => t.id)).not.toContain('hier');
    expect(openTasksFrom(tasks, '2026-08-01').map((t) => t.id)).not.toContain('faite');
  });

  it('classe par date puis par heure, et limite l’aperçu', () => {
    expect(upcomingTasks(tasks, '2026-08-05', 2).map((t) => t.id)).toEqual([
      'aujourdhui-tot',
      'aujourdhui-tard',
    ]);
    expect(upcomingTasks(tasks, '2026-08-05', 0)).toEqual([]);
  });
});
