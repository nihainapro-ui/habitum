import type { DateKey, Goal, Habit, LogIndex } from './types';
import { addDays, dateKey, daysBetween, parseKey, today } from './date';
import { isDone } from './metrics';
import { sumValues } from './metrics';
import { isScheduled } from './schedule';

export interface GoalProgress {
  current: number;
  total: number;
  percent: number;
  unit: string;
}

/** Fenêtre d'agrégation d'un objectif cumulatif (bornée 1–400 jours). */
export function goalWindow(g: Goal, now: Date = today()): number {
  const start = parseKey(g.start);
  if (!start) return 30;
  return Math.max(1, Math.min(400, daysBetween(now, start) + 1));
}

export function goalDaysLeft(g: Goal, now: Date = today()): number | null {
  const due = parseKey(g.deadline);
  return due ? daysBetween(due, now) : null;
}

/** Part du temps écoulé entre début et échéance (0–1) ; 0.5 si indéterminable. */
export function goalElapsed(g: Goal, now: Date = today()): number {
  const start = parseKey(g.start);
  const due = parseKey(g.deadline);
  if (!start || !due || due <= start) return 0.5;
  return Math.max(
    0,
    Math.min(1, (now.getTime() - start.getTime()) / (due.getTime() - start.getTime())),
  );
}

/** Avancement. Porté de objCalc() — 'reduce' compte les ÉCHECS, d'où le 1 - cur/tot. */
export function goalProgress(
  g: Goal,
  habits: readonly Habit[],
  log: LogIndex,
  now: Date = today(),
): GoalProgress {
  const habit = g.sourceHabitId ? habits.find((h) => h.id === g.sourceHabitId) : undefined;
  let current = 0;
  let total = Math.max(1, g.target || 1);
  let unit = g.unit ?? '';

  if (g.kind === 'milestones') {
    const ms = g.milestones ?? [];
    current = ms.filter((m) => m.done).length;
    total = Math.max(1, ms.length);
    unit = '';
  } else if (g.kind === 'reduce') {
    const win = g.window ?? 90;
    let d = addDays(now, -win + 1);
    for (let i = 0; i < win; i++) {
      if (habit && isScheduled(habit, d, now) && d <= now && !isDone(log, habit, d, now)) current++;
      d = addDays(d, 1);
    }
  } else {
    current = habit ? sumValues(log, habit, goalWindow(g, now), now) : (g.current ?? 0);
  }

  const percent =
    g.kind === 'reduce'
      ? Math.max(0, Math.min(100, Math.round(100 * (1 - current / total))))
      : Math.min(100, Math.round((current / total) * 100));

  return { current, total, percent, unit };
}

/* ============================================================================
   Ce que le prototype n'avait pas — plan 5 § 5.7.

   Trois questions qu'un objectif doit savoir répondre : à quel rythme faut-il
   avancer, suis-je en avance ou en retard, et à quoi ressemble le chemin
   parcouru.
   ========================================================================= */

/** Rythme restant à tenir, par jour, pour un objectif CUMULATIF.
 *
 *  `null` quand la question n'a pas de sens : pas d'échéance, échéance
 *  dépassée, objectif atteint — ou objectif à jalons / à réduction, dont
 *  l'avancement ne se répartit pas en portions journalières. Rendre 0 dans ces
 *  cas laisserait croire qu'il n'y a plus rien à faire. */
export function requiredPace(
  g: Goal,
  habits: readonly Habit[],
  log: LogIndex,
  now: Date = today(),
): number | null {
  if (g.kind !== 'cumul') return null;

  const restant = goalDaysLeft(g, now);
  if (restant === null || restant <= 0) return null;

  const { current, total } = goalProgress(g, habits, log, now);
  const manque = total - current;
  if (manque <= 0) return null;

  return Math.round((manque / restant) * 100) / 100;
}

export type GoalStatus = 'done' | 'ahead' | 'ontime' | 'late' | 'over';

/** Marge de tolérance autour du rythme théorique, en points de pourcentage.
 *  Sans elle, un objectif oscillerait entre « en avance » et « en retard » à
 *  chaque journée — un statut qui change tous les jours n'informe personne. */
const MARGE = 5;

/** Où en est l'objectif par rapport au temps écoulé.
 *  `over` (échéance dépassée sans être atteint) est distinct de `late` : l'un
 *  se rattrape, l'autre non. */
export function goalStatus(
  g: Goal,
  habits: readonly Habit[],
  log: LogIndex,
  now: Date = today(),
): GoalStatus {
  const { percent } = goalProgress(g, habits, log, now);
  if (percent >= 100) return 'done';

  const restant = goalDaysLeft(g, now);
  if (restant !== null && restant < 0) return 'over';

  const attendu = goalElapsed(g, now) * 100;
  if (percent < attendu - MARGE) return 'late';
  if (percent > attendu + MARGE) return 'ahead';
  return 'ontime';
}

export interface PointCourbe {
  date: DateKey;
  percent: number;
}

/** Courbe d'avancement : l'avancement recalculé à `points` dates réparties
 *  entre le début et aujourd'hui.
 *
 *  Chaque point rejoue `goalProgress` À CETTE DATE-LÀ — la courbe n'est donc
 *  jamais une interpolation entre deux bornes, mais la mesure réelle du
 *  chemin. C'est plus coûteux, et c'est la seule façon de ne rien inventer. */
export function goalTrail(
  g: Goal,
  habits: readonly Habit[],
  log: LogIndex,
  points: number,
  now: Date = today(),
): PointCourbe[] {
  const n = Math.max(2, Math.min(60, Math.floor(points)));
  const debut = parseKey(g.start) ?? addDays(now, -30);
  const etendue = Math.max(1, daysBetween(now, debut));

  const courbe: PointCourbe[] = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(debut, Math.round((etendue * i) / (n - 1)));
    courbe.push({ date: dateKey(d), percent: goalProgress(g, habits, log, d).percent });
  }
  return courbe;
}
