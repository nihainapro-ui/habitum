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

/** Fréquences de répétition d'une TÂCHE. Déclarées ici, avec les autres listes
 *  blanches (G8) : une liste recopiée dans un validateur est une liste qui
 *  finira par en oublier une — et par faire disparaître des données. */
export const FREQUENCES = ['daily', 'weekly', 'monthly'] as const;
export type Frequence = (typeof FREQUENCES)[number];

/** RRULE simplifiée. Les règles d'expansion vivent dans `recurrence.ts`. */
export interface Recurrence {
  freq: Frequence;
  /** Un sur `interval`. Défaut : 1. */
  interval?: number;
  /** `weekly` : jours retenus, au format `dow()` (0 = lundi). Vide ou absent,
   *  c'est le jour de la date d'ancrage. */
  days?: number[];
  /** `monthly` : quantième visé. Absent, c'est celui de la date d'ancrage. */
  dayOfMonth?: number;
}

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
  /** Répétition simplifiée — `lib/domain/recurrence.ts`. Le champ reste
   *  optionnel : la grande majorité des tâches ne se répète pas. */
  recurrence?: Recurrence;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/* ---------------------------------------------------------------------------
   Work — projets et tâches de projet.

   ENTITÉ SÉPARÉE DE `Task`, décision du commanditaire (spec du 2026-08-31).
   Ce que cela coûte est écrit dans la spec : une tâche de projet ne remonte pas
   dans Aujourd'hui ni dans le calendrier. Ce que cela achète : les champs de
   Work — responsable, trois états — ne contaminent pas `Task`, dont dépendent
   huit vues et les 62 valeurs de référence.
   ------------------------------------------------------------------------- */

/** Les trois états, déclarés UNE SEULE FOIS.
 *
 *  C'est le piège n°1 du CLAUDE.md, et il a déjà coûté cher : une liste de
 *  types recopiée ailleurs finit par en oublier un, et les entités de ce
 *  type-là DISPARAISSENT sans que rien ne le signale. Toute vue, tout
 *  validateur, tout importateur lit cette constante. */
export const PROJECT_STATUSES = ['todo', 'doing', 'done'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const isProjectStatus = (v: unknown): v is ProjectStatus =>
  typeof v === 'string' && (PROJECT_STATUSES as readonly string[]).includes(v);

export interface Project {
  id: string;
  name: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  name: string;
  /** Texte libre, `''` si personne. Habitum est local-first et sans compte :
   *  un responsable ne peut être qu'un nom écrit à la main, pour déléguer à
   *  quelqu'un hors de l'application. */
  assignee: string;
  /** `''` si pas d'échéance. */
  deadline: DateKey | '';
  status: ProjectStatus;
  note: string;
  /** Sous-tâches de l'étape — lot B (spec du 2026-09-02).
   *
   *  DIFFÉRENCE ASSUMÉE avec `Habit.subItems` (`{ label }` seul) : pour une
   *  habitude, l'accompli du jour vit dans le journal, une même liste étant
   *  recochée chaque jour ; pour une étape de projet, l'accompli est
   *  intrinsèque et unique — il vit donc dans l'entité.
   *
   *  OPTIONNEL, ET CE N'EST PAS UN OUBLI. Les étapes écrites avant ce lot n'ont
   *  pas ce champ : ni celles déjà en base, ni celles qu'un appareil resté en
   *  arrière enverra (`lib/sync/entites.ts` écrit la ligne reçue telle quelle,
   *  sans validation ni valeur par défaut). Le déclarer requis mentirait au
   *  compilateur — la ligne existe, sans le champ — et le tableau planterait
   *  sur `.length`. `projectSubItems()` défait l'absence, en un seul endroit. */
  subItems?: { label: string; done: boolean }[];
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
