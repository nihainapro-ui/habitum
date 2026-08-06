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

  it('suit les jours de semaine (0 = lundi)', () => {
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

/* D16 — la planification d'une habitude à un jour donné ne doit jamais dépendre
   du jour où on la calcule. Le prototype prenait `aujourd'hui − 182 jours`
   comme origine du cycle quand `start` était absent : l'origine avançant avec
   le jour courant, la parité du cycle basculait tous les jours.

   Aucune habitude du jeu de démonstration n'utilise ce mode — c'est ce qui a
   laissé passer le défaut, et c'est aussi pourquoi les 62 valeurs de référence
   ne bougent pas après la correction. */
describe("mode 'every' — planification stable", () => {
  const tousLes2Jours = habit({ mode: 'every', interval: 2, days: [] });

  it('donne le même résultat pour une date donnée, quel que soit le « maintenant »', () => {
    const cible = new Date(2026, 6, 15); // 15 juillet 2026
    const reference = isScheduled(tousLes2Jours, cible, NOW);
    for (const decalage of [1, 2, 3, 7, 30, 181, 365]) {
      expect(isScheduled(tousLes2Jours, cible, addDays(NOW, decalage)), `à J+${decalage}`).toBe(
        reference,
      );
    }
  });

  it("respecte l'intervalle depuis start quand start est fourni", () => {
    const h = habit({ mode: 'every', interval: 3, days: [], start: '2026-08-01' });
    expect(isScheduled(h, new Date(2026, 7, 1), NOW)).toBe(true); // J+0
    expect(isScheduled(h, new Date(2026, 7, 2), NOW)).toBe(false); // J+1
    expect(isScheduled(h, new Date(2026, 7, 3), NOW)).toBe(false); // J+2
    expect(isScheduled(h, new Date(2026, 7, 4), NOW)).toBe(true); // J+3
    expect(isScheduled(h, new Date(2026, 6, 31), NOW)).toBe(false); // avant start
  });

  it('un intervalle absent ou nul retombe sur deux jours, sans division par zéro', () => {
    const h = habit({ mode: 'every', days: [], start: '2026-08-01' });
    expect(isScheduled(h, new Date(2026, 7, 1), NOW)).toBe(true);
    expect(isScheduled(h, new Date(2026, 7, 2), NOW)).toBe(false);
    expect(isScheduled(h, new Date(2026, 7, 3), NOW)).toBe(true);
  });

  it('reste soumis aux bornes et à la pause', () => {
    const h = habit({
      mode: 'every',
      interval: 1,
      days: [],
      start: '2026-08-01',
      end: '2026-08-10',
      pause: { from: '2026-08-04', to: '2026-08-06' },
    });
    expect(isScheduled(h, new Date(2026, 7, 3), NOW)).toBe(true);
    expect(isScheduled(h, new Date(2026, 7, 5), NOW)).toBe(false); // en pause
    expect(isScheduled(h, new Date(2026, 7, 11), NOW)).toBe(false); // après end
  });
});
