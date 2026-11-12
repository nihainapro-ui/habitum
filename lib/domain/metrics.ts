import type { Habit, LogIndex, Session, Task } from './types';
import { logKey } from './types';
import { addDays, dateKey, today } from './date';
import { occurrenceKey } from './recurrence';
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
export function completionRate(
  log: LogIndex,
  h: Habit,
  window: number,
  now: Date = today(),
): number {
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
  /** Occurrences de tâches récurrentes accomplies (`occ`, tâche 5.6) : sans
   *  elles, une tâche quotidienne cochée quitterait la journée où elle a été
   *  faite, et l'anneau du jour perdrait ce qu'on venait d'y mettre. */
  occ: ReadonlySet<string> = new Set(),
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
    const accomplie = t.recurrence ? occ.has(occurrenceKey(t.id, k)) : false;
    if (t.date !== k && !accomplie) continue;
    scheduled++;
    if (accomplie || t.done) done++;
  }
  return { scheduled, done, ratio: scheduled ? done / scheduled : 0 };
}

/** Minutes de focus sur une fenêtre. Agrège les sessions RÉELLEMENT enregistrées :
 *  ne jamais réintroduire de génération (défaut E1 corrigé au lot 2). */
export function focusMinutes(
  sessions: readonly Session[],
  window: number,
  now: Date = today(),
): number {
  let m = 0;
  const from = dateKey(addDays(now, -window + 1));
  const to = dateKey(now);
  for (const s of sessions) {
    if (s.date >= from && s.date <= to) m += Number(s.minutes) || 0;
  }
  return m;
}

/** Nombre de jours pour lesquels une habitude a une entrée de journal.
 *
 *  Sert à la confirmation de suppression — « Supprimer et 84 jours
 *  d'historique ? » — qui doit dire un chiffre RÉEL (CLAUDE.md § 3) : une
 *  habitude jamais cochée annonce 0 jour, pas une estimation. Une entrée à
 *  zéro compte : « passée » est une information écrite, pas une absence. */
export function nbJoursJournalises(log: LogIndex, habitId: string): number {
  const prefixe = `${habitId}|`;
  let n = 0;
  for (const cle of log.keys()) if (cle.startsWith(prefixe)) n++;
  return n;
}

/** État d'une journée pour le trait du calendrier mobile (PDF p. 9) :
 *  complet / partiel / manqué, ou rien.
 *
 *  `none` couvre deux cas qui ne doivent PAS se dire « manqué » : un jour où
 *  rien n'était planifié, et un jour à venir — on ne peut pas avoir manqué
 *  demain. Le jour courant sans rien de fait n'est pas manqué non plus : il
 *  n'est pas fini (même tolérance que la série). */
export type EtatJour = 'none' | 'missed' | 'partial' | 'complete';

export function etatJour(r: DayRatio, d: Date, now: Date = today()): EtatJour {
  if (r.scheduled === 0 || d > now) return 'none';
  if (r.ratio >= 1) return 'complete';
  if (r.ratio > 0) return 'partial';
  return dateKey(d) === dateKey(now) ? 'none' : 'missed';
}

export interface ResumeSemaine {
  complets: number;
  partiels: number;
  manques: number;
}

/** « 7 derniers jours : 4 complets · 1 partiel · 1 manqué » — pied de la
 *  liste des habitudes sur téléphone (PDF p. 6). Les sept jours PASSÉS, le
 *  jour courant exclu : il n'est pas fini. Habitudes seules — les tâches
 *  ne sont pas de cette vue — et archivées exclues par `dayRatio`. Un jour
 *  où rien n'était planifié (`none`) ne compte nulle part : ce n'est pas un
 *  échec. */
export function resumeSemaine(
  log: LogIndex,
  habits: readonly Habit[],
  now: Date = today(),
): ResumeSemaine {
  const r: ResumeSemaine = { complets: 0, partiels: 0, manques: 0 };
  for (let i = 7; i >= 1; i--) {
    const d = addDays(now, -i);
    const etat = etatJour(dayRatio(log, habits, [], d, now), d, now);
    if (etat === 'complete') r.complets++;
    else if (etat === 'partial') r.partiels++;
    else if (etat === 'missed') r.manques++;
  }
  return r;
}

/** La plus longue série EN COURS, toutes habitudes confondues — la « série
 *  6 j » de la synthèse du tableau de bord mobile. Distincte du record
 *  (`bestStreakOverall`), qui regarde le passé. */
export function longestCurrentStreak(
  log: LogIndex,
  habits: readonly Habit[],
  now: Date = today(),
): number {
  return habits.reduce((max, h) => Math.max(max, currentStreak(log, h, now)), 0);
}
