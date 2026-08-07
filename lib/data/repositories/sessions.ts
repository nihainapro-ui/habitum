import { db } from '../db';
import { makeRepo } from './base';
import type { DateKey, Session } from '@/lib/domain';

const base = makeRepo<Session>(db.sessions);

export const sessionsRepo = {
  ...base,
  async listWindow(from: DateKey, to: DateKey): Promise<Session[]> {
    return (await base.list()).filter((s) => s.date >= from && s.date <= to);
  },
};
