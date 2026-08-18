import { describe, expect, it } from 'vitest';
import reference from '@/tests/fixtures/golden.json';
import {
  bestStreakOverall,
  categoryBreakdown,
  daysBack,
  daysOfMonth,
  globalScore,
  habitRanking,
  perfectDays,
  splitHeuresMinutes,
} from '@/lib/domain';
import type { Habit } from '@/lib/domain';
import { DEMO_NOW, demoHabits, demoLogIndex, demoTasks } from '@/tests/fixtures/demo-seed';

/* Les agrégats de la vue Statistiques se testent contre l'ORACLE, pas contre
   eux-mêmes : `global.dayRatios30` donne la suite exacte des trente derniers
   jours, dont le score global et les journées parfaites se déduisent. */

const habits = demoHabits();
const tasks = demoTasks();
const log = demoLogIndex();

/** « 8/4 5/5 … » — prévu/fait, du plus récent au plus ancien. */
const paires = String(reference['global.dayRatios30'])
  .split(' ')
  .map((p) => p.split('/').map(Number));

describe('globalScore', () => {
  it('reproduit le score déduit des 30 jours de référence', () => {
    const prevu = paires.reduce((s, [p]) => s + (p ?? 0), 0);
    const fait = paires.reduce((s, [, f]) => s + (f ?? 0), 0);
    const attendu = Math.round((fait / prevu) * 100);

    expect(globalScore(log, habits, tasks, 30, DEMO_NOW)).toBe(attendu);
  });

  it('rend 0 quand rien n’est prévu', () => {
    expect(globalScore(new Map(), [], [], 30, DEMO_NOW)).toBe(0);
  });
});

describe('perfectDays', () => {
  it('reproduit les journées parfaites de référence', () => {
    expect(perfectDays(log, habits, tasks, 30, DEMO_NOW)).toBe(reference['global.perfectDays30']);
  });

  it('ne compte pas une journée vide comme parfaite', () => {
    expect(perfectDays(new Map(), [], [], 30, DEMO_NOW)).toBe(0);
  });
});

describe('daysBack', () => {
  it('rend la fenêtre dans l’ordre chronologique, la plus récente en dernier', () => {
    const jours = daysBack(log, habits, tasks, 30, DEMO_NOW);
    expect(jours).toHaveLength(30);
    expect(jours[29]?.key).toBe('2026-08-05');
    expect(jours[0]?.key).toBe('2026-07-07');
  });

  it('reproduit prévu/fait de chaque jour de référence', () => {
    const jours = daysBack(log, habits, tasks, 30, DEMO_NOW);
    /* `dayRatios30` va du plus récent au plus ancien : on le retourne. */
    const attendu = [...paires].reverse();
    expect(jours.map((j) => [j.scheduled, j.done])).toEqual(attendu);
  });
});

describe('daysOfMonth', () => {
  it('couvre le mois entier et marque les jours à venir', () => {
    const jours = daysOfMonth(log, habits, tasks, DEMO_NOW);
    expect(jours).toHaveLength(31); // août
    expect(jours[4]?.future).toBe(false); // le 5
    expect(jours[5]?.future).toBe(true); // le 6
    expect(jours[5]?.scheduled).toBe(0);
  });
});

describe('bestStreakOverall', () => {
  it('rend le meilleur record de toutes les habitudes', () => {
    const attendu = Math.max(
      ...(['alc', 'water', 'read', 'run', 'med', 'film'] as const).map(
        (id) => reference[`habit.${id}`].best,
      ),
    );
    expect(bestStreakOverall(log, habits, DEMO_NOW)).toBe(attendu);
  });
});

describe('habitRanking', () => {
  it('classe par taux décroissant', () => {
    const classement = habitRanking(log, habits, 30, DEMO_NOW);
    expect(classement).toHaveLength(6);
    const taux = classement.map((l) => l.pct);
    expect([...taux].sort((a, b) => b - a)).toEqual(taux);
  });

  it('reprend les taux de référence sans les recalculer autrement', () => {
    const classement = habitRanking(log, habits, 30, DEMO_NOW);
    const alc = classement.find((l) => l.habit.id === 'alc');
    expect(alc?.pct).toBe(reference['habit.alc'].pct30);
    expect(alc?.best).toBe(reference['habit.alc'].best);
  });
});

describe('categoryBreakdown', () => {
  it('rend les six catégories, la plus tenue en tête', () => {
    const parts = categoryBreakdown(log, habits, 30, DEMO_NOW);
    expect(parts).toHaveLength(6);
    const taux = parts.map((p) => p.pct);
    expect([...taux].sort((a, b) => b - a)).toEqual(taux);
  });

  it('rend 0 pour une catégorie sans habitude, jamais NaN', () => {
    const parts = categoryBreakdown(log, habits, 30, DEMO_NOW);
    const vide = parts.find((p) => p.count === 0);
    expect(vide?.pct).toBe(0);
  });
});

describe('splitHeuresMinutes', () => {
  it('découpe les minutes de référence en heures et minutes', () => {
    expect(splitHeuresMinutes(reference['global.focusMin30'])).toEqual({ h: 2, m: 18 });
  });

  it('ne descend jamais sous zéro', () => {
    expect(splitHeuresMinutes(-10)).toEqual({ h: 0, m: 0 });
  });
});

/* ============================================================================
   Budget de calcul de la carte de chaleur — tâche 8.5.

   Le plan fixe « Heatmap 6 mois, 200 habitudes : rendu < 300 ms ». Ce budget se
   mesure ICI, et non dans le navigateur, pour une raison de méthode : ouvrir
   `/app/stats` chronomètre une navigation complète — routage, hydratation,
   réhydratation du store, PUIS le calcul de la carte. On relevait 570 ms et on
   en aurait conclu que la carte est lente, alors qu'on avait mesuré une
   ouverture de page (le test e2e la mesure toujours, contre le budget
   d'ouverture, qui est le sien).

   Ce que « rendu » recouvre réellement pour cette carte, c'est `daysBack` sur
   182 jours × 200 habitudes : 36 400 évaluations de planification. Les 182
   `<span>` du DOM ne pèsent rien à côté.
   ========================================================================= */
describe('carte de chaleur à la charge du plan', () => {
  it('182 jours × 200 habitudes se calculent en moins de 300 ms', () => {
    const NB_HABITUDES = 200;
    const JOURS = 182;

    const lourdes: Habit[] = Array.from({ length: NB_HABITUDES }, (_, i) => ({
      id: `c${i}`,
      name: `Habitude ${i}`,
      category: 'health',
      goal: { kind: 'check', target: 1, step: 1, unit: '' },
      mode: 'dow',
      days: [0, 1, 2, 3, 4, 5, 6],
      subItems: [],
      reminders: [],
      archived: false,
      note: '',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    }));

    /* Un journal PLEIN sur la fenêtre : une carte calculée sur des cases vides
       sauterait le travail qu'on veut justement mesurer. */
    const journal = new Map<string, number>();
    for (let i = 0; i < NB_HABITUDES; i++) {
      for (let j = 0; j < JOURS; j++) {
        const d = new Date(DEMO_NOW);
        d.setDate(d.getDate() - j);
        const cle = `c${i}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        journal.set(cle, 1);
      }
    }

    const depart = performance.now();
    const jours = daysBack(journal, lourdes, [], JOURS, DEMO_NOW);
    const duree = performance.now() - depart;

    expect(jours).toHaveLength(JOURS);
    /* Le premier jour de la fenêtre doit être réellement agrégé : un calcul qui
       rendrait 182 cases vides tiendrait n'importe quel budget. */
    expect(jours[JOURS - 1]?.scheduled).toBe(NB_HABITUDES);

    expect(Math.round(duree), `carte calculée en ${Math.round(duree)} ms`).toBeLessThan(300);
  });
});
