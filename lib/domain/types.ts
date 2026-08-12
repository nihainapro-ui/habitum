/* Modèle de données cible. Porté depuis le prototype, avec les changements
   structurels assumés listés dans docs/handoff/03-ARCHITECTURE.md § 3 :
   - le journal `ov` devient une table `logs` indexée [habitId+date] ;
   - le contenu utilisateur n'est plus bilingue (l'i18n ne concerne que l'UI) ;
   - `date: DateKey` partout, plus de décalage relatif `off` ;
   - `createdAt`, `updatedAt` et `deletedAt` sur TOUTES les entités.

   Sur ce dernier point (03-ARCHITECTURE.md § 3.4) : les horodatages et la
   suppression logique sont un prérequis de synchronisation « dès la phase 1,
   même si la phase 6 n'est jamais faite ». Ils coûtent cinq lignes avant la
   première donnée écrite, et une migration de données après. */

import type { WeekStart } from './date';

/** 'YYYY-MM-DD' — clé canonique. Jamais un Date sérialisé. */
export type DateKey = string;

/** Les six catégories, dans l'ordre d'affichage du prototype (`CAT`).
 *  Déclarées une seule fois, comme les types d'objectif (G8) : une liste
 *  recopiée dans un `<select>` est une liste qui finira par en oublier une. */
export const CATEGORIES = ['health', 'sport', 'mind', 'work', 'study', 'home'] as const;
export type Category = (typeof CATEGORIES)[number];

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
  /** Suppression logique. Une entité effacée reste en base : c'est ce qui
   *  permettra à deux appareils de converger sans la ressusciter. */
  deletedAt?: string;
}

export interface LogEntry {
  habitId: string;
  date: DateKey;
  value: number;
  updatedAt: string;
  /** Pierre tombale : distingue « valeur effacée » de « jamais saisie ».
   *  La distinction est vitale pour le type 'limit' (jamais réussi d'avance). */
  deletedAt?: string;
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
  deletedAt?: string;
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
  deletedAt?: string;
}

export interface Session {
  id: string;
  label: string;
  minutes: number;
  date: DateKey;
  habitId?: string;
  mode: 'pomo' | 'stopwatch' | 'countdown' | 'interval';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Note {
  id: string;
  kind: 'journal' | 'habit';
  date?: DateKey;
  habitId?: string;
  body: string;
  mood?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Profil utilisateur. Le prototype en gère plusieurs (`profiles` / `pid`).
 *  `hue` et `glyph` alimentent l'avatar génératif OKLCH (04-DESIGN-TOKENS.md). */
export interface Profile {
  id: string;
  name: string;
  handle: string;
  glyph: string;
  /** teinte OKLCH, 0–360 ; le prototype pioche dans 188, 214, 266, 318, 158, 32 */
  hue: number;
  role: number;
  since: DateKey;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Article de la liste de courses — champ `shop` du prototype.
 *  Le nom du champ persisté est figé (CLAUDE.md § 1) ; le type, non. */
export interface ShoppingItem {
  id: string;
  label: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Settings {
  lang: 'fr' | 'en';
  theme: 'neural' | 'plasma' | 'clinical';
  weekStart: WeekStart;
  notifications: boolean;
  sound: boolean;
  vibrate: boolean;
  confetti: boolean;
  customCursor: boolean;
}

/** Journal indexé en mémoire : Map('habitId|YYYY-MM-DD' -> valeur). */
export type LogIndex = ReadonlyMap<string, number>;

export const logKey = (habitId: string, date: DateKey): string => `${habitId}|${date}`;
