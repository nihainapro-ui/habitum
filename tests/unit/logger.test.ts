import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, metaRepo } from '@/lib/data';
import { clearErrorLog, logError, MAX_ERREURS, readErrorLog } from '@/lib/logger';

/* Journal d'erreurs — tâche 5.1.

   Trois propriétés, et elles comptent toutes les trois autant :
   il est local, il est borné, et il ne casse jamais. */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  await clearErrorLog();
});

describe('logError', () => {
  it('consigne message, origine et pile, les plus récentes en tête', async () => {
    await logError('render', new Error('boum'));
    await logError('global', new Error('re-boum'));

    const journal = await readErrorLog();
    expect(journal).toHaveLength(2);
    expect(journal[0]?.message).toBe('re-boum');
    expect(journal[0]?.where).toBe('global');
    expect(journal[1]?.message).toBe('boum');
    expect(journal[1]?.stack).toContain('Error');
  });

  it('accepte ce qui n’est pas une Error', async () => {
    await logError('hydrate', 'chaîne nue');
    expect((await readErrorLog())[0]?.message).toBe('chaîne nue');
  });

  it('retient l’empreinte Next quand il y en a une', async () => {
    const err = Object.assign(new Error('rendu serveur'), { digest: 'abc123' });
    await logError('render', err);
    expect((await readErrorLog())[0]?.digest).toBe('abc123');
  });

  it(`ne dépasse jamais ${MAX_ERREURS} entrées — un journal sans borne finit par
      causer la panne de stockage qu'il documente`, async () => {
    for (let i = 0; i < MAX_ERREURS + 12; i++) await logError('render', new Error(`e${i}`));

    const journal = await readErrorLog();
    expect(journal).toHaveLength(MAX_ERREURS);
    expect(journal[0]?.message).toBe(`e${MAX_ERREURS + 11}`);
  });

  it('ne lève pas quand la base est indisponible, et garde la trace en mémoire', async () => {
    const espion = vi.spyOn(metaRepo, 'set').mockRejectedValue(new Error('QuotaExceeded'));

    await expect(logError('render', new Error('pendant la panne'))).resolves.toBeUndefined();

    espion.mockRestore();
    vi.spyOn(metaRepo, 'get').mockRejectedValue(new Error('QuotaExceeded'));
    expect((await readErrorLog())[0]?.message).toBe('pendant la panne');
    vi.restoreAllMocks();
  });
});

describe('clearErrorLog', () => {
  it('efface la clé `errors` de meta et le repli mémoire', async () => {
    await logError('render', new Error('à effacer'));
    await clearErrorLog();

    expect(await readErrorLog()).toEqual([]);
    expect(await metaRepo.get(META_KEYS.errors)).toBeUndefined();
  });
});
