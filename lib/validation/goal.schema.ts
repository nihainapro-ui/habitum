import { z } from 'zod';
import { CATEGORIES, GOAL_KINDS } from '@/lib/domain';
import { dateKeyOuVide } from './habit.schema';

/* Validation du formulaire d'objectif.

   G8 — les TROIS types viennent de `GOAL_KINDS`. L'importeur du prototype
   ignorait `milestones` : les objectifs à jalons disparaissaient sans un mot. */

export const goalFormSchema = z
  .object({
    name: z.string().trim().min(1, 'nameRequired').max(120, 'nameTooLong'),
    kind: z.enum(GOAL_KINDS),
    category: z.enum(CATEGORIES),
    target: z.coerce.number().int().min(0).max(1_000_000),
    unit: z.string().trim().max(24),
    sourceHabitId: z.string().default(''),
    start: dateKeyOuVide,
    deadline: dateKeyOuVide,
    window: z.coerce.number().int().min(1).max(400),
    milestones: z.array(
      z.object({ label: z.string().trim().min(1, 'labelRequired'), done: z.boolean() }),
    ),
  })
  /* Un objectif cumulatif ou de réduction sans cible n'a pas d'avancement :
     `goalProgress` retomberait sur 1 et afficherait 100 % au premier jour. */
  .refine((v) => v.kind === 'milestones' || v.target >= 1, {
    path: ['target'],
    message: 'targetMin',
  })
  .refine((v) => v.kind !== 'milestones' || v.milestones.length > 0, {
    path: ['milestones'],
    message: 'subItemsRequired',
  })
  .refine((v) => !v.start || !v.deadline || v.start <= v.deadline, {
    path: ['deadline'],
    message: 'endBeforeStart',
  });

export type GoalForm = z.infer<typeof goalFormSchema>;
