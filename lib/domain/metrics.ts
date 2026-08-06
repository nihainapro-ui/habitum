import type { Habit, LogIndex, Session, Task } from './types';
import { logKey } from './types';
import { addDays, dateKey, today } from './date';
import { dailyTarget, isScheduled } from './schedule';

export const N_STREAK = 420;
export const N_BEST = 365;

/** Valeur journalisée (0 si rien n'a été saisi). Porté de val_(). */
export const loggedValue = (log: LogIndex, h: Habit, d: Date): number =>
  log.get(logKey(h.id, dateKey(d))) ?? 0;

/** Objectif atteint ce jour-là. Porté de isDone_().
 *  ⚠ 'limit' a une sémantique INVERSÉE et un cas particulier sur le jour courant :
 *  on ne peut pas déclarer un plafond réussi avant la fin de la journée. */
export function isDone(log: LogIndex, h: Habit, d: Date, now: Date = today()): boolean {
  const v = loggedValue(log, h, d);
  const t = dailyTarget(h);
  switch (h.goal.kind) {
    case 'limit': {
      const raw = log.get(logKey(h.id, dateKey(d)));
      if (d >= now && raw === undefined) return false;
      return v <= t;
    }
    case 'exact':
      return v === t;
    case 'total':
      return v > 0;
    default:
      return v >= t;
  }
}

/** Série en cours, en jours planifiés consécutifs. Porté de streak_().
 *  Le jour courant non encore fait ne casse pas la série. */
export function currentStreak(log: LogIndex, h: Habit, now: Date = today()): number {
  let n = 0;
  let d = now;
  if (isScheduled(h, d, now) && !isDone(log, h, d, now)) d = addDays(d, -1);
  for (let i = 0; i < N_STREAK; i++) {
    if (isScheduled(h, d, now)) {
      if (isDone(log, h, d, now)) n++;
      else break;
    }
    d = addDays(d, -1);
  }
  return n;
}

/** Record sur 365 jours. Porté de best_(). Coûteux : à mettre en cache dérivé. */
export function bestStreak(log: LogIndex, h: Habit, now: Date = today()): number {
  let n = 0;
  let max = 0;
  let d = addDays(now, -N_BEST);
  for (let i = 0; i <= N_BEST; i++) {
    if (isScheduled(h, d, now)) {
      if (isDone(log, h, d, now)) {
        n++;
        if (n > max) max = n;
      } else n = 0;
    }
    d = addDays(d, 1);
  }
  return Math.max(max, currentStreak(log, h, now));
}

/** Taux de réussite sur une fenêtre glissante, en %. Jours futurs exclus. */
export function completionRate(log: LogIndex, h: Habit, window: number, now: Date = today()): number {
  let scheduled = 0;
  let done = 0;
  let d = addDays(now, -window + 1);
  for (let i = 0; i < window; i++) {
    if (isScheduled(h, d, now) && d <= now) {
      scheduled++;
      if (isDone(log, h, d, now)) done++;
    }
    d = addDays(d, 1);
  }
  return scheduled ? Math.round((done / scheduled) * 100) : 0;
}

/** Cumul des valeurs journalisées sur une fenêtre glissante. */
export function sumValues(log: LogIndex, h: Habit, window: number, now: Date = today()): number {
  let s = 0;
  let d = addDays(now, -window + 1);
  for (let i = 0; i < window; i++) {
    s += loggedValue(log, h, d);
    d = addDays(d, 1);
  }
  return s;
}

export interface DayRatio {
  scheduled: number;
  done: number;
  ratio: number;
}

/** Charge et avancement d'une journée : base de la heatmap et des journées parfaites. */
export function dayRatio(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  d: Date,
  now: Date = today(),
): DayRatio {
  let scheduled = 0;
  let done = 0;
  const k = dateKey(d);
  for (const h of habits) {
    if (h.archived) continue;
    if (isScheduled(h, d, now)) {
      scheduled++;
      if (isDone(log, h, d, now)) done++;
    }
  }
  for (const t of tasks) {
    if (t.date === k) {
      scheduled++;
      if (t.done) done++;
    }
  }
  return { scheduled, done, ratio: scheduled ? done / scheduled : 0 };
}

/** Minutes de focus sur une fenêtre. Agrège les sessions RÉELLEMENT enregistrées :
 *  ne jamais réintroduire de génération (défaut E1 corrigé au lot 2). */
export function focusMinutes(sessions: readonly Session[], window: number, now: Date = today()): number {
  let m = 0;
  const from = dateKey(addDays(now, -window + 1));
  const to = dateKey(now);
  for (const s of sessions) {
    if (s.date >= from && s.date <= to) m += Number(s.minutes) || 0;
  }
  return m;
}
