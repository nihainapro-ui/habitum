import { beforeEach, describe, expect, it } from 'vitest';
import { buildLogIndex, loadLogIndex, loadLogIndexWindow } from '@/lib/data/log-index';
import { db } from '@/lib/data/db';
import { logsRepo } from '@/lib/data/repositories';
import { logKey } from '@/lib/domain';

const row = (habitId: string, date: string, value: number) => ({
  habitId,
  date,
  value,
  updatedAt: '2026-08-05T00:00:00.000Z',
});

describe('buildLogIndex', () => {
  it('produit une Map indexée par habitId|date', () => {
    const idx = buildLogIndex([row('h1', '2026-08-01', 3)]);
    expect(idx.get(logKey('h1', '2026-08-01'))).toBe(3);
  });

  it('retourne undefined sur une clé absente — jamais 0', () => {
    const idx = buildLogIndex([]);
    expect(idx.get(logKey('h1', '2026-08-01'))).toBeUndefined();
  });

  it('tient 36 500 entrées en moins de 100 ms', () => {
    const rows = Array.from({ length: 36_500 }, (_, i) =>
      row(
        `h${i % 20}`,
        `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        i % 10,
      ),
    );
    const t0 = performance.now();
    const idx = buildLogIndex(rows);
    expect(performance.now() - t0).toBeLessThan(100);
    expect(idx.size).toBeGreaterThan(0);
  });

  /* G9 — une valeur 0 est une valeur SAISIE ; elle doit se distinguer d'une
     absence de saisie. Le type `limit` en dépend entièrement. */
  it('conserve une valeur 0, qui n’est pas une absence', () => {
    const idx = buildLogIndex([row('h1', '2026-08-01', 0)]);
    expect(idx.has(logKey('h1', '2026-08-01'))).toBe(true);
    expect(idx.get(logKey('h1', '2026-08-01'))).toBe(0);
  });
});

describe('lecture depuis la base', () => {
  beforeEach(async () => {
    if (db.isOpen()) db.close();
    await db.delete();
    await db.open();
    await logsRepo.setValue('h1', '2026-07-31', 1);
    await logsRepo.setValue('h1', '2026-08-01', 2);
    await logsRepo.setValue('h2', '2026-08-01', 9);
  });

  it('loadLogIndex lit tout le journal', async () => {
    expect((await loadLogIndex()).size).toBe(3);
  });

  it('loadLogIndexWindow ne lit que les habitudes et la fenêtre demandées', async () => {
    const idx = await loadLogIndexWindow(['h1'], '2026-08-01', '2026-08-31');
    expect(idx.size).toBe(1);
    expect(idx.get(logKey('h1', '2026-08-01'))).toBe(2);
  });
});
