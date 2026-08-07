import Dexie, { type EntityTable, type Table } from 'dexie';
import { DB_NAME, DB_VERSION } from '@/lib/storage/keys';
import type {
  Goal,
  Habit,
  LogEntry,
  Note,
  Profile,
  Session,
  ShoppingItem,
  Task,
} from '@/lib/domain';

/** Ligne de la table clé/valeur : version de schéma, drapeaux, cache dérivé. */
export interface MetaRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

export class HabitumDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>;
  /* `logs` n'a pas de champ identifiant : sa clé primaire est le couple
     [habitId+date]. D'où `Table<…, [string, string]>` et non `EntityTable`,
     qui suppose une clé primaire portée par une propriété unique. */
  logs!: Table<LogEntry, [string, string]>;
  tasks!: EntityTable<Task, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  profiles!: EntityTable<Profile, 'id'>;
  shopping!: EntityTable<ShoppingItem, 'id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor() {
    super(DB_NAME);

    /* Version 1 — schéma initial du portage.
       `logs` a une clé primaire composite [habitId+date] : l'unicité « une
       valeur par habitude et par jour » est structurelle, pas défendue par du
       code. C'est ce que l'objet `ov` du prototype garantissait implicitement.
       Les index `deletedAt` servent aux requêtes « non supprimés » et à la
       synchronisation future. */
    this.version(1).stores({
      habits: 'id, category, archived, updatedAt, deletedAt',
      logs: '[habitId+date], habitId, date, updatedAt',
      tasks: 'id, date, category, done, updatedAt, deletedAt',
      goals: 'id, kind, sourceHabitId, deadline, updatedAt, deletedAt',
      notes: 'id, kind, date, habitId, updatedAt, deletedAt',
      sessions: 'id, date, habitId, updatedAt, deletedAt',
      profiles: 'id, updatedAt, deletedAt',
      shopping: 'id, done, updatedAt, deletedAt',
      meta: 'key, updatedAt',
    });
  }
}

export const db = new HabitumDB();

/** Numéro de version courant, pour les diagnostics et l'écran de réglages. */
export const CURRENT_DB_VERSION = DB_VERSION;
