import { z } from 'zod';
import { CATEGORIES, FREQUENCES } from '@/lib/domain';
import { dateKeyOuVide, heure } from './habit.schema';

/* Validation du formulaire de tâche.

   Une tâche a TOUJOURS une date : sans elle, elle n'apparaîtrait dans aucune
   vue — ni dans le jour, ni dans le calendrier, ni dans un groupe de la liste.
   C'est la seule contrainte forte du formulaire. */

export const taskFormSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(120, 'nameTooLong'),
  category: z.enum(CATEGORIES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateRequired'),
  time: heure.or(z.literal('')).default(''),
  duration: z.coerce
    .number()
    .int()
    .min(5, 'durationMin')
    .max(24 * 60),
  priority: z.coerce.number().int().min(1).max(3),
  /* La liste des fréquences est IMPORTÉE (G8) : recopiée ici, elle finirait
     par en oublier une, et une tâche récurrente disparaîtrait à la validation. */
  recurrence: z.enum(['none', ...FREQUENCES]),
  /* Un sur N. Borné à 99 : au-delà, ce n'est plus une habitude de vie, et un
     intervalle de 0 rendrait la série infiniment dense. */
  interval: z.coerce.number().int().min(1).max(99),
  /* Rappel propre à la tâche (spec du 2026-09-07). `notify` est un booléen de
     formulaire — c'est à l'enregistrement qu'il devient une ABSENCE quand il
     vaut « oui », pour que « jamais réglé » et « réglé sur oui » restent la
     même chose en base. */
  notify: z.boolean(),
  remindAt: heure.or(z.literal('')).default(''),
  subTasks: z.array(
    z.object({
      label: z.string().trim().min(1, 'labelRequired'),
      done: z.boolean(),
      /* Jour et heure du rappel de la SOUS-TÂCHE. Les deux ou rien : sans jour,
         une heure ne désigne aucun instant, et sans heure un jour n'en désigne
         pas davantage. */
      date: dateKeyOuVide.optional(),
      time: heure.or(z.literal('')).optional(),
    }),
  ),
  note: z.string().max(2000),
});

export type TaskForm = z.infer<typeof taskFormSchema>;

/** Réexporté pour que l'éditeur n'ait qu'un import de validation. */
export { dateKeyOuVide };
