import { db } from '../db';
import { makeRepo } from './base';
import type { Profile } from '@/lib/domain';

export const profilesRepo = makeRepo<Profile>(db.profiles);
