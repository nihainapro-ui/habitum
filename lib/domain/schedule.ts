import type { Habit } from './types';
import { dateKey, dow, parseKey, today } from './date';

/** Origine de repli du mode 'every' quand ni `start` ni `createdAt` ne sont
 *  exploitables. Valeur FIGÉE : l'origine d'un cycle ne doit jamais dépendre
 *  du jour où on la calcule (D16). Antérieure à tout usage du produit. */
export const EVERY_EPOCH = '2020-01-01';

/** Objectif du jour, selon le type. Porté de tgt(). */
export function dailyTarget(h: Habit): number {
  if (h.goal.kind === 'list') return h.subItems.length || 1;
  if (h.goal.kind === 'total') return h.goal.step || 1;
  return h.goal.target || 1;
}

/** L'habitude est-elle planifiée ce jour-là ? Porté de sched_().
 *
 *  `now` n'est plus lu depuis la correction de D16 : la planification d'une
 *  date donnée ne dépend plus du jour où on la calcule. Le paramètre est
 *  conservé — la signature est appelée partout dans le domaine, et son
 *  inutilité est précisément ce que vérifie le test « planification stable ». */
export function isScheduled(h: Habit, d: Date, _now: Date = today()): boolean {
  if (h.archived) return false;
  const k = dateKey(d);
  if (h.start && k < h.start) return false;
  if (h.end && k > h.end) return false;
  if (h.pause?.from && h.pause?.to && k >= h.pause.from && k <= h.pause.to) return false;

  const mode = h.mode || 'dow';
  if (mode === 'every') {
    /* D16 — l'origine du cycle doit être STABLE. Le prototype prenait
       `aujourd'hui − 182 jours` en l'absence de `start` : l'origine avançant
       avec le jour courant, la parité du cycle basculait tous les jours, et
       une habitude « tous les 2 jours » changeait de jours planifiés
       quotidiennement. On ancre sur `start`, à défaut sur la création de
       l'habitude, à défaut sur une époque figée. */
    const anchor = h.start || (h.createdAt ? dateKey(new Date(h.createdAt)) : '') || EVERY_EPOCH;
    const base = parseKey(anchor);
    if (!base) return false;
    const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    return diff >= 0 && diff % Math.max(1, h.interval || 2) === 0;
  }
  if (mode === 'week' || mode === 'month') return true;
  return (h.days || []).includes(dow(d));
}
