import { describe, expect, it } from 'vitest';
import { aDesRappels, cleRappel, parseHeure, rappelsRestants } from '@/lib/domain/reminders';
import { logKey, type Habit, type LogIndex } from '@/lib/domain';

/* Tâche 5.2 — ce qui doit être rappelé, et surtout ce qui ne doit pas l'être.

   Un rappel de trop coûte la permission de notifier : l'utilisateur ne la
   retire pas habitude par habitude, il la coupe. Ces cas valent donc autant
   que les rappels eux-mêmes. */

const MERCREDI = new Date('2026-08-05T09:00:00');

const habitude = (p: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Méditer',
  category: 'mind',
  goal: { kind: 'check', target: 1, step: 1, unit: '' },
  mode: 'dow',
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...p,
});

const vide: LogIndex = new Map();

describe('parseHeure', () => {
  it('accepte HH:MM sur 24 h', () => {
    expect(parseHeure('07:00')).toBe(420);
    expect(parseHeure('23:59')).toBe(1439);
  });

  it('refuse tout le reste plutôt que de le deviner', () => {
    for (const v of ['7:00', '24:00', '12:60', '', 'midi', '12h30']) {
      expect(parseHeure(v), v).toBeNull();
    }
  });
});

describe('rappelsRestants', () => {
  it('rend les rappels à venir du jour, dans l’ordre', () => {
    const h = habitude({ reminders: ['22:00', '13:30'] });
    const prevus = rappelsRestants([h], vide, MERCREDI);

    expect(prevus.map((r) => r.time)).toEqual(['13:30', '22:00']);
    expect(new Date(prevus[0]!.at).getHours()).toBe(13);
  });

  it('ne rattrape pas le passé : un rappel de 7 h n’existe plus à 9 h', () => {
    expect(rappelsRestants([habitude({ reminders: ['07:00'] })], vide, MERCREDI)).toEqual([]);
  });

  it('ne rappelle pas une habitude non planifiée ce jour-là', () => {
    /* Mercredi = jour 2 en semaine commençant lundi. */
    const h = habitude({ days: [0, 1], reminders: ['13:30'] });
    expect(rappelsRestants([h], vide, MERCREDI)).toEqual([]);
  });

  it('ne rappelle pas ce qui est déjà fait', () => {
    const h = habitude({ reminders: ['13:30'] });
    const log: LogIndex = new Map([[logKey('h1', '2026-08-05'), 1]]);
    expect(rappelsRestants([h], log, MERCREDI)).toEqual([]);
  });

  it('ne rappelle pas une habitude archivée', () => {
    const h = habitude({ reminders: ['13:30'], archived: true });
    expect(rappelsRestants([h], vide, MERCREDI)).toEqual([]);
  });

  it('ignore une heure illisible sans perdre les autres', () => {
    const h = habitude({ reminders: ['midi', '13:30'] });
    expect(rappelsRestants([h], vide, MERCREDI).map((r) => r.time)).toEqual(['13:30']);
  });

  it('porte le nom de l’habitude — le rappel doit dire de quoi il parle', () => {
    const h = habitude({ name: 'Courir', reminders: ['18:00'] });
    expect(rappelsRestants([h], vide, MERCREDI)[0]?.name).toBe('Courir');
  });
});

describe('aDesRappels', () => {
  it('distingue « aucun rappel configuré » de « rappels passés »', () => {
    expect(aDesRappels([habitude()])).toBe(false);
    expect(aDesRappels([habitude({ reminders: ['07:00'] })])).toBe(true);
    expect(aDesRappels([habitude({ reminders: ['midi'] })])).toBe(false);
  });
});

describe('cleRappel', () => {
  it('identifie une habitude, un jour et une heure — jamais deux fois le même', () => {
    const r = rappelsRestants([habitude({ reminders: ['13:30'] })], vide, MERCREDI)[0]!;
    expect(cleRappel(r, MERCREDI)).toBe('h1|2026-08-05|13:30');
  });
});
