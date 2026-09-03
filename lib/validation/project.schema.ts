import { z } from 'zod';
import { PROJECT_STATUSES } from '@/lib/domain';
import { dateKeyOuVide } from './habit.schema';

/* Validation des formulaires de Work.

   `PROJECT_STATUSES` est IMPORTÉ, jamais recopié (piège n°1 du CLAUDE.md) :
   une liste écrite à la main ici finirait par oublier un statut, et les tâches
   de ce statut-là seraient écartées à l'enregistrement — sans un mot. */

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(120, 'nameTooLong'),
  note: z.string().max(2000).default(''),
});
export type ProjectForm = z.infer<typeof projectFormSchema>;

export const projectTaskFormSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(120, 'nameTooLong'),
  /* Le responsable est un TEXTE LIBRE : Habitum est local-first et sans compte,
     il n'y a personne à choisir dans une liste. Vide est le cas normal. */
  assignee: z.string().trim().max(80).default(''),
  /* Une tâche de projet peut n'avoir AUCUNE échéance — contrairement à une
     tâche du calendrier, qui doit être datée pour apparaître quelque part. */
  deadline: dateKeyOuVide,
  status: z.enum(PROJECT_STATUSES),
  note: z.string().max(2000).default(''),
  /* Sous-tâches — lot B. Intitulé non vide, comme les sous-éléments d'habitude
     (`habit.schema.ts`) : une ligne ajoutée puis laissée vide serait une case à
     cocher sans nom.

     `done` FAIT PARTIE DU FORMULAIRE et n'y est jamais modifié : l'éditeur
     nomme, il ne coche pas (le cochage se fait sur la ligne du tableau).
     L'omettre ici ferait repasser à `false` toute sous-tâche déjà faite au
     premier enregistrement de l'étape — une perte que rien n'annoncerait. */
  subItems: z
    .array(z.object({ label: z.string().trim().min(1, 'labelRequired'), done: z.boolean() }))
    .default([]),
});
export type ProjectTaskForm = z.infer<typeof projectTaskFormSchema>;
