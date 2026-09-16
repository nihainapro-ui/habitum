import { describe, expect, it } from 'vitest';
import {
  epurerRappel,
  estRappelNu,
  normaliserRappel,
  prochainsRappels,
  rappelCeJour,
  rappelsEntite,
  rappelsHabitude,
  typeRappel,
  type EtatRappels,
  type Habit,
  type ProjectTask,
  type Settings,
  type Task,
} from '@/lib/domain';
import { DEFAULT_SETTINGS } from '@/lib/data';

/* Type et calendrier d'un rappel — spec du 2026-09-16. Calcul NEUF : pas
   d'oracle dans les 62 valeurs de référence, ce fichier fait donc foi. */

/** Lundi 7 septembre 2026, 8 h 00 locales. */
const LUNDI = new Date(2026, 8, 7, 8, 0, 0);
const K = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const reglages = (p: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  notifications: true,
  ...p,
});

const habit = (p: Partial<Habit> & { id: string }): Habit => ({
  name: p.id,
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
  ...p,
});

const tache = (p: Partial<Task> & { id: string }): Task => ({
  name: p.id,
  category: 'work',
  date: K(LUNDI),
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
  deadline: K(LUNDI),
  status: 'todo',
  note: '',
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

describe('les deux formes persistées', () => {
  it('une heure nue reste un rappel — notification, toujours', () => {
    expect(normaliserRappel('07:30')).toEqual({ time: '07:30' });
    expect(typeRappel(normaliserRappel('07:30'))).toBe('notif');
  });

  it('`Habit.reminders` se lit mêlé : chaînes et objets côte à côte', () => {
    /* Le cas RÉEL d'une base écrite avant le 16 septembre, puis rouverte :
       l'éditeur ajoute un objet à côté des chaînes d'origine. */
    const h = habit({ id: 'h1', reminders: ['07:00', { time: '20:00', type: 'alarm' }] });
    expect(rappelsHabitude(h)).toEqual([{ time: '07:00' }, { time: '20:00', type: 'alarm' }]);
  });

  it('`remindAt` seul est relu comme UN rappel ; `rappels` gagne dès qu’il existe', () => {
    expect(rappelsEntite({ remindAt: '09:00' })).toEqual([{ time: '09:00' }]);
    expect(rappelsEntite({ remindAt: '09:00', rappels: [] })).toEqual([]);
    expect(rappelsEntite({ remindAt: '09:00', rappels: [{ time: '18:00' }] })).toEqual([
      { time: '18:00' },
    ]);
    expect(rappelsEntite({})).toEqual([]);
  });
});

describe('épuration à l’écriture', () => {
  it('ne répète pas les défauts', () => {
    expect(epurerRappel({ time: '08:00', type: 'notif', days: [], before: [0] })).toEqual({
      time: '08:00',
    });
  });

  it('garde ce qui est un choix, trié', () => {
    expect(epurerRappel({ time: '08:00', type: 'alarm', days: [4, 0], before: [1, 3, 1] })).toEqual(
      {
        time: '08:00',
        type: 'alarm',
        days: [0, 4],
        before: [3, 1],
      },
    );
  });

  it('sait quand une chaîne suffit — la sauvegarde reste lisible par l’ancienne version', () => {
    expect(estRappelNu({ time: '08:00' })).toBe(true);
    expect(estRappelNu({ time: '08:00', type: 'notif' })).toBe(true);
    expect(estRappelNu({ time: '08:00', type: 'silent' })).toBe(false);
    expect(estRappelNu({ time: '08:00', days: [1] })).toBe(false);
  });
});

describe('rappelCeJour — le calendrier', () => {
  const dueLundi = (d: Date) => K(d) === K(LUNDI);

  it('« toujours » : le jour même, et seulement lui', () => {
    expect(rappelCeJour({ time: '08:00' }, LUNDI, dueLundi)).toBe(true);
    expect(rappelCeJour({ time: '08:00' }, new Date(2026, 8, 6), dueLundi)).toBe(false);
  });

  it('« certains jours » : lundi = 0, la convention de `Habit.days`', () => {
    expect(rappelCeJour({ time: '08:00', days: [0] }, LUNDI, () => true)).toBe(true);
    expect(rappelCeJour({ time: '08:00', days: [1, 2] }, LUNDI, () => true)).toBe(false);
  });

  it('« jours avant » : la veille sonne pour une échéance du lendemain', () => {
    const dimanche = new Date(2026, 8, 6);
    expect(rappelCeJour({ time: '18:00', before: [1] }, dimanche, dueLundi)).toBe(true);
    /* Et PAS le jour même, sauf si 0 en fait partie. */
    expect(rappelCeJour({ time: '18:00', before: [1] }, LUNDI, dueLundi)).toBe(false);
    expect(rappelCeJour({ time: '18:00', before: [1, 0] }, LUNDI, dueLundi)).toBe(true);
  });
});

describe('dans le calcul des rappels', () => {
  it('une habitude porte le type de chacun de ses rappels', () => {
    const e = etat({
      habits: [habit({ id: 'h1', reminders: ['18:00', { time: '19:00', type: 'alarm' }] })],
    });
    const r = prochainsRappels(e, reglages(), LUNDI);
    expect(r.map((x) => [heureDe(x.at), x.type])).toEqual([
      ['18:00', 'notif'],
      ['19:00', 'alarm'],
    ]);
    /* Deux rappels distincts, deux clés distinctes. */
    expect(new Set(r.map((x) => x.cle)).size).toBe(2);
  });

  it('une habitude « certains jours » se tait les autres jours', () => {
    /* Lundi : un rappel réglé « mardi, mercredi » ne sonne pas. */
    const e = etat({ habits: [habit({ id: 'h1', reminders: [{ time: '18:00', days: [1, 2] }] })] });
    expect(prochainsRappels(e, reglages(), LUNDI)).toEqual([]);
    const f = etat({ habits: [habit({ id: 'h1', reminders: [{ time: '18:00', days: [0] }] })] });
    expect(prochainsRappels(f, reglages(), LUNDI)).toHaveLength(1);
  });

  it('une étape « la veille » sonne la veille, avec le corps qui le dit', () => {
    const mardi = new Date(2026, 8, 8);
    const e = etat({
      projectTasks: [
        etape({ id: 'w1', deadline: K(mardi), rappels: [{ time: '18:00', before: [1] }] }),
      ],
    });
    const r = prochainsRappels(e, reglages(), LUNDI);
    expect(r).toHaveLength(1);
    expect(heureDe(r[0]!.at)).toBe('18:00');
    expect(r[0]!.corpsKey).toBe('notifBodyBefore');
    expect(r[0]!.corpsParams).toEqual({ jours: 1 });
  });

  it('une tâche à rappel propre n’est PAS décalée du préavis général', () => {
    const e = etat({ tasks: [tache({ id: 't1', time: '14:30', rappels: [{ time: '11:00' }] })] });
    const r = prochainsRappels(e, reglages({ notifLead: 30 }), LUNDI);
    expect(heureDe(r[0]!.at)).toBe('11:00');
  });

  it('une ALARME passe outre les heures silencieuses ; une notification s’y plie', () => {
    const s = reglages({ notifQuiet: true, notifQuietFrom: '22:00', notifQuietTo: '07:00' });
    const e = etat({
      tasks: [
        tache({ id: 'a', rappels: [{ time: '23:00', type: 'alarm' }] }),
        tache({ id: 'n', rappels: [{ time: '23:30', type: 'notif' }] }),
      ],
    });
    expect(prochainsRappels(e, s, LUNDI).map((x) => x.id)).toEqual(['a']);
  });

  it('une liste de rappels VIDE veut dire « règle générale », pas « rien »', () => {
    /* `rappels: []` est ce que l'éditeur écrit quand on retire tous les
       rappels propres : la tâche retombe alors sur l'heure moins le préavis,
       comme une tâche jamais réglée. */
    const e = etat({ tasks: [tache({ id: 't1', time: '14:30', rappels: [] })] });
    const r = prochainsRappels(e, reglages({ notifLead: 10 }), LUNDI);
    expect(heureDe(r[0]!.at)).toBe('14:20');
  });
});
