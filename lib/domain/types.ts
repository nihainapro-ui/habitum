/* Modèle de données cible. Porté depuis le prototype, avec les changements
   structurels assumés listés dans docs/handoff/03-ARCHITECTURE.md § 3 :
   - le journal `ov` devient une table `logs` indexée [habitId+date] ;
   - le contenu utilisateur n'est plus bilingue (l'i18n ne concerne que l'UI) ;
   - `date: DateKey` partout, plus de décalage relatif `off` ;
   - `updatedAt` sur toutes les entités, prérequis de synchronisation. */

/** 'YYYY-MM-DD' — clé canonique. Jamais un Date sérialisé. */
export type DateKey = string;

export type Category = 'health' | 'sport' | 'mind' | 'work' | 'home' | 'study';

/** SEPT types, pas quatre. Toute liste blanche incomplète fait disparaître des
 *  données silencieusement — c'est arrivé à l'import (voir CHANGELOG 2026-08-05). */
export const HABIT_GOAL_KINDS = [
  'check',
  'count',
  'time',
  'total',
  'list',
  'limit',
  'exact',
] as const;
export type HabitGoalKind = (typeof HABIT_GOAL_KINDS)[number];

export const GOAL_KINDS = ['cumul', 'milestones', 'reduce'] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export type ScheduleMode = 'dow' | 'every' | 'week' | 'month';

export interface HabitGoal {
  kind: HabitGoalKind;
  target: number;
  step: number;
  unit: string;
}

export interface Habit {
  id: string;
  name: string;
  category: Category;
  goal: HabitGoal;
  mode: ScheduleMode;
  /** 0 = lundi … 6 = dimanche (mode 'dow') */
  days: number[];
  /** intervalle en jours (mode 'every') */
  interval?: number;
  subItems: { label: string }[];
  reminders: string[];
  start?: DateKey;
  end?: DateKey;
  pause?: { from: DateKey; to: DateKey };
  archived: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  habitId: string;
  date: DateKey;
  value: number;
  updatedAt: string;
}

export interface Task {
  id: string;
  name: string;
  category: Category;
  date: DateKey;
  time?: string;
  /** minutes, défaut 60 */
  duration: number;
  priority: 1 | 2 | 3;
  done: boolean;
  subTasks: { label: string; done: boolean }[];
  note: string;
  recurrence?: { freq: 'daily' | 'monthly' };
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  target: number;
  unit: string;
  sourceHabitId?: string;
  milestones?: { label: string; done: boolean }[];
  /** fenêtre en jours (kind = 'reduce') */
  window?: number;
  category: Category;
  start?: DateKey;
  deadline?: DateKey;
  current?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  label: string;
  minutes: number;
  date: DateKey;
  habitId?: string;
  mode: 'pomo' | 'stopwatch' | 'countdown' | 'interval';
}

export interface Note {
  id: string;
  kind: 'journal' | 'habit';
  date?: DateKey;
  habitId?: string;
  body: string;
  mood?: number;
  updatedAt: string;
}

export interface Settings {
  lang: 'fr' | 'en';
  theme: 'neural' | 'plasma' | 'clinical';
  weekStart: 'mon' | 'sun';
  notifications: boolean;
  sound: boolean;
  vibrate: boolean;
  confetti: boolean;
  customCursor: boolean;
}

/** Journal indexé en mémoire : Map('habitId|YYYY-MM-DD' -> valeur). */
export type LogIndex = ReadonlyMap<string, number>;

export const logKey = (habitId: string, date: DateKey): string => `${habitId}|${date}`;
