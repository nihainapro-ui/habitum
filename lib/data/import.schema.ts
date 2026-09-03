import { z } from 'zod';
import { FREQUENCES, GOAL_KINDS, HABIT_GOAL_KINDS } from '@/lib/domain';

/* ⚠ PIÈGE DÉJÀ PAYÉ. Les listes blanches ci-dessous sont IMPORTÉES de
   lib/domain/types.ts. Les recopier, c'est reproduire le défaut qui a fait
   disparaître 4 habitudes sur 6 à l'import (CHANGELOG 2026-08-05). */
const habitGoalKind = z.enum(HABIT_GOAL_KINDS);
const goalKind = z.enum(GOAL_KINDS);

const category = z.enum(['health', 'sport', 'mind', 'work', 'home', 'study']);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Libellé bilingue du prototype : { fr, en }. L'i18n ne concerne plus le
 *  contenu utilisateur — on retient le français, à défaut l'anglais. */
const bilingue = z.union([
  z.string(),
  z.object({ fr: z.string().optional(), en: z.string().optional() }),
]);
export type Bilingue = z.infer<typeof bilingue>;

export const legacyHabit = z.object({
  id: z.string().min(1),
  fr: z.string().optional(),
  en: z.string().optional(),
  cat: category.catch('health'),
  g: z.object({
    k: habitGoalKind,
    t: z.number().optional(),
    step: z.number().optional(),
    fr: z.string().optional(),
    en: z.string().optional(),
  }),
  mode: z.enum(['dow', 'every', 'week', 'month']).catch('dow'),
  days: z.array(z.number().int().min(0).max(6)).default([]),
  n: z.number().int().positive().optional(),
  sub: z.array(bilingue).default([]),
  rem: z.array(z.string()).default([]),
  start: z.string().optional(),
  end: z.string().optional(),
  pause: z.object({ from: dateKey, to: dateKey }).optional(),
  arch: z.boolean().default(false),
  note: z.string().default(''),
});

export const legacyTask = z.object({
  id: z.string().min(1),
  fr: z.string().optional(),
  en: z.string().optional(),
  cat: category.catch('work'),
  d: dateKey.optional(),
  off: z.number().int().optional(),
  time: z.string().optional(),
  dur: z.number().positive().default(60),
  prio: z.union([z.literal(1), z.literal(2), z.literal(3)]).catch(2),
  done: z.boolean().default(false),
  sub: z
    .array(
      z.object({
        fr: z.string().optional(),
        en: z.string().optional(),
        done: z.boolean().default(false),
      }),
    )
    .default([]),
  note: z.string().default(''),
  /* Liste blanche IMPORTÉE (G8). `weekly` est arrivé avec la tâche 5.6 ; un
     export antérieur n'en contient pas, et un export récent ne doit pas voir
     ses tâches hebdomadaires disparaître à la relecture. */
  rep: z.enum(FREQUENCES).optional(),
  /* Un sur N. Absent dans les exports antérieurs à la tâche 5.6. */
  repN: z.number().int().min(1).max(99).optional(),
  /* `weekly` : jours retenus ; `monthly` : quantième. */
  repD: z.array(z.number().int().min(0).max(6)).optional(),
  repDom: z.number().int().min(1).max(31).optional(),
});

export const legacyGoal = z.object({
  id: z.string().min(1),
  fr: z.string().optional(),
  en: z.string().optional(),
  kind: goalKind,
  target: z.number().default(1),
  unit: bilingue.optional(),
  src: z.string().optional(),
  ms: z
    .array(
      z.object({
        fr: z.string().optional(),
        en: z.string().optional(),
        done: z.boolean().default(false),
      }),
    )
    .default([]),
  win: z.number().optional(),
  cat: category.catch('work'),
  start: z.string().optional(),
  due: z.string().optional(),
  cur: z.number().optional(),
});

/* Le prototype n'attribue pas d'identifiant aux sessions ni aux articles de
   courses. `id` est donc optionnel en lecture — et systématiquement écrit par
   notre propre export, pour qu'un aller-retour soit stable. */
export const legacySession = z.object({
  id: z.string().optional(),
  label: z.string().default(''),
  en: z.string().optional(),
  min: z.number().nonnegative().default(0),
  d: dateKey.optional(),
  off: z.number().int().optional(),
  habitId: z.string().optional(),
  mode: z.enum(['pomo', 'stopwatch', 'countdown', 'interval']).catch('pomo'),
});

export const legacyShoppingItem = z.object({
  id: z.string().optional(),
  fr: z.string().optional(),
  en: z.string().optional(),
  done: z.boolean().default(false),
});

/* Work. Les deux schémas tolèrent TOUT ce qui manque : une sauvegarde produite
   avant Work n'a ni `proj` ni `ptask`, et doit s'importer sans une erreur.
   `status` retombe sur `todo` plutôt que d'écarter la ligne — perdre une tâche
   parce que son statut est inconnu serait exactement la disparition
   silencieuse que le CLAUDE.md proscrit. */
export const legacyProject = z.object({
  id: z.string().optional(),
  name: z.string().default(''),
  note: z.string().default(''),
});

export const legacyProjectTask = z.object({
  id: z.string().optional(),
  projectId: z.string(),
  name: z.string().default(''),
  assignee: z.string().default(''),
  deadline: z.string().default(''),
  status: z.enum(['todo', 'doing', 'done']).catch('todo'),
  note: z.string().default(''),
  /* Sous-tâches — lot B. `.default([])` n'est pas de la complaisance : une
     sauvegarde produite avant ce lot n'a pas la clé, et l'absence ne doit
     écarter aucune étape. Même forme que `sub` sur `legacyTask`. */
  sub: z
    .array(
      z.object({
        fr: z.string().optional(),
        en: z.string().optional(),
        done: z.boolean().default(false),
      }),
    )
    .default([]),
});

export const habitumExport = z.object({
  app: z.literal('Habitum'),
  exported: z.string().optional(),
  v: z.number().optional(),
  habits: z.array(z.unknown()).default([]),
  tasks: z.array(z.unknown()).default([]),
  // `log` dans les exports récents, `ov` dans les plus anciens.
  log: z.record(z.string(), z.number()).optional(),
  ov: z.record(z.string(), z.number()).optional(),
  notes: z.unknown().optional(),
  obj: z.array(z.unknown()).default([]),
  sessions: z.array(z.unknown()).default([]),
  shop: z.array(z.unknown()).default([]),
  proj: z.array(z.unknown()).default([]),
  ptask: z.array(z.unknown()).default([]),
  /* Occurrences accomplies des tâches récurrentes. Nom FIGÉ (G1) : c'est celui
     du prototype, et des sauvegardes réelles le portent. */
  occ: z.record(z.string(), z.number()).optional(),
});

/* Plafond de lecture d'un fichier d'import — tâche 8.5.
 *
 * IL VALAIT 2 Mo, ET C'ÉTAIT UN PIÈGE À PERTE DE DONNÉES. Le garde-fou est là
 * pour refuser un fichier hostile avant de le lire ; il refusait aussi
 * l'export du produit lui-même. À la charge documentée du plan — 200 habitudes
 * × 3 ans, soit 219 000 entrées de journal — `exportToJson()` produit
 * **10,6 Mo** : 5,32 Mo pour `log`, autant pour `ov`, qui porte le même objet
 * sous son ancien nom (G1, compatibilité du prototype).
 *
 * Autrement dit : au-delà d'environ 40 habitudes tenues sur trois ans,
 * l'utilisateur téléchargeait une sauvegarde que l'application refusait de
 * relire. Sans compte, l'export EST la sauvegarde — le garde-fou détruisait
 * exactement ce qu'il devait protéger. Trouvé par le test de charge de la
 * tâche 8.5, qui réimporte le fichier qu'il vient de produire ; aucun test ne
 * le faisait avant, parce qu'aucun ne partait d'un export RÉEL à l'échelle.
 *
 * 64 Mo laisse six fois la charge du plan, et continue de refuser avant
 * lecture ce qui n'a aucune chance d'être un export Habitum.
 */
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
export const LOG_KEY_RE = /^[^|]+\|\d{4}-\d{2}-\d{2}$/;
export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
