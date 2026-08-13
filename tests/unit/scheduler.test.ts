import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_MINUTERIES,
  oublierRappelsEnvoyes,
  planifier,
} from '@/lib/features/reminders/scheduler';
import { logKey, type Habit, type LogIndex } from '@/lib/domain';

/* Tâche 5.2 — le planificateur arme, il ne décide pas.
   Ce qu'on vérifie ici : il arme au bon moment, une seule fois, et il se tait
   quand on le lui demande. */

const MERCREDI = new Date('2026-08-05T09:00:00');

const habitude = (p: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Méditer',
  category: 'mind',
  goal: { kind: 'check', target: 1, step: 1, unit: '' },
  mode: 'dow',
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: ['13:30'],
  archived: false,
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...p,
});

const vide: LogIndex = new Map();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MERCREDI);
  oublierRappelsEnvoyes();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('planifier', () => {
  it('déclenche à l’heure dite, pas avant', () => {
    const envoyes: string[] = [];
    planifier({ habits: [habitude()], log: vide, envoyer: (r) => envoyes.push(r.time) });

    vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 29 * 60 * 1000);
    expect(envoyes).toEqual([]);

    vi.advanceTimersByTime(60 * 1000);
    expect(envoyes).toEqual(['13:30']);
  });

  it('n’envoie qu’une fois, même réarmé entre-temps', () => {
    const envoyes: string[] = [];
    const envoyer = (r: { time: string }) => envoyes.push(r.time);

    const arret = planifier({ habits: [habitude()], log: vide, envoyer });
    arret();
    planifier({ habits: [habitude()], log: vide, envoyer });

    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(envoyes).toEqual(['13:30']);
  });

  it('l’arrêt annule ce qui n’a pas encore sonné', () => {
    const envoyes: string[] = [];
    const arret = planifier({
      habits: [habitude()],
      log: vide,
      envoyer: (r) => envoyes.push(r.time),
    });

    arret();
    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(envoyes).toEqual([]);
  });

  it('n’arme rien pour une habitude déjà faite', () => {
    const envoyes: string[] = [];
    const log: LogIndex = new Map([[logKey('h1', '2026-08-05'), 1]]);
    planifier({ habits: [habitude()], log, envoyer: (r) => envoyes.push(r.time) });

    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(envoyes).toEqual([]);
  });

  it(`n’arme jamais plus de ${MAX_MINUTERIES} minuteries — les plus proches d'abord`, () => {
    const heures = Array.from({ length: 40 }, (_, i) => {
      const m = 10 * 60 + i * 5;
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    });
    const envoyes: string[] = [];
    planifier({
      habits: [habitude({ reminders: heures })],
      log: vide,
      envoyer: (r) => envoyes.push(r.time),
    });

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(envoyes).toHaveLength(MAX_MINUTERIES);
    expect(envoyes[0]).toBe('10:00');
  });
});
