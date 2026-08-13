import { describe, expect, it } from 'vitest';
import {
  expandRecurrence,
  nextOccurrence,
  occurrenceKey,
  parseOccurrenceKey,
} from '@/lib/domain/recurrence';
import type { Recurrence, Task } from '@/lib/domain';

/* Tâche 5.6 — les cinq cas limites imposés par le plan :
   intervalle > 1 · exception au milieu d'une série · fin de mois
   (31 janvier → février) · changement d'heure d'été · fenêtre vide. */

const tache = (date: string, recurrence?: Recurrence): Task => ({
  id: 't1',
  name: 'Promener le chien',
  category: 'home',
  date,
  duration: 60,
  priority: 1,
  done: false,
  subTasks: [],
  note: '',
  ...(recurrence ? { recurrence } : {}),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('occurrenceKey — format FIGÉ (G1)', () => {
  it('reste `taskId|YYYY-MM-DD`', () => {
    expect(occurrenceKey('t1', '2026-08-05')).toBe('t1|2026-08-05');
  });

  it('se relit, et refuse ce qui n’a pas la forme attendue', () => {
    expect(parseOccurrenceKey('t1|2026-08-05')).toEqual({ taskId: 't1', date: '2026-08-05' });
    for (const mauvaise of ['t1', '|2026-08-05', 't1|hier', 't1|2026-13-45x']) {
      expect(parseOccurrenceKey(mauvaise), mauvaise).toBeNull();
    }
  });
});

describe('quotidien', () => {
  it('rend chaque jour de la fenêtre', () => {
    const dates = expandRecurrence(
      tache('2026-08-03', { freq: 'daily' }),
      '2026-08-03',
      '2026-08-06',
    );
    expect(dates).toEqual(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']);
  });

  it('ne commence jamais avant son ancrage, même si la fenêtre remonte plus loin', () => {
    const dates = expandRecurrence(
      tache('2026-08-05', { freq: 'daily' }),
      '2026-08-01',
      '2026-08-06',
    );
    expect(dates).toEqual(['2026-08-05', '2026-08-06']);
  });

  /* CAS 1 — intervalle > 1. L'ancrage est la tâche, pas la fenêtre : sans cela,
     « tous les 3 jours » changerait de jours selon le mois qu'on regarde. */
  it('respecte un intervalle de 3, ancré sur la tâche', () => {
    const t = tache('2026-08-03', { freq: 'daily', interval: 3 });
    expect(expandRecurrence(t, '2026-08-03', '2026-08-12')).toEqual([
      '2026-08-03',
      '2026-08-06',
      '2026-08-09',
      '2026-08-12',
    ]);
    /* Même série lue depuis une autre fenêtre : les mêmes jours. */
    expect(expandRecurrence(t, '2026-08-07', '2026-08-10')).toEqual(['2026-08-09']);
  });

  /* CAS 4 — changement d'heure. Le 29 mars 2026, l'Europe passe à l'heure
     d'été : cette nuit-là ne fait que 23 heures. Un calcul par différence de
     millisecondes sauterait ou doublerait un jour. */
  it('traverse le changement d’heure sans sauter ni doubler un jour', () => {
    const dates = expandRecurrence(
      tache('2026-03-27', { freq: 'daily' }),
      '2026-03-27',
      '2026-03-31',
    );
    expect(dates).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31']);
  });
});

describe('hebdomadaire', () => {
  it('suit le jour de la tâche quand aucun n’est précisé', () => {
    /* 5 août 2026 = mercredi. */
    const dates = expandRecurrence(
      tache('2026-08-05', { freq: 'weekly' }),
      '2026-08-05',
      '2026-08-26',
    );
    expect(dates).toEqual(['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26']);
  });

  it('accepte plusieurs jours dans la semaine', () => {
    /* 0 = lundi, 4 = vendredi. */
    const t = tache('2026-08-03', { freq: 'weekly', days: [0, 4] });
    expect(expandRecurrence(t, '2026-08-03', '2026-08-14')).toEqual([
      '2026-08-03',
      '2026-08-07',
      '2026-08-10',
      '2026-08-14',
    ]);
  });

  it('saute une semaine sur deux avec un intervalle de 2', () => {
    const t = tache('2026-08-05', { freq: 'weekly', interval: 2 });
    expect(expandRecurrence(t, '2026-08-05', '2026-09-02')).toEqual([
      '2026-08-05',
      '2026-08-19',
      '2026-09-02',
    ]);
  });
});

describe('mensuel', () => {
  /* CAS 3 — fin de mois. Le 31 février n'existe pas : l'occurrence est ramenée
     au dernier jour du mois, ET le quantième d'origine n'est pas perdu — mars
     retombe le 31. */
  it('ramène le 31 janvier au dernier jour de février, sans perdre le quantième', () => {
    const t = tache('2026-01-31', { freq: 'monthly' });
    expect(expandRecurrence(t, '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('tient compte d’une année bissextile', () => {
    const t = tache('2028-01-31', { freq: 'monthly' });
    expect(expandRecurrence(t, '2028-02-01', '2028-02-29')).toEqual(['2028-02-29']);
  });

  it('accepte un quantième explicite et un intervalle', () => {
    const t = tache('2026-01-05', { freq: 'monthly', dayOfMonth: 15, interval: 2 });
    expect(expandRecurrence(t, '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-15',
      '2026-03-15',
      '2026-05-15',
    ]);
  });
});

describe('exceptions', () => {
  /* CAS 2 — une occurrence retirée au milieu ne casse pas la série. */
  it('retire l’occurrence exceptée, et elle seule', () => {
    const t = tache('2026-08-03', { freq: 'daily' });
    const dates = expandRecurrence(t, '2026-08-03', '2026-08-06', new Set(['2026-08-04']));
    expect(dates).toEqual(['2026-08-03', '2026-08-05', '2026-08-06']);
  });
});

describe('fenêtre vide', () => {
  /* CAS 5 — une fenêtre à l'envers, antérieure, ou une tâche sans récurrence
     rendent une liste vide. Jamais une exception, jamais `null`. */
  it('rend une liste vide plutôt que de lever', () => {
    const t = tache('2026-08-03', { freq: 'daily' });
    expect(expandRecurrence(t, '2026-08-10', '2026-08-01')).toEqual([]);
    expect(expandRecurrence(t, '2026-07-01', '2026-07-31')).toEqual([]);
    expect(expandRecurrence(tache('2026-08-03'), '2026-08-01', '2026-08-31')).toEqual([]);
    expect(expandRecurrence(t, 'pas-une-date', '2026-08-31')).toEqual([]);
  });
});

describe('nextOccurrence', () => {
  it('rend la suivante, jamais celle du jour', () => {
    const t = tache('2026-08-05', { freq: 'daily' });
    expect(nextOccurrence(t, '2026-08-05')).toBe('2026-08-06');
  });

  it('rend la PREMIÈRE quand on interroge avant l’ancrage', () => {
    const t = tache('2026-08-05', { freq: 'weekly' });
    expect(nextOccurrence(t, '2026-07-01')).toBe('2026-08-05');
  });

  it('saute les exceptions', () => {
    const t = tache('2026-08-05', { freq: 'daily' });
    expect(nextOccurrence(t, '2026-08-05', new Set(['2026-08-06']))).toBe('2026-08-07');
  });

  it('rend `null` sans récurrence — une tâche unique n’a pas de suite', () => {
    expect(nextOccurrence(tache('2026-08-05'), '2026-08-05')).toBeNull();
  });
});
