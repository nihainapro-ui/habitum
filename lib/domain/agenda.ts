import type { DateKey, Habit, LogIndex, Task } from './types';
import { addDays, dateKey, startOfWeek, today, type WeekStart } from './date';
import { isDone, loggedValue } from './metrics';
import { dailyTarget, isScheduled } from './schedule';

/* Liste unifiée d'une journée — habitudes planifiées et tâches datées, triées
   par heure. Le prototype affichait deux blocs successifs (habitudes, puis
   tâches) ; la spécification demande une file d'exécution unique, ordonnée par
   l'heure : c'est l'ordre dans lequel la journée se vit. */

export interface EntreeHabitude {
  kind: 'habit';
  id: string;
  /** Heure du premier rappel, s'il y en a un — `h.time` du prototype. */
  time: string | null;
  habit: Habit;
  done: boolean;
  value: number;
  target: number;
}

export interface EntreeTache {
  kind: 'task';
  id: string;
  time: string | null;
  task: Task;
  done: boolean;
}

export type EntreeJour = EntreeHabitude | EntreeTache;

/** Heure d'ancrage d'une habitude : son premier rappel, sinon aucune.
 *  Le modèle cible n'a pas de champ `time` sur l'habitude — le prototype s'en
 *  servait à la fois pour l'ordre et pour le rappel (03-ARCHITECTURE.md § 3). */
export const habitTime = (h: Habit): string | null => h.reminders[0] ?? null;

/** Une entrée sans heure passe APRÈS celles qui en ont une : elle n'est pas
 *  « à minuit », elle est « quand vous voulez ». À heure égale, l'habitude
 *  précède la tâche — l'ordre du prototype. */
const rang = (e: EntreeJour): string => `${e.time ?? '99:99'}|${e.kind === 'habit' ? 0 : 1}`;

/** File d'exécution d'une journée. Aucun filtrage par catégorie ici : le filtre
 *  est un état d'interface, pas une règle métier. */
export function dayAgenda(
  log: LogIndex,
  habits: readonly Habit[],
  tasks: readonly Task[],
  d: Date,
  now: Date = today(),
): EntreeJour[] {
  const k = dateKey(d);
  const entrees: EntreeJour[] = [];

  for (const h of habits) {
    if (!isScheduled(h, d, now)) continue;
    entrees.push({
      kind: 'habit',
      id: h.id,
      time: habitTime(h),
      habit: h,
      done: isDone(log, h, d, now),
      value: loggedValue(log, h, d),
      target: dailyTarget(h),
    });
  }

  for (const t of tasks) {
    if (t.date !== k) continue;
    entrees.push({ kind: 'task', id: t.id, time: t.time ?? null, task: t, done: t.done });
  }

  return entrees.sort((a, b) => rang(a).localeCompare(rang(b)));
}

/** Un jour à venir ne se coche pas : on ne peut pas avoir déjà fait demain.
 *  Le passé, lui, reste modifiable — c'est ainsi qu'on rattrape un oubli. */
export const estCochable = (d: Date, now: Date = today()): boolean => d <= now;

export interface JourSemaine {
  date: Date;
  key: DateKey;
  /** L'habitude est-elle prévue ce jour-là ? */
  scheduled: boolean;
  done: boolean;
  /** Un jour à venir : ni cochable, ni comptable comme manqué. */
  future: boolean;
}

/** Les sept jours de la semaine courante pour une habitude — les pastilles de
 *  la carte. La semaine commence où l'utilisateur l'a dit (`Settings.weekStart`) :
 *  un lundi codé en dur ferait mentir la carte pour la moitié du monde. */
export function habitWeek(
  log: LogIndex,
  h: Habit,
  weekStart: WeekStart = 'mon',
  now: Date = today(),
): JourSemaine[] {
  const debut = startOfWeek(now, weekStart);
  const jours: JourSemaine[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(debut, i);
    jours.push({
      date,
      key: dateKey(date),
      scheduled: isScheduled(h, date, now),
      done: isDone(log, h, date, now),
      future: date > now,
    });
  }
  return jours;
}
