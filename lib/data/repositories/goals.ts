import { db } from '../db';
import { makeRepo } from './base';
import type { Goal } from '@/lib/domain';

export const goalsRepo = makeRepo<Goal>(db.goals);
