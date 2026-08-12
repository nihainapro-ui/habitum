import { z } from 'zod';
import { CATEGORIES, HABIT_GOAL_KINDS } from '@/lib/domain';

/* Validation du formulaire d'habitude.

   G8 — les SEPT types d'objectif et les SIX catégories sont IMPORTÉS de
   `lib/domain/types.ts`. Un `z.enum(['check','count','time','total'])` recopié
   ici reproduirait à l'interface le défaut qui a fait disparaître quatre
   habitudes sur six à l'import (CHANGELOG 2026-08-05) : un type absent de la
   liste blanche devient un formulaire qu'on ne peut plus enregistrer. */

/** 'YYYY-MM-DD', ou vide — un champ date facultatif rend '' et non `undefined`. */
/* Alternance plutôt que groupe facultatif : `(\d{4}-\d{2}-\d{2})?` est un
   quantificateur imbriqué, que `security/detect-unsafe-regex` refuse — à
   raison, c'est la forme qui ouvre les retours arrière catastrophiques. */
export const dateKeyOuVide = z
  .string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'date')
  .default('');

/** 'HH:mm' sur 24 heures. */
export const heure = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'heure');

export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1, 'nameRequired').max(80, 'nameTooLong'),
    category: z.enum(CATEGORIES),
    goalKind: z.enum(HABIT_GOAL_KINDS),
    target: z.coerce.number().int().min(1, 'targetMin').max(100_000),
    step: z.coerce.number().int().min(1).max(10_000),
    unit: z.string().trim().max(24),
    subItems: z.array(z.object({ label: z.string().trim().min(1, 'labelRequired') })),

    mode: z.enum(['dow', 'every', 'week', 'month']),
    days: z.array(z.number().int().min(0).max(6)),
    interval: z.coerce.number().int().min(1).max(365),
    start: dateKeyOuVide,
    end: dateKeyOuVide,

    reminders: z.array(heure),

    note: z.string().max(2000),
    archived: z.boolean(),
  })
  /* Une habitude « jours précis » sans aucun jour n'est planifiée nulle part :
     elle disparaîtrait de toutes les vues sans que rien ne le signale. */
  .refine((v) => v.mode !== 'dow' || v.days.length > 0, {
    path: ['days'],
    message: 'daysRequired',
  })
  /* Une liste sans élément n'a pas de cible : `dailyTarget` retomberait sur 1
     et la case se cocherait pour un seul élément coché — sur zéro. */
  .refine((v) => v.goalKind !== 'list' || v.subItems.length > 0, {
    path: ['subItems'],
    message: 'subItemsRequired',
  })
  .refine((v) => !v.start || !v.end || v.start <= v.end, {
    path: ['end'],
    message: 'endBeforeStart',
  });

export type HabitForm = z.infer<typeof habitFormSchema>;
