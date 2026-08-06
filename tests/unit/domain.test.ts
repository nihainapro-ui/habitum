import { describe, expect, it } from 'vitest';
import {
  bestStreak,
  completionRate,
  currentStreak,
  dailyTarget,
  dateKey,
  addDays,
  isDone,
  isScheduled,
  logKey,
  type Habit,
  type LogIndex,
} from '@/lib/domain';

/* Ces cas sont le noyau dur : le type 'limit' et la tolérance du jour courant
   sont les deux règles les plus faciles à casser au portage.
   Le jeu complet de 62 valeurs de référence est dans tests/fixtures/golden.json
   et reste vérifié par public/prototype/tests/domain.test.html. */

const NOW = new Date(2026, 7, 5); // 5 août 2026, mercredi — date figée

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Test',
  category: 'health',
  goal: { kind: 'check', target: 1, step: 1, unit: '' },
  mode: 'dow',
  days: [0, 1, 2, 3, 4, 5, 6],
  subItems: [],
  reminders: [],
  archived: false,
  note: '',
  createdAt: '',
  updatedAt: '',
  ...over,
});

const logOf = (h: Habit, entries: Record<string, number>): LogIndex =>
  new Map(Object.entries(entries).map(([d, v]) => [logKey(h.id, d), v]));

describe('isScheduled', () => {
  it('respecte les bornes start / end', () => {
    const h = habit({ start: '2026-08-01', end: '2026-08-04' });
    expect(isScheduled(h, new Date(2026, 6, 31), NOW)).toBe(false);
    expect(isScheduled(h, new Date(2026, 7, 2), NOW)).toBe(true);
    expect(isScheduled(h, NOW, NOW)).toBe(false);
  });

  it('exclut une habitude archivée', () => {
    expect(isScheduled(habit({ archived: true }), NOW, NOW)).toBe(false);
  });

  it("suit les jours de semaine (0 = lundi)", () => {
    const h = habit({ days: [0, 2, 4] });
    expect(isScheduled(h, NOW, NOW)).toBe(true); // mercredi = 2
    expect(isScheduled(h, addDays(NOW, 1), NOW)).toBe(false); // jeudi = 3
  });
});

describe("isDone — les sept types d'objectif", () => {
  it("'limit' est inversé et n'est jamais réussi d'avance", () => {
    const h = habit({ goal: { kind: 'limit', target: 2, step: 1, unit: '' } });
    const hier = addDays(NOW, -1);
    expect(isDone(logOf(h, { [dateKey(hier)]: 1 }), h, hier, NOW)).toBe(true);
    expect(isDone(logOf(h, { [dateKey(hier)]: 5 }), h, hier, NOW)).toBe(false);
    // aujourd'hui, sans entrée : pas encore réussi
    expect(isDone(new Map(), h, NOW, NOW)).toBe(false);
    expect(isDone(logOf(h, { [dateKey(NOW)]: 1 }), h, NOW, NOW)).toBe(true);
  });

  it("'exact' exige l'égalité, 'total' un simple dépassement de zéro", () => {
    const exact = habit({ goal: { kind: 'exact', target: 3, step: 1, unit: '' } });
    expect(isDone(logOf(exact, { [dateKey(NOW)]: 3 }), exact, NOW, NOW)).toBe(true);
    expect(isDone(logOf(exact, { [dateKey(NOW)]: 4 }), exact, NOW, NOW)).toBe(false);

    const total = habit({ goal: { kind: 'total', target: 0, step: 10, unit: 'p' } });
    expect(isDone(logOf(total, { [dateKey(NOW)]: 1 }), total, NOW, NOW)).toBe(true);
  });

  it("'list' cible le nombre de sous-éléments", () => {
    const h = habit({
      goal: { kind: 'list', target: 0, step: 1, unit: '' },
      subItems: [{ label: 'a' }, { label: 'b' }],
    });
    expect(dailyTarget(h)).toBe(2);
    expect(isDone(logOf(h, { [dateKey(NOW)]: 2 }), h, NOW, NOW)).toBe(true);
  });
});

describe('séries', () => {
  const h = habit();
  const streakLog = (n: number) =>
    logOf(
      h,
      Object.fromEntries(Array.from({ length: n }, (_, i) => [dateKey(addDays(NOW, -1 - i)), 1])),
    );

  it('le jour courant non fait ne casse pas la série', () => {
    expect(currentStreak(streakLog(3), h, NOW)).toBe(3);
  });

  it('le record est au moins égal à la série en cours', () => {
    const log = streakLog(5);
    expect(bestStreak(log, h, NOW)).toBeGreaterThanOrEqual(currentStreak(log, h, NOW));
  });
});

describe('completionRate', () => {
  it('exclut les jours futurs du dénominateur', () => {
    const h = habit();
    const log = logOf(h, { [dateKey(NOW)]: 1, [dateKey(addDays(NOW, -1))]: 1 });
    expect(completionRate(log, h, 2, NOW)).toBe(100);
  });
});
