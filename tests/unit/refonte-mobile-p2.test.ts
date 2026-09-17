import { describe, expect, it } from 'vitest';
import {
  aFaireMaintenant,
  ecartMois,
  etatJour,
  logKey,
  longestCurrentStreak,
  nearestGoal,
  type EntreeJour,
  type Goal,
  type Habit,
} from '@/lib/domain';

/* Briques de domaine de la refonte mobile, P2 : tableau de bord et calendrier.
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

describe('ecartMois', () => {
  it('compte les mois, année comprise', () => {
    expect(ecartMois(new Date(2026, 7, 28), NOW)).toBe(0);
    expect(ecartMois(new Date(2026, 6, 28), NOW)).toBe(-1);
    expect(ecartMois(new Date(2027, 0, 1), NOW)).toBe(5);
    expect(ecartMois(new Date(2025, 11, 31), NOW)).toBe(-8);
  });
});

describe('etatJour', () => {
  const r = (scheduled: number, done: number) => ({
    scheduled,
    done,
    ratio: scheduled ? done / scheduled : 0,
  });
  const HIER = new Date(2026, 7, 4);
  const DEMAIN = new Date(2026, 7, 6);

  it('dit complet, partiel ou manqué pour un jour passé', () => {
    expect(etatJour(r(4, 4), HIER, NOW)).toBe('complete');
    expect(etatJour(r(4, 1), HIER, NOW)).toBe('partial');
    expect(etatJour(r(4, 0), HIER, NOW)).toBe('missed');
  });

  it('ne dit RIEN d’un jour sans rien de planifié, ni d’un jour à venir', () => {
    expect(etatJour(r(0, 0), HIER, NOW)).toBe('none');
    expect(etatJour(r(4, 0), DEMAIN, NOW)).toBe('none');
  });

  it('ne déclare pas manqué le jour courant : il n’est pas fini', () => {
    expect(etatJour(r(4, 0), NOW, NOW)).toBe('none');
    expect(etatJour(r(4, 2), NOW, NOW)).toBe('partial');
  });
});

describe('longestCurrentStreak', () => {
  it('rend la plus longue série en cours, 0 sans habitude', () => {
    const a = habit({ id: 'a' });
    const b = habit({ id: 'b' });
    const log = new Map([
      [logKey('a', '2026-08-05'), 1],
      [logKey('a', '2026-08-04'), 1],
      [logKey('a', '2026-08-03'), 1],
      [logKey('b', '2026-08-05'), 1],
    ]);
    expect(longestCurrentStreak(log, [a, b], NOW)).toBe(3);
    expect(longestCurrentStreak(new Map(), [], NOW)).toBe(0);
  });
});

describe('nearestGoal', () => {
  const jalons = (id: string, faits: number, total: number): Goal =>
    ({
      id,
      name: id,
      kind: 'milestones',
      milestones: Array.from({ length: total }, (_, i) => ({ label: String(i), done: i < faits })),
      target: total,
      unit: '',
      category: 'work',
      deadline: '2026-12-31',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }) as Goal;

  it('choisit l’objectif en cours le plus avancé, jamais un objectif atteint', () => {
    const proche = nearestGoal(
      [jalons('a', 1, 4), jalons('b', 3, 4), jalons('c', 4, 4)],
      [],
      new Map(),
      NOW,
    );
    expect(proche?.goal.id).toBe('b');
    expect(proche?.progress.current).toBe(3);
  });

  it('rend null quand rien n’est en cours', () => {
    expect(nearestGoal([], [], new Map(), NOW)).toBeNull();
    expect(nearestGoal([jalons('c', 2, 2)], [], new Map(), NOW)).toBeNull();
  });
});

describe('aFaireMaintenant', () => {
  const e = (id: string, done: boolean): EntreeJour =>
    ({ kind: 'task', id, time: null, task: {} as never, done, date: '2026-08-05' }) as EntreeJour;

  it('garde les entrées non faites, dans l’ordre, cinq au plus', () => {
    const liste = [e('a', true), e('b', false), e('c', false), e('d', true), e('e', false)];
    expect(aFaireMaintenant(liste).map((x) => x.id)).toEqual(['b', 'c', 'e']);
    expect(aFaireMaintenant(liste, 2).map((x) => x.id)).toEqual(['b', 'c']);
  });
});
