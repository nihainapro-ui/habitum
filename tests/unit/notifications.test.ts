import { describe, expect, it } from 'vitest';
import {
  dansLesHeuresSilencieuses,
  identifiantNotification,
  prochainsRappels,
  type EtatRappels,
  type Goal,
  type Habit,
  type ProjectTask,
  type Settings,
  type Task,
} from '@/lib/domain';
import { DEFAULT_SETTINGS } from '@/lib/data';

/* Rappels — spec du 2026-09-07. Calcul NEUF : pas d'oracle dans les 62 valeurs
   de référence, ce fichier fait donc foi si l'une de ces règles change.

   Toutes les dates sont locales et fixes : le fuseau de la machine ne doit
   jamais décider si un rappel sonne. */

const JOUR = '2026-09-07';
const DEMAIN = '2026-09-08';
/** Lundi 7 septembre 2026, 8 h 00 locales. */
const MAINTENANT = new Date(2026, 8, 7, 8, 0, 0);

const reglages = (p: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  notifications: true,
  ...p,
});

const habit = (p: Partial<Habit> & { id: string }): Habit => ({
  name: p.id,
  category: 'health',
  goal: { kind: 'check', target: 1, step: 1, unit: '' },
  /* Tous les jours : `dow` avec les sept jours — c'est ainsi que le domaine
     exprime une habitude quotidienne. */
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

const tache = (p: Partial<Task> & { id: string }): Task => ({
  name: p.id,
  category: 'work',
  date: JOUR,
  duration: 60,
  priority: 2,
  done: false,
  subTasks: [],
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...p,
});

const etape = (p: Partial<ProjectTask> & { id: string }): ProjectTask => ({
  projectId: 'p1',
  name: p.id,
  assignee: '',
  deadline: JOUR,
  status: 'todo',
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...p,
});

const objectif = (p: Partial<Goal> & { id: string }): Goal => ({
  name: p.id,
  kind: 'cumul',
  target: 10,
  unit: 'x',
  category: 'health',
  deadline: JOUR,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...p,
});

const etat = (p: Partial<EtatRappels> = {}): EtatRappels => ({
  habits: [],
  log: new Map(),
  tasks: [],
  occurrences: new Set(),
  projectTasks: [],
  goals: [],
  ...p,
});

const heureDe = (at: number) => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

describe('interrupteur maître', () => {
  it('coupé, RIEN ne sort — la garde est ici, pas dans chaque canal', () => {
    const e = etat({ tasks: [tache({ id: 't1', time: '10:00' })] });
    expect(prochainsRappels(e, reglages({ notifications: false }), MAINTENANT)).toEqual([]);
  });
});

describe('source habitude', () => {
  it('rend les heures posées sur l’habitude', () => {
    const e = etat({
      habits: [habit({ id: 'h1', name: 'Courir', reminders: ['07:00', '18:30'] })],
    });
    const r = prochainsRappels(e, reglages(), MAINTENANT);

    /* 07:00 est PASSÉ à 8 h : le passé ne se rattrape pas. */
    expect(r.map((x) => heureDe(x.at))).toEqual(['18:30']);
    expect(r[0]!.source).toBe('habit');
    expect(r[0]!.titre).toBe('Courir');
  });

  it('se coupe par son interrupteur, sans toucher aux autres sources', () => {
    const e = etat({
      habits: [habit({ id: 'h1', reminders: ['18:30'] })],
      tasks: [tache({ id: 't1', time: '18:00' })],
    });
    const r = prochainsRappels(e, reglages({ notifHabits: false }), MAINTENANT);
    expect(r.map((x) => x.source)).toEqual(['task']);
  });
});

describe('source tâche', () => {
  it('sonne à l’heure dite', () => {
    const e = etat({ tasks: [tache({ id: 't1', name: 'Dentiste', time: '14:30' })] });
    const r = prochainsRappels(e, reglages(), MAINTENANT);
    expect(r).toHaveLength(1);
    expect(heureDe(r[0]!.at)).toBe('14:30');
    expect(r[0]!.titre).toBe('Dentiste');
  });

  it('avance du préavis, et le dit dans un autre libellé', () => {
    const e = etat({ tasks: [tache({ id: 't1', time: '14:30' })] });
    const r = prochainsRappels(e, reglages({ notifLead: 30 }), MAINTENANT);
    expect(heureDe(r[0]!.at)).toBe('14:00');
    expect(r[0]!.corpsKey).toBe('notifBodyTaskLead');
    expect(r[0]!.corpsParams).toEqual({ heure: '14:30', minutes: 30 });
  });

  it('ne sonne JAMAIS sans heure — on n’en invente pas une', () => {
    const e = etat({ tasks: [tache({ id: 't1' })] });
    expect(prochainsRappels(e, reglages(), MAINTENANT)).toEqual([]);
  });

  it('ne sonne pas si la tâche est faite', () => {
    const e = etat({ tasks: [tache({ id: 't1', time: '14:30', done: true })] });
    expect(prochainsRappels(e, reglages(), MAINTENANT)).toEqual([]);
  });

  it('suit les récurrences, et respecte l’occurrence déjà cochée', () => {
    const quotidienne = tache({
      id: 't1',
      time: '14:30',
      date: '2026-09-01',
      recurrence: { freq: 'daily' },
      /* `done` de l'entité ne dit RIEN d'une série : c'est l'occurrence du
         jour qui fait foi. Confondre les deux couperait tous les rappels
         d'une tâche récurrente cochée une fois. */
      done: true,
    });

    const avecOccurrence = etat({
      tasks: [quotidienne],
      occurrences: new Set([`t1|${JOUR}`]),
    });
    expect(prochainsRappels(avecOccurrence, reglages(), MAINTENANT)).toEqual([]);

    const sansOccurrence = etat({ tasks: [quotidienne] });
    expect(prochainsRappels(sansOccurrence, reglages(), MAINTENANT)).toHaveLength(1);
  });
});

describe('sources Work et objectifs', () => {
  it('sonnent le jour de l’échéance, à l’heure choisie', () => {
    const e = etat({
      projectTasks: [etape({ id: 'w1', name: 'Livrer la maquette' })],
      goals: [objectif({ id: 'g1', name: '10 000 pas' })],
    });
    const r = prochainsRappels(e, reglages({ notifDayHour: '17:00' }), MAINTENANT);
    expect(r.map((x) => [x.source, heureDe(x.at)])).toEqual([
      ['goal', '17:00'],
      ['work', '17:00'],
    ]);
  });

  it('une étape terminée ne sonne pas', () => {
    const e = etat({ projectTasks: [etape({ id: 'w1', status: 'done' })] });
    expect(prochainsRappels(e, reglages(), MAINTENANT)).toEqual([]);
  });

  it('sans échéance, rien', () => {
    const e = etat({
      projectTasks: [etape({ id: 'w1', deadline: '' })],
      goals: [objectif({ id: 'g1', deadline: undefined as never })],
    });
    expect(prochainsRappels(e, reglages(), MAINTENANT)).toEqual([]);
  });
});

describe('récapitulatif du jour', () => {
  it('compte les quatre sources, et sonne à son heure', () => {
    const e = etat({
      habits: [habit({ id: 'h1' })],
      tasks: [tache({ id: 't1', time: '14:30' })],
      projectTasks: [etape({ id: 'w1' })],
      goals: [objectif({ id: 'g1' })],
    });
    const r = prochainsRappels(
      e,
      reglages({ notifDigest: true, notifDigestHour: '09:00' }),
      MAINTENANT,
    );
    const digest = r.find((x) => x.source === 'digest');
    expect(digest?.corpsParams).toEqual({ compte: 4 });
    expect(heureDe(digest!.at)).toBe('09:00');
    /* Il n'a pas de contenu utilisateur : son titre est une clé de libellé. */
    expect(digest!.titre).toBe('');
    expect(digest!.titreKey).toBe('notifDigestTitle');
  });

  it('NE SONNE PAS quand il n’y a rien à dire', () => {
    /* La règle qui empêche le récapitulatif de devenir la notification qu'on
       apprend à ignorer. */
    const r = prochainsRappels(etat(), reglages({ notifDigest: true }), MAINTENANT);
    expect(r).toEqual([]);
  });
});

describe('heures silencieuses', () => {
  const s = reglages({ notifQuiet: true, notifQuietFrom: '22:00', notifQuietTo: '07:00' });

  it('taisent ce qui tombe DANS la fenêtre, y compris à cheval sur minuit', () => {
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 7, 23, 0).getTime(), s)).toBe(true);
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 8, 3, 0).getTime(), s)).toBe(true);
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 8, 6, 59).getTime(), s)).toBe(true);
  });

  it('laissent passer ce qui tombe dehors', () => {
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 7, 21, 59).getTime(), s)).toBe(false);
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 8, 7, 0).getTime(), s)).toBe(false);
  });

  it('gèrent aussi une fenêtre de jour, sans passage de minuit', () => {
    const jour = reglages({ notifQuiet: true, notifQuietFrom: '09:00', notifQuietTo: '12:00' });
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 7, 10, 0).getTime(), jour)).toBe(true);
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 7, 13, 0).getTime(), jour)).toBe(false);
  });

  it('écartent le rappel du résultat, et pas seulement de l’affichage', () => {
    const e = etat({ tasks: [tache({ id: 't1', time: '23:30' })] });
    expect(prochainsRappels(e, s, MAINTENANT)).toEqual([]);
    expect(prochainsRappels(e, reglages(), MAINTENANT)).toHaveLength(1);
  });

  it('coupées, ne taisent rien', () => {
    expect(dansLesHeuresSilencieuses(new Date(2026, 8, 7, 23, 0).getTime(), reglages())).toBe(
      false,
    );
  });
});

describe('horizon', () => {
  it('s’arrête à aujourd’hui par défaut', () => {
    const e = etat({ tasks: [tache({ id: 't1', date: DEMAIN, time: '10:00' })] });
    expect(prochainsRappels(e, reglages(), MAINTENANT)).toEqual([]);
  });

  it('va chercher les jours suivants quand on le lui demande (canal natif)', () => {
    const e = etat({
      tasks: [tache({ id: 't1', date: DEMAIN, time: '10:00' })],
      habits: [habit({ id: 'h1', reminders: ['07:00'] })],
    });
    const r = prochainsRappels(e, reglages(), MAINTENANT, 7);

    /* 07:00 est passé AUJOURD'HUI mais pas demain : l'heure réelle ne vaut que
       pour le premier jour, les suivants partent de minuit. */
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.map((x) => x.source)).toContain('task');
    expect(r.filter((x) => x.source === 'habit').length).toBe(6);
  });

  it('rend les rappels TRIÉS, tous jours et toutes sources confondus', () => {
    const e = etat({
      tasks: [tache({ id: 't2', date: DEMAIN, time: '09:00' }), tache({ id: 't1', time: '18:00' })],
    });
    const r = prochainsRappels(e, reglages(), MAINTENANT, 7);
    expect(r.map((x) => x.id)).toEqual(['t1', 't2']);
  });
});

describe('identifiantNotification', () => {
  it('rend le même entier pour la même clé — sinon les annulations ratent leur cible', () => {
    expect(identifiantNotification('task|t1|2026-09-07|14:30')).toBe(
      identifiantNotification('task|t1|2026-09-07|14:30'),
    );
  });

  it('sépare deux clés voisines', () => {
    expect(identifiantNotification('task|t1|2026-09-07|14:30')).not.toBe(
      identifiantNotification('task|t1|2026-09-07|14:31'),
    );
  });

  it('rend toujours un entier positif — Android refuse le reste', () => {
    for (const cle of ['a', 'habit|h1|2026-09-07|07:00', 'digest||2026-12-31|08:00', '']) {
      const n = identifiantNotification(cle);
      expect(Number.isSafeInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });
});
