import { db } from '../db';
import { makeRepo } from './base';
import type { Project, ProjectTask } from '@/lib/domain';

/* Work — deux dépôts, aucun code propre : `makeRepo` porte déjà l'identifiant,
   les horodatages et la suppression logique. Une entité qui réimplémenterait
   cela finirait par oublier `updatedAt`, prérequis de synchronisation. */

export const projectsRepo = makeRepo<Project>(db.projects);
export const projectTasksRepo = makeRepo<ProjectTask>(db.projectTasks);
