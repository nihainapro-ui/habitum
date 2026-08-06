import type { Goal, Habit, LogIndex } from './types';
import { addDays, daysBetween, parseKey, today } from './date';
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
  return Math.max(0, Math.min(1, (now.getTime() - start.getTime()) / (due.getTime() - start.getTime())));
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
