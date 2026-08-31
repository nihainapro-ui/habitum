import { LEGACY_SCHEMA_VERSION } from '@/lib/storage/keys';
import { logKey, parseOccurrenceKey, type Frequence } from '@/lib/domain';
import { META_KEYS } from './seed';
import { nowIso } from './repositories/base';
import {
  goalsRepo,
  habitsRepo,
  logsRepo,
  metaRepo,
  notesRepo,
  sessionsRepo,
  projectsRepo,
  projectTasksRepo,
  shoppingRepo,
  tasksRepo,
} from './repositories';

/* ============================================================================
   Export au format du prototype — c'est-à-dire au format que `importFromJson`
   sait relire. La condition n'est pas cosmétique : sans compte, l'export EST
   la sauvegarde, et un aller-retour qui perd une entité perd des données.

   L'export du prototype oubliait les habitudes archivées, les objectifs, les
   sessions et la liste de courses. Ici, tout ce qui n'est pas logiquement
   supprimé sort, archivé compris.
   ========================================================================= */

export interface HabitumExport {
  app: 'Habitum';
  v: number;
  exported: string;
  habits: ExportedHabit[];
  tasks: ExportedTask[];
  obj: ExportedGoal[];
  /** Journal. `ov` est le même objet, sous son ancien nom (G1). */
  log: Record<string, number>;
  ov: Record<string, number>;
  notes: Record<string, string | number>;
  sessions: ExportedSession[];
  shop: ExportedShoppingItem[];
  /** Occurrences accomplies des tâches récurrentes — nom et format FIGÉS (G1).
   *  Sans elles, une sauvegarde restituerait des séries mais perdrait ce qui a
   *  été fait : la tâche reviendrait, l'historique non. */
  occ: Record<string, number>;
  /** Work — CLÉS NEUVES (spec du 2026-08-31). Elles s'ajoutent, elles ne
   *  renomment rien : la règle 1 du CLAUDE.md ne concerne que les noms
   *  existants. Optionnelles à la RELECTURE seulement (`import.ts`) : toute
   *  sauvegarde produite avant Work doit s'importer sans erreur. */
  proj: ExportedProject[];
  ptask: ExportedProjectTask[];
}

export interface ExportedProject {
  id: string;
  name: string;
  note: string;
}

export interface ExportedProjectTask {
  id: string;
  projectId: string;
  name: string;
  assignee: string;
  deadline: string;
  status: string;
  note: string;
}

export interface ExportedHabit {
  id: string;
  fr: string;
  en: string;
  cat: string;
  g: { k: string; t: number; step: number; fr: string; en: string };
  mode: string;
  days: number[];
  n?: number;
  sub: { fr: string; en: string }[];
  rem: string[];
  start?: string;
  end?: string;
  pause?: { from: string; to: string };
  arch: boolean;
  note: string;
}

export interface ExportedTask {
  id: string;
  fr: string;
  en: string;
  cat: string;
  d: string;
  time?: string;
  dur: number;
  prio: 1 | 2 | 3;
  done: boolean;
  sub: { fr: string; en: string; done: boolean }[];
  note: string;
  /* Répétition — `rep` porte la fréquence depuis le prototype (G1) ; les trois
     champs suivants sont apparus avec la tâche 5.6 et restent optionnels, pour
     qu'un export récent reste relisible par un lecteur ancien. */
  rep?: Frequence;
  repN?: number;
  repD?: number[];
  repDom?: number;
}

export interface ExportedGoal {
  id: string;
  fr: string;
  en: string;
  kind: string;
  target: number;
  unit: { fr: string; en: string };
  src?: string;
  ms: { fr: string; en: string; done: boolean }[];
  win?: number;
  cat: string;
  start?: string;
  due?: string;
  cur?: number;
}

export interface ExportedSession {
  id: string;
  label: string;
  en: string;
  min: number;
  d: string;
  habitId?: string;
  mode: string;
}

export interface ExportedShoppingItem {
  id: string;
  fr: string;
  en: string;
  done: boolean;
}

export async function exportToJson(): Promise<HabitumExport> {
  const [habits, tasks, goals, sessions, shopping, notes, logs, occ, projects, projectTasks] =
    await Promise.all([
      habitsRepo.list(),
      tasksRepo.list(),
      goalsRepo.list(),
      sessionsRepo.list(),
      shoppingRepo.list(),
      notesRepo.list(),
      logsRepo.all(),
      metaRepo.get<Record<string, number>>(META_KEYS.occ),
      projectsRepo.list(),
      projectTasksRepo.list(),
    ]);

  /* Les occurrences d'une tâche disparue ne sortent pas : elles ne se
     rattacheraient à rien à la relecture, et l'import les écarterait une à une
     dans le rapport — du bruit pour rien. */
  const idsTaches = new Set(tasks.map((t) => t.id));
  const occurrences: Record<string, number> = {};
  for (const [cle, valeur] of Object.entries(occ ?? {})) {
    const decoupee = parseOccurrenceKey(cle);
    if (valeur && decoupee && idsTaches.has(decoupee.taskId)) occurrences[cle] = 1;
  }

  const journal: Record<string, number> = {};
  for (const l of logs) {
    if (l.deletedAt) continue;
    journal[logKey(l.habitId, l.date)] = l.value;
  }

  const notesObj: Record<string, string | number> = {};
  for (const n of notes) {
    if (n.kind === 'journal' && n.date) {
      notesObj[`j|${n.date}`] = n.body;
      if (n.mood !== undefined) notesObj[`m|${n.date}`] = n.mood;
    } else if (n.kind === 'habit' && n.habitId) {
      notesObj[`n|${n.habitId}`] = n.body;
    }
  }

  return {
    app: 'Habitum',
    v: LEGACY_SCHEMA_VERSION,
    exported: nowIso(),
    habits: habits.map((h) => ({
      id: h.id,
      fr: h.name,
      en: h.name,
      cat: h.category,
      g: {
        k: h.goal.kind,
        t: h.goal.target,
        step: h.goal.step,
        fr: h.goal.unit,
        en: h.goal.unit,
      },
      mode: h.mode,
      days: h.days,
      ...(h.interval === undefined ? {} : { n: h.interval }),
      sub: h.subItems.map((s) => ({ fr: s.label, en: s.label })),
      rem: h.reminders,
      ...(h.start ? { start: h.start } : {}),
      ...(h.end ? { end: h.end } : {}),
      ...(h.pause ? { pause: h.pause } : {}),
      arch: h.archived,
      note: h.note,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      fr: t.name,
      en: t.name,
      cat: t.category,
      d: t.date,
      ...(t.time ? { time: t.time } : {}),
      dur: t.duration,
      prio: t.priority,
      done: t.done,
      sub: t.subTasks.map((s) => ({ fr: s.label, en: s.label, done: s.done })),
      note: t.note,
      ...(t.recurrence
        ? {
            rep: t.recurrence.freq,
            ...(t.recurrence.interval === undefined ? {} : { repN: t.recurrence.interval }),
            ...(t.recurrence.days === undefined ? {} : { repD: t.recurrence.days }),
            ...(t.recurrence.dayOfMonth === undefined ? {} : { repDom: t.recurrence.dayOfMonth }),
          }
        : {}),
    })),
    obj: goals.map((g) => ({
      id: g.id,
      fr: g.name,
      en: g.name,
      kind: g.kind,
      target: g.target,
      unit: { fr: g.unit, en: g.unit },
      ...(g.sourceHabitId ? { src: g.sourceHabitId } : {}),
      ms: (g.milestones ?? []).map((m) => ({ fr: m.label, en: m.label, done: m.done })),
      ...(g.window === undefined ? {} : { win: g.window }),
      cat: g.category,
      ...(g.start ? { start: g.start } : {}),
      ...(g.deadline ? { due: g.deadline } : {}),
      ...(g.current === undefined ? {} : { cur: g.current }),
    })),
    log: journal,
    ov: journal,
    notes: notesObj,
    sessions: sessions.map((s) => ({
      id: s.id,
      label: s.label,
      en: s.label,
      min: s.minutes,
      d: s.date,
      ...(s.habitId ? { habitId: s.habitId } : {}),
      mode: s.mode,
    })),
    shop: shopping.map((s) => ({ id: s.id, fr: s.label, en: s.label, done: s.done })),
    occ: occurrences,
    proj: projects.map((p) => ({ id: p.id, name: p.name, note: p.note })),
    ptask: projectTasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      name: t.name,
      assignee: t.assignee,
      deadline: t.deadline,
      status: t.status,
      note: t.note,
    })),
  };
}
