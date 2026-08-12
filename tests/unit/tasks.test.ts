import { describe, expect, it } from 'vitest';
import { addDays, dateKey, groupTasks, subTaskCount, taskGroup, type Task } from '@/lib/domain';

const NOW = new Date(2026, 7, 5); // mercredi 5 août 2026

const task = (over: Partial<Task> & Pick<Task, 'id' | 'date'>): Task => ({
  name: over.id,
  category: 'work',
  duration: 60,
  priority: 2,
  done: false,
  subTasks: [],
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const jour = (n: number) => dateKey(addDays(NOW, n));

describe('taskGroup', () => {
  it('range une tâche faite dans « terminé », quelle que soit sa date', () => {
    expect(taskGroup(task({ id: 'a', date: jour(30), done: true }), 'mon', NOW)).toBe('done');
  });

  /* Une tâche en retard ne doit disparaître nulle part : elle remonte dans le
     jour courant, qui est le premier endroit qu'on regarde. */
  it('remonte une tâche en retard dans « aujourd’hui »', () => {
    expect(taskGroup(task({ id: 'a', date: jour(-4) }), 'mon', NOW)).toBe('today');
    expect(taskGroup(task({ id: 'b', date: jour(0) }), 'mon', NOW)).toBe('today');
  });

  it('distingue demain du reste de la semaine', () => {
    expect(taskGroup(task({ id: 'a', date: jour(1) }), 'mon', NOW)).toBe('tomorrow');
    expect(taskGroup(task({ id: 'b', date: jour(2) }), 'mon', NOW)).toBe('week');
  });

  /* Le piège de la vue : « cette semaine » dépend de `Settings.weekStart`.
     Le 5 août 2026 est un mercredi — la semaine du lundi finit le dimanche 9,
     celle du dimanche finit le samedi 8. Le 9 change donc de groupe. */
  it('borne « cette semaine » selon le premier jour de la semaine', () => {
    const dimanche9 = task({ id: 'd', date: '2026-08-09' });
    expect(taskGroup(dimanche9, 'mon', NOW)).toBe('week');
    expect(taskGroup(dimanche9, 'sun', NOW)).toBe('later');
  });

  it('renvoie « plus tard » au-delà de la semaine courante', () => {
    expect(taskGroup(task({ id: 'a', date: jour(20) }), 'mon', NOW)).toBe('later');
  });
});

describe('groupTasks', () => {
  it('trie par date, puis par priorité décroissante', () => {
    const groupes = groupTasks(
      [
        task({ id: 'basse', date: jour(0), priority: 1 }),
        task({ id: 'haute', date: jour(0), priority: 3 }),
        task({ id: 'hier', date: jour(-1), priority: 1 }),
      ],
      'mon',
      NOW,
    );
    expect(groupes.today.map((t) => t.id)).toEqual(['hier', 'haute', 'basse']);
  });

  it('rend les cinq groupes, même vides', () => {
    expect(Object.keys(groupTasks([], 'mon', NOW))).toEqual([
      'today',
      'tomorrow',
      'week',
      'later',
      'done',
    ]);
  });
});

describe('subTaskCount', () => {
  it('ne compte rien quand il n’y a pas de sous-tâche', () => {
    expect(subTaskCount(task({ id: 'a', date: jour(0) }))).toBeNull();
  });

  it('compte les sous-tâches faites', () => {
    const t = task({
      id: 'a',
      date: jour(0),
      subTasks: [
        { label: 'x', done: true },
        { label: 'y', done: false },
      ],
    });
    expect(subTaskCount(t)).toEqual({ done: 1, total: 2 });
  });
});
