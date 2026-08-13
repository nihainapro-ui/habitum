import { describe, expect, it } from 'vitest';
import {
  goalProgress,
  goalStatus,
  goalTrail,
  requiredPace,
  type Goal,
  type Habit,
  type LogIndex,
} from '@/lib/domain';
import { logKey } from '@/lib/domain';
import { demoGoals, demoHabits, demoLogIndex, DEMO_NOW } from '@/tests/fixtures/demo-seed';

/* Le prototype n'avait ni rythme requis, ni statut, ni courbe : ces trois
   fonctions sont NEUVES, elles n'ont donc pas d'oracle. Leurs tests posent la
   spécification — ce sont eux qui font foi si un jour elles changent. */

const habits = demoHabits();
const log = demoLogIndex();

const objectif = (over: Partial<Goal> & Pick<Goal, 'id' | 'kind'>): Goal => ({
  name: over.id,
  category: 'sport',
  target: 100,
  unit: 'km',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('requiredPace', () => {
  it('répartit ce qui reste sur les jours restants', () => {
    /* 100 km visés, 40 saisis à la main, échéance dans 20 jours → 3 km/jour. */
    const g = objectif({
      id: 'g',
      kind: 'cumul',
      target: 100,
      current: 40,
      deadline: '2026-08-25',
    });
    expect(requiredPace(g, [], new Map(), DEMO_NOW)).toBe(3);
  });

  it('rend null sans échéance — il n’y a alors aucun rythme à tenir', () => {
    const g = objectif({ id: 'g', kind: 'cumul', target: 100, current: 10 });
    expect(requiredPace(g, [], new Map(), DEMO_NOW)).toBeNull();
  });

  it('rend null quand la cible est atteinte, jamais 0', () => {
    const g = objectif({
      id: 'g',
      kind: 'cumul',
      target: 10,
      current: 10,
      deadline: '2026-08-25',
    });
    expect(requiredPace(g, [], new Map(), DEMO_NOW)).toBeNull();
  });

  it('rend null pour les jalons et les réductions', () => {
    const jalons = objectif({
      id: 'j',
      kind: 'milestones',
      deadline: '2026-08-25',
      milestones: [{ label: 'a', done: false }],
    });
    const reduction = objectif({ id: 'r', kind: 'reduce', target: 12, deadline: '2026-08-25' });
    expect(requiredPace(jalons, [], new Map(), DEMO_NOW)).toBeNull();
    expect(requiredPace(reduction, [], new Map(), DEMO_NOW)).toBeNull();
  });
});

describe('goalStatus', () => {
  const base = { id: 'g', kind: 'cumul' as const, start: '2026-08-01', deadline: '2026-08-11' };

  it('déclare atteint dès 100 %', () => {
    const g = objectif({ ...base, target: 10, current: 10 });
    expect(goalStatus(g, [], new Map(), DEMO_NOW)).toBe('done');
  });

  /* Le 5 août sur une fenêtre du 1er au 11 : 40 % du temps écoulé. */
  it('déclare en avance au-delà du temps écoulé', () => {
    const g = objectif({ ...base, target: 10, current: 8 }); // 80 % > 40 % + 5
    expect(goalStatus(g, [], new Map(), DEMO_NOW)).toBe('ahead');
  });

  it('déclare en retard en deçà du temps écoulé', () => {
    const g = objectif({ ...base, target: 100, current: 1 }); // 1 % < 40 % − 5
    expect(goalStatus(g, [], new Map(), DEMO_NOW)).toBe('late');
  });

  it('tolère une marge autour du rythme théorique', () => {
    const g = objectif({ ...base, target: 10, current: 4 }); // 40 %, pile
    expect(goalStatus(g, [], new Map(), DEMO_NOW)).toBe('ontime');
  });

  it('distingue une échéance dépassée d’un simple retard', () => {
    const g = objectif({
      id: 'g',
      kind: 'cumul',
      target: 100,
      current: 10,
      start: '2026-06-01',
      deadline: '2026-07-01',
    });
    expect(goalStatus(g, [], new Map(), DEMO_NOW)).toBe('over');
  });
});

describe('goalTrail', () => {
  it('rend le nombre de points demandé, du début à aujourd’hui', () => {
    const g = objectif({ id: 'g', kind: 'cumul', target: 100, current: 50, start: '2026-07-01' });
    const courbe = goalTrail(g, [], new Map(), 8, DEMO_NOW);

    expect(courbe).toHaveLength(8);
    expect(courbe[0]?.date).toBe('2026-07-01');
    expect(courbe[7]?.date).toBe('2026-08-05');
  });

  it('mesure réellement chaque point : la courbe d’un cumul croît', () => {
    /* `o1` est alimenté par l'habitude « courir » : son avancement au 1er mai
       ne peut pas dépasser celui d'aujourd'hui. */
    const o1 = demoGoals().find((g) => g.id === 'o1');
    const courbe = goalTrail(o1!, habits, log, 6, DEMO_NOW);

    const pourcentages = courbe.map((p) => p.percent);
    expect([...pourcentages].sort((a, b) => a - b)).toEqual(pourcentages);
    expect(pourcentages.at(-1)).toBe(goalProgress(o1!, habits, log, DEMO_NOW).percent);
  });

  it('ne descend jamais sous deux points', () => {
    const g = objectif({ id: 'g', kind: 'cumul', target: 10, current: 1 });
    expect(goalTrail(g, [], new Map(), 1, DEMO_NOW)).toHaveLength(2);
  });
});

describe('goalProgress — réduction', () => {
  /* Le piège de la vue : `reduce` compte les ÉCHECS. Une barre qui l'ignore
     affiche l'inverse de la réalité. */
  it('inverse le sens : moins d’échecs, plus d’avancement', () => {
    const habitude: Habit = {
      ...habits[0]!,
      id: 'ecart',
      days: [0, 1, 2, 3, 4, 5, 6],
      goal: { kind: 'check', target: 1, step: 1, unit: '' },
    };
    const g = objectif({
      id: 'r',
      kind: 'reduce',
      target: 10,
      sourceHabitId: 'ecart',
      window: 10,
      category: 'health',
    });

    /* Dix jours, aucun tenu : dix échecs sur dix tolérés → 0 %. */
    expect(goalProgress(g, [habitude], new Map(), DEMO_NOW).percent).toBe(0);

    /* Les dix jours tenus : zéro échec → 100 %. */
    const parfait: LogIndex = new Map(
      Array.from({ length: 10 }, (_, i) => {
        const d = new Date(2026, 6, 27 + i);
        const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return [logKey('ecart', cle), 1] as const;
      }),
    );
    expect(goalProgress(g, [habitude], parfait, DEMO_NOW).percent).toBe(100);
  });
});
