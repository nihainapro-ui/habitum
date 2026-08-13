import type { z } from 'zod';
import { db } from './db';
import { newId, nowIso } from './repositories/base';
import {
  DATE_KEY_RE,
  LOG_KEY_RE,
  MAX_IMPORT_BYTES,
  habitumExport,
  legacyGoal,
  legacyHabit,
  legacySession,
  legacyShoppingItem,
  legacyTask,
  type Bilingue,
} from './import.schema';
import { addDays, dateKey, today } from '@/lib/domain';
import type { Goal, Habit, LogEntry, Note, Session, ShoppingItem, Task } from '@/lib/domain';

/* ============================================================================
   Importeur du format d'export du prototype.

   C'est le point où le projet a déjà perdu des données : une liste blanche
   incomplète de types avait fait disparaître 4 habitudes sur 6, et leur
   historique avec. Cinq règles en découlent, et aucune n'est négociable :

   1. l'enveloppe est validée avant tout le reste ;
   2. chaque entité est validée séparément — une entité refusée est SIGNALÉE
      dans `dropped`, jamais avalée en silence, et n'empêche pas les autres
      d'entrer ;
   3. le journal est filtré : clé malformée ou habitude inexistante = écarté ;
   4. `createdAt` / `updatedAt` valent la date d'import ;
   5. l'écriture tient dans UNE transaction : jamais de base à moitié peuplée.
   ========================================================================= */

export type ImportEntity =
  'habits' | 'tasks' | 'goals' | 'logs' | 'notes' | 'sessions' | 'shopping' | 'occurrences';

export interface ImportReport {
  read: number;
  kept: number;
  dropped: string[];
  byEntity: Record<ImportEntity, { read: number; kept: number }>;
}

/** Refus d'import, avec un CODE stable.
 *
 *  Le message reste en français pour les journaux et les tests ; l'interface,
 *  elle, ne doit pas dépendre d'une phrase — elle affiche le libellé traduit
 *  qui correspond au code (`system.imp_*`). */
export type CodeRefusImport = 'JSON' | 'FORMAT' | 'EMPTY' | 'TOO_BIG';

/* Réexporté ici pour que l'interface puisse refuser un fichier énorme AVANT de
   le lire en mémoire — ouvrir 400 Mo pour découvrir qu'ils sont de trop fige
   l'onglet le temps de la lecture. */
export { MAX_IMPORT_BYTES };

export class ImportError extends Error {
  constructor(
    readonly code: CodeRefusImport,
    message: string,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export const emptyReport = (): ImportReport => ({
  read: 0,
  kept: 0,
  dropped: [],
  byEntity: {
    habits: { read: 0, kept: 0 },
    tasks: { read: 0, kept: 0 },
    goals: { read: 0, kept: 0 },
    logs: { read: 0, kept: 0 },
    notes: { read: 0, kept: 0 },
    sessions: { read: 0, kept: 0 },
    shopping: { read: 0, kept: 0 },
    occurrences: { read: 0, kept: 0 },
  },
});

/** Le contenu utilisateur n'est plus bilingue : on retient le français, à
 *  défaut l'anglais, à défaut rien. */
const texte = (fr?: string, en?: string): string => (fr ?? '').trim() || (en ?? '').trim() || '';

const libelle = (b: Bilingue): string => (typeof b === 'string' ? b : texte(b.fr, b.en));

/** Valide un tableau d'entités, une par une. Chaque refus est reporté avec son
 *  identifiant : c'est ce qui rend la perte visible plutôt que silencieuse. */
function parseAll<S extends z.ZodTypeAny>(
  schema: S,
  rows: readonly unknown[],
  nom: string,
  dropped: string[],
): z.infer<S>[] {
  const gardees: z.infer<S>[] = [];
  rows.forEach((raw, i) => {
    const r = schema.safeParse(raw);
    if (r.success) {
      gardees.push(r.data);
      return;
    }
    const id = (raw as { id?: unknown } | null)?.id;
    const motif = r.error.issues
      .map((iss) => `${iss.path.join('.') || 'racine'} : ${iss.message}`)
      .join(' ; ');
    dropped.push(`${nom}[${i}]${id === undefined ? '' : ` « ${String(id)} »`} — ${motif}`);
  });
  return gardees;
}

export async function importFromJson(input: unknown): Promise<ImportReport> {
  const at = nowIso();
  const rapport = emptyReport();

  /* Une charge textuelle est acceptée telle quelle : c'est ce que rend la
     lecture d'un fichier. Le plafond de taille protège d'un fichier hostile
     avant même de le parser. */
  let charge = input;
  if (typeof charge === 'string') {
    if (charge.length > MAX_IMPORT_BYTES) {
      throw new ImportError(
        'TOO_BIG',
        `Fichier trop volumineux : un export Habitum ne dépasse pas ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} Mo.`,
      );
    }
    try {
      charge = JSON.parse(charge) as unknown;
    } catch {
      throw new ImportError('JSON', "Fichier illisible : ce n'est pas un export Habitum.");
    }
  }

  const enveloppe = habitumExport.safeParse(charge);
  if (!enveloppe.success) {
    throw new ImportError('FORMAT', "Fichier non reconnu : ce n'est pas un export Habitum.");
  }
  const src = enveloppe.data;

  /* ---- habitudes ---- */
  const habitsBruts = parseAll(legacyHabit, src.habits, 'habits', rapport.dropped);
  const habits: Habit[] = habitsBruts.map((h) => ({
    id: h.id,
    name: texte(h.fr, h.en),
    category: h.cat,
    goal: {
      kind: h.g.k,
      target: h.g.t ?? 1,
      step: h.g.step ?? 1,
      unit: texte(h.g.fr, h.g.en),
    },
    mode: h.mode,
    days: h.days,
    ...(h.n === undefined ? {} : { interval: h.n }),
    subItems: h.sub.map((s) => ({ label: libelle(s) })),
    reminders: h.rem,
    ...(h.start ? { start: h.start } : {}),
    ...(h.end ? { end: h.end } : {}),
    ...(h.pause ? { pause: h.pause } : {}),
    archived: h.arch,
    note: h.note,
    createdAt: at,
    updatedAt: at,
  }));
  const habitIds = new Set(habits.map((h) => h.id));
  rapport.byEntity.habits = { read: src.habits.length, kept: habits.length };

  /* ---- tâches ---- */
  const tasksBruts = parseAll(legacyTask, src.tasks, 'tasks', rapport.dropped);
  const tasks: Task[] = tasksBruts.map((t) => ({
    id: t.id,
    name: texte(t.fr, t.en),
    category: t.cat,
    date: t.d ?? dateKey(addDays(today(), t.off ?? 0)),
    ...(t.time ? { time: t.time } : {}),
    duration: t.dur,
    priority: t.prio,
    done: t.done,
    subTasks: t.sub.map((s) => ({ label: texte(s.fr, s.en), done: s.done })),
    note: t.note,
    ...(t.rep
      ? {
          recurrence: {
            freq: t.rep,
            ...(t.repN === undefined ? {} : { interval: t.repN }),
            ...(t.repD === undefined ? {} : { days: t.repD }),
            ...(t.repDom === undefined ? {} : { dayOfMonth: t.repDom }),
          },
        }
      : {}),
    createdAt: at,
    updatedAt: at,
  }));
  rapport.byEntity.tasks = { read: src.tasks.length, kept: tasks.length };

  /* ---- objectifs ---- */
  const goalsBruts = parseAll(legacyGoal, src.obj, 'obj', rapport.dropped);
  const goals: Goal[] = goalsBruts.map((o) => ({
    id: o.id,
    name: texte(o.fr, o.en),
    kind: o.kind,
    target: o.target,
    unit: o.unit === undefined ? '' : libelle(o.unit),
    ...(o.src ? { sourceHabitId: o.src } : {}),
    ...(o.ms.length
      ? { milestones: o.ms.map((m) => ({ label: texte(m.fr, m.en), done: m.done })) }
      : {}),
    ...(o.win === undefined ? {} : { window: o.win }),
    category: o.cat,
    ...(o.start ? { start: o.start } : {}),
    ...(o.due ? { deadline: o.due } : {}),
    ...(o.cur === undefined ? {} : { current: o.cur }),
    createdAt: at,
    updatedAt: at,
  }));
  rapport.byEntity.goals = { read: src.obj.length, kept: goals.length };

  /* ---- sessions ---- */
  const sessionsBruts = parseAll(legacySession, src.sessions, 'sessions', rapport.dropped);
  const sessions: Session[] = sessionsBruts.map((s) => ({
    id: s.id ?? newId(),
    label: texte(s.label, s.en),
    minutes: s.min,
    date: s.d ?? dateKey(addDays(today(), -(s.off ?? 0))),
    ...(s.habitId ? { habitId: s.habitId } : {}),
    mode: s.mode,
    createdAt: at,
    updatedAt: at,
  }));
  rapport.byEntity.sessions = { read: src.sessions.length, kept: sessions.length };

  /* ---- liste de courses ---- */
  const shopBruts = parseAll(legacyShoppingItem, src.shop, 'shop', rapport.dropped);
  const shopping: ShoppingItem[] = shopBruts.map((s) => ({
    id: s.id ?? newId(),
    label: texte(s.fr, s.en),
    done: s.done,
    createdAt: at,
    updatedAt: at,
  }));
  rapport.byEntity.shopping = { read: src.shop.length, kept: shopping.length };

  /* ---- journal ---- */
  const journal = src.log ?? src.ov ?? {};
  const logs: LogEntry[] = [];
  for (const [cle, valeur] of Object.entries(journal)) {
    if (!LOG_KEY_RE.test(cle)) {
      rapport.dropped.push(`log « ${cle} » — clé malformée`);
      continue;
    }
    const i = cle.indexOf('|');
    const habitId = cle.slice(0, i);
    if (!habitIds.has(habitId)) {
      rapport.dropped.push(`log « ${cle} » — aucune habitude ${habitId}`);
      continue;
    }
    if (!Number.isFinite(valeur) || valeur < 0) {
      rapport.dropped.push(`log « ${cle} » — valeur inexploitable`);
      continue;
    }
    logs.push({ habitId, date: cle.slice(i + 1), value: valeur, updatedAt: at });
  }
  rapport.byEntity.logs = { read: Object.keys(journal).length, kept: logs.length };

  /* ---- occurrences de tâches récurrentes ---- */
  const idsTaches = new Set(tasks.map((t) => t.id));
  const occurrences: Record<string, number> = {};
  let occLues = 0;
  for (const [cle, valeur] of Object.entries(src.occ ?? {})) {
    occLues++;
    if (!LOG_KEY_RE.test(cle)) {
      rapport.dropped.push(`occ « ${cle} » — clé malformée`);
      continue;
    }
    if (!idsTaches.has(cle.slice(0, cle.indexOf('|')))) {
      /* Même règle que pour le journal : une occurrence orpheline est
         SIGNALÉE, jamais avalée en silence. */
      rapport.dropped.push(`occ « ${cle} » — aucune tâche correspondante`);
      continue;
    }
    if (valeur) occurrences[cle] = 1;
  }

  rapport.byEntity.occurrences = { read: occLues, kept: Object.keys(occurrences).length };

  /* ---- notes ---- */
  const notes = notesToRows(src.notes, at, habitIds, rapport.dropped);
  rapport.byEntity.notes = {
    read: src.notes && typeof src.notes === 'object' ? Object.keys(src.notes).length : 0,
    kept: notes.length,
  };

  /* Une seule transaction : un import partiel ne laisse jamais la base à
     moitié peuplée. */
  await db.transaction(
    'rw',
    [db.habits, db.tasks, db.goals, db.sessions, db.shopping, db.logs, db.notes, db.meta],
    async () => {
      await db.habits.bulkPut(habits);
      await db.tasks.bulkPut(tasks);
      await db.goals.bulkPut(goals);
      await db.sessions.bulkPut(sessions);
      await db.shopping.bulkPut(shopping);
      await db.logs.bulkPut(logs);
      await db.notes.bulkPut(notes);
      /* Les occurrences vivent dans `meta` sous la clé `occ` (G1). Écrites dans
         la MÊME transaction que les tâches : une série restaurée sans son
         historique d'accomplissement afficherait des tâches à refaire. */
      await db.meta.put({ key: 'occ', value: occurrences, updatedAt: at });
    },
  );

  for (const e of Object.values(rapport.byEntity)) {
    rapport.read += e.read;
    rapport.kept += e.kept;
  }
  return rapport;
}

/** L'objet `notes` du prototype mélange trois espaces de clés :
 *  `j|YYYY-MM-DD` le journal, `m|YYYY-MM-DD` l'humeur du jour, `n|habitId` la
 *  note d'une habitude. Journal et humeur d'une même date forment UNE note. */
function notesToRows(
  raw: unknown,
  at: string,
  habitIds: ReadonlySet<string>,
  dropped: string[],
): Note[] {
  const rows: Note[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return rows;

  const journaux = new Map<string, string>();
  const humeurs = new Map<string, number>();

  for (const [cle, valeur] of Object.entries(raw as Record<string, unknown>)) {
    const prefixe = cle.slice(0, 2);
    const reste = cle.slice(2);

    if (prefixe === 'j|' || prefixe === 'm|') {
      if (!DATE_KEY_RE.test(reste)) {
        dropped.push(`notes « ${cle} » — date malformée`);
        continue;
      }
      if (prefixe === 'j|') {
        if (typeof valeur === 'string') journaux.set(reste, valeur);
        else dropped.push(`notes « ${cle} » — texte attendu`);
      } else if (typeof valeur === 'number') humeurs.set(reste, valeur);
      else dropped.push(`notes « ${cle} » — humeur numérique attendue`);
      continue;
    }

    if (prefixe === 'n|') {
      if (!habitIds.has(reste)) {
        dropped.push(`notes « ${cle} » — aucune habitude ${reste}`);
        continue;
      }
      if (typeof valeur !== 'string') {
        dropped.push(`notes « ${cle} » — texte attendu`);
        continue;
      }
      if (!valeur.trim()) continue;
      rows.push({
        id: newId(),
        kind: 'habit',
        habitId: reste,
        body: valeur,
        createdAt: at,
        updatedAt: at,
      });
      continue;
    }

    dropped.push(`notes « ${cle} » — clé inconnue`);
  }

  for (const date of new Set([...journaux.keys(), ...humeurs.keys()])) {
    const body = journaux.get(date) ?? '';
    const mood = humeurs.get(date);
    if (!body.trim() && mood === undefined) continue;
    rows.push({
      id: newId(),
      kind: 'journal',
      date,
      body,
      ...(mood === undefined ? {} : { mood }),
      createdAt: at,
      updatedAt: at,
    });
  }
  return rows;
}
