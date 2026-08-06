import type { Habit } from './types';
import { addDays, dateKey, dow, today } from './date';

/** Objectif du jour, selon le type. Porté de tgt(). */
export function dailyTarget(h: Habit): number {
  if (h.goal.kind === 'list') return h.subItems.length || 1;
  if (h.goal.kind === 'total') return h.goal.step || 1;
  return h.goal.target || 1;
}

/** L'habitude est-elle planifiée ce jour-là ? Porté de sched_(). */
export function isScheduled(h: Habit, d: Date, now: Date = today()): boolean {
  if (h.archived) return false;
  const k = dateKey(d);
  if (h.start && k < h.start) return false;
  if (h.end && k > h.end) return false;
  if (h.pause?.from && h.pause?.to && k >= h.pause.from && k <= h.pause.to) return false;

  const mode = h.mode || 'dow';
  if (mode === 'every') {
    const base = h.start ? new Date(`${h.start}T00:00:00`) : addDays(now, -182);
    const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    return diff >= 0 && diff % Math.max(1, h.interval || 2) === 0;
  }
  if (mode === 'week' || mode === 'month') return true;
  return (h.days || []).includes(dow(d));
}
