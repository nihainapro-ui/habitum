import { db } from '../db';
import { makeRepo } from './base';
import type { DateKey, Task } from '@/lib/domain';

const base = makeRepo<Task>(db.tasks);

export const tasksRepo = {
  ...base,
  async listByDate(date: DateKey): Promise<Task[]> {
    return (await base.list()).filter((t) => t.date === date);
  },
  async listOpen(): Promise<Task[]> {
    return (await base.list()).filter((t) => !t.done);
  },
};
