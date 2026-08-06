import { describe, expect, it } from 'vitest';
import golden from '@/tests/fixtures/golden.json';
import {
  addDays,
  bestStreak,
  completionRate,
  currentStreak,
  dailyTarget,
  dayRatio,
  focusMinutes,
  isDone,
  isScheduled,
  sumValues,
} from '@/lib/domain';
import {
  DEMO_NOW,
  demoHabits,
  demoLogIndex,
  demoSessions,
  demoTasks,
} from '@/tests/fixtures/demo-seed';

/* Les 62 valeurs de référence SONT la spécification (CLAUDE.md § 4).
   Elles n'étaient jusqu'ici comparées que par le harnais navigateur du
   prototype (public/prototype/tests/domain.test.html) : côté portage
   TypeScript, rien ne les vérifiait (défaut D4 de l'audit).

   Un écart signale une erreur du portage ou du fixture — JAMAIS une erreur de
   golden.json, qu'il est interdit de modifier pour faire passer un test. */

interface HabitGolden {
  target: number;
  streak: number;
  best: number;
  pct7: number;
  pct30: number;
  pct90: number;
  sum30: number;
  scheduledToday: boolean;
  doneToday: boolean;
}

const reference = golden as unknown as Record<string, HabitGolden | number | string | boolean> & {
  _meta: { fixedDate: string; habits: number };
};

const habits = demoHabits();
const tasks = demoTasks();
const sessions = demoSessions();
const log = demoLogIndex();

describe('golden.json — métadonnées', () => {
  it('porte la date figée du dossier et six habitudes', () => {
    expect(reference._meta.fixedDate).toBe('2026-08-05');
    expect(reference._meta.habits).toBe(6);
    expect(habits).toHaveLength(6);
  });
});

describe('golden.json — les six habitudes, neuf mesures chacune', () => {
  for (const h of demoHabits()) {
    const attendu = reference[`habit.${h.id}`] as HabitGolden;

    describe(h.id, () => {
      it('existe dans les valeurs de référence', () => {
        expect(attendu, `habit.${h.id} absent de golden.json`).toBeDefined();
      });
      it('target', () => expect(dailyTarget(h)).toBe(attendu.target));
      it('streak', () => expect(currentStreak(log, h, DEMO_NOW)).toBe(attendu.streak));
      it('best', () => expect(bestStreak(log, h, DEMO_NOW)).toBe(attendu.best));
      it('pct7', () => expect(completionRate(log, h, 7, DEMO_NOW)).toBe(attendu.pct7));
      it('pct30', () => expect(completionRate(log, h, 30, DEMO_NOW)).toBe(attendu.pct30));
      it('pct90', () => expect(completionRate(log, h, 90, DEMO_NOW)).toBe(attendu.pct90));
      it('sum30', () => expect(sumValues(log, h, 30, DEMO_NOW)).toBe(attendu.sum30));
      it('scheduledToday', () =>
        expect(isScheduled(h, DEMO_NOW, DEMO_NOW)).toBe(attendu.scheduledToday));
      it('doneToday', () => expect(isDone(log, h, DEMO_NOW, DEMO_NOW)).toBe(attendu.doneToday));
    });
  }
});

describe('golden.json — mesures globales', () => {
  /** Les 30 journées, du jour courant vers le passé, au format « planifiés/réussis ». */
  const ratios30 = Array.from({ length: 30 }, (_, i) =>
    dayRatio(log, habits, tasks, addDays(DEMO_NOW, -i), DEMO_NOW),
  );

  it('dayRatios30', () => {
    const rendu = ratios30.map((r) => `${r.scheduled}/${r.done}`).join(' ');
    expect(rendu).toBe(reference['global.dayRatios30']);
  });

  it('perfectDays30', () => {
    const parfaites = ratios30.filter((r) => r.scheduled > 0 && r.ratio === 1).length;
    expect(parfaites).toBe(reference['global.perfectDays30']);
  });

  it('focusMin30', () =>
    expect(focusMinutes(sessions, 30, DEMO_NOW)).toBe(reference['global.focusMin30']));

  it('focusMin7', () =>
    expect(focusMinutes(sessions, 7, DEMO_NOW)).toBe(reference['global.focusMin7']));

  it('tasksOpen', () =>
    expect(tasks.filter((t) => !t.done)).toHaveLength(reference['global.tasksOpen'] as number));

  it('journalSeedIsEmpty — aucun faux contenu généré pour les jours sans note (E2)', () =>
    expect(reference['global.journalSeedIsEmpty']).toBe(true));
});
