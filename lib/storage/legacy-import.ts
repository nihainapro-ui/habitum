import { HABIT_GOAL_KINDS, GOAL_KINDS, type DateKey } from '@/lib/domain';

/* Importeur du format d'export du prototype :
   { app:'Habitum', exported, v, habits, tasks, log, ov, notes, obj, sessions, shop }
   `log` (ou `ov`) = { 'habitId|YYYY-MM-DD': number }.

   ⚠ PIÈGE DÉJÀ PAYÉ : une liste blanche incomplète de types d'objectif fait
   disparaître silencieusement des habitudes ET leur historique. Les deux listes
   ci-dessous viennent de lib/domain/types.ts — ne jamais les redéclarer à la main. */

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export interface ImportReport {
  read: number;
  kept: number;
  dropped: string[];
}

const LOG_KEY_RE = /^[^|]+\|\d{4}-\d{2}-\d{2}$/;

export function isValidLogKey(k: string): boolean {
  return LOG_KEY_RE.test(k);
}

export function isKnownHabitGoalKind(k: unknown): boolean {
  return typeof k === 'string' && (HABIT_GOAL_KINDS as readonly string[]).includes(k);
}

export function isKnownGoalKind(k: unknown): boolean {
  return typeof k === 'string' && (GOAL_KINDS as readonly string[]).includes(k);
}

/** Convertit l'objet `ov` du prototype en lignes de la table `logs`. */
export function toLogRows(ov: Record<string, number>): {
  habitId: string;
  date: DateKey;
  value: number;
}[] {
  return Object.entries(ov)
    .filter(([k, v]) => isValidLogKey(k) && typeof v === 'number' && v >= 0)
    .map(([k, value]) => {
      const i = k.indexOf('|');
      return { habitId: k.slice(0, i), date: k.slice(i + 1), value };
    });
}
