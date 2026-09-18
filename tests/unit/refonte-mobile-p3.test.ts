import { describe, expect, it } from 'vitest';
import {
  archivedHabits,
  estEnRetard,
  logKey,
  resumeSemaine,
  type Habit,
  type Task,
} from '@/lib/domain';

/* Briques de domaine de la refonte mobile, P3 lot 1 : Habitudes et Tâches.
   Date figée du dossier : mercredi 5 août 2026. */

const NOW = new Date(2026, 7, 5);

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

const task = (over: Partial<Task> & Pick<Task, 'id' | 'date'>): Task => ({
  name: over.id,
  category: 'work',
  duration: 60,
  priority: 2,
  done: false,
  note: '',
  subTasks: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('resumeSemaine', () => {
  const a = habit({ id: 'a' });
  const b = habit({ id: 'b' });
  const log = new Map<string, number>();
  /* 29 juil. → 4 août : a et b faites 3 jours, a seule 2 jours, rien 2 jours. */
  for (const j of [29, 30, 31]) {
    log.set(logKey('a', `2026-07-${j}`), 1);
    log.set(logKey('b', `2026-07-${j}`), 1);
  }
  log.set(logKey('a', '2026-08-01'), 1);
  log.set(logKey('a', '2026-08-02'), 1);

  it('compte les sept jours PASSÉS, jour courant exclu', () => {
    expect(resumeSemaine(log, [a, b], NOW)).toEqual({ complets: 3, partiels: 2, manques: 2 });
  });

  it('ne compte pas le jour courant, même fait', () => {
    const avecAujourdhui = new Map(log);
    avecAujourdhui.set(logKey('a', '2026-08-05'), 1);
    avecAujourdhui.set(logKey('b', '2026-08-05'), 1);
    expect(resumeSemaine(avecAujourdhui, [a, b], NOW)).toEqual({
      complets: 3,
      partiels: 2,
      manques: 2,
    });
  });

  it('ignore les archivées et les jours sans rien de planifié', () => {
    const lundiSeul = habit({ id: 'l', days: [0] });
    /* Semaine du 29 juil. au 4 août : un seul lundi, le 3 août — non fait. */
    expect(resumeSemaine(new Map(), [lundiSeul], NOW)).toEqual({
      complets: 0,
      partiels: 0,
      manques: 1,
    });
    expect(resumeSemaine(new Map(), [habit({ id: 'x', archived: true })], NOW)).toEqual({
      complets: 0,
      partiels: 0,
      manques: 0,
    });
  });

  it('ne fabrique rien pour un compte sans habitude', () => {
    expect(resumeSemaine(new Map(), [], NOW)).toEqual({ complets: 0, partiels: 0, manques: 0 });
  });
});

describe('archivedHabits', () => {
  it('rend les archivées seules, dans l’ordre', () => {
    const liste = [
      habit({ id: 'a' }),
      habit({ id: 'b', archived: true }),
      habit({ id: 'c', archived: true }),
    ];
    expect(archivedHabits(liste).map((h) => h.id)).toEqual(['b', 'c']);
  });
});

describe('estEnRetard', () => {
  it('est vrai pour une tâche non faite d’avant aujourd’hui, seulement', () => {
    expect(estEnRetard(task({ id: 'h', date: '2026-08-04' }), NOW)).toBe(true);
    expect(estEnRetard(task({ id: 'j', date: '2026-08-05' }), NOW)).toBe(false);
    expect(estEnRetard(task({ id: 'd', date: '2026-08-06' }), NOW)).toBe(false);
    expect(estEnRetard(task({ id: 'f', date: '2026-08-01', done: true }), NOW)).toBe(false);
  });
});
