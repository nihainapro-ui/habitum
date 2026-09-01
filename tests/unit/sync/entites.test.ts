import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { habitsRepo, logsRepo, metaRepo } from '@/lib/data';
import { CLES_META_SYNCHRONISEES, ecrire, lireDepuis, lireUne } from '@/lib/sync/entites';

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

const EPOQUE = '1970-01-01T00:00:00.000Z';

describe('lecture depuis un filigrane', () => {
  it('remonte une habitude créée', async () => {
    const h = await habitsRepo.create({ name: 'Courir', type: 'check' } as never);
    const lignes = await lireDepuis(EPOQUE);
    expect(lignes.some((l) => l.kind === 'habits' && l.id === h.id)).toBe(true);
  });

  it('remonte une entrée de journal sous la clé habitId|date', async () => {
    await logsRepo.setValue('h1', '2026-09-01' as never, 3);
    const lignes = await lireDepuis(EPOQUE);
    expect(lignes.some((l) => l.kind === 'logs' && l.id === 'h1|2026-09-01')).toBe(true);
  });

  it('ignore ce qui est antérieur au filigrane', async () => {
    await habitsRepo.create({ name: 'Ancienne', type: 'check' } as never);
    const lignes = await lireDepuis('2999-01-01T00:00:00.000Z');
    expect(lignes).toHaveLength(0);
  });

  it('remonte les suppressions logiques', async () => {
    /* Une entité effacée DOIT voyager : c'est ainsi que l'autre appareil
       apprend l'effacement. Ne pas la remonter, c'est la ressusciter. */
    const h = await habitsRepo.create({ name: 'À jeter', type: 'check' } as never);
    await habitsRepo.softDelete(h.id);
    const lignes = await lireDepuis(EPOQUE);
    expect(lignes.some((l) => l.kind === 'habits' && l.id === h.id)).toBe(true);
  });

  it('ne remonte que les deux clés meta retenues', async () => {
    await metaRepo.set('settings', { theme: 'neural' });
    await metaRepo.set('timer', { startedAt: 1 });
    await metaRepo.set('errors', [{ at: 'x' }]);

    const meta = (await lireDepuis(EPOQUE)).filter((l) => l.kind === 'meta');
    expect(meta.map((l) => l.id).sort()).toEqual(['settings']);
    expect(CLES_META_SYNCHRONISEES).toEqual(['settings', 'occ']);
  });
});

describe('écriture', () => {
  it('écrit une habitude reçue en gardant son horodatage', async () => {
    const ancien = '2020-01-01T00:00:00.000Z';
    await ecrire(
      'habits',
      'venue',
      {
        id: 'venue',
        name: 'Reçue',
        type: 'check',
        createdAt: ancien,
        updatedAt: ancien,
      },
      ancien,
    );

    const relu = await lireUne('habits', 'venue');
    expect(relu?.updatedAt).toBe(ancien);
  });

  it('écrit une entrée de journal reçue', async () => {
    await ecrire(
      'logs',
      'h9|2026-09-02',
      {
        habitId: 'h9',
        date: '2026-09-02',
        value: 7,
        updatedAt: '2026-09-02T08:00:00.000Z',
      },
      '2026-09-02T08:00:00.000Z',
    );

    expect((await logsRepo.get('h9', '2026-09-02' as never))?.value).toBe(7);
  });

  it('fait un aller-retour lecture → écriture sans rien perdre', async () => {
    const h = await habitsRepo.create({ name: 'Aller-retour', type: 'count' } as never);
    const ligne = await lireUne('habits', h.id);
    await ecrire('habits', h.id, ligne!.valeur, ligne!.updatedAt);
    expect((await lireUne('habits', h.id))?.valeur).toEqual(ligne!.valeur);
  });

  it("écrit une clé meta reçue en gardant l'horodatage transmis, sans le déduire de la valeur", async () => {
    /* C'est CE test qui garantit la décision du 2026-09-01 : `valeur` pour
       `meta` est le CONTENU (`settings`, `occ`), pas la ligne — il ne porte
       aucun `updatedAt`. Un horodatage ancien passé explicitement ne doit
       jamais être remplacé par `new Date()`. */
    const ancien = '2019-06-01T00:00:00.000Z';
    await ecrire('meta', 'settings', { theme: 'neural' }, ancien);

    const relu = await lireUne('meta', 'settings');
    expect(relu?.updatedAt).toBe(ancien);
    expect(relu?.valeur).toEqual({ theme: 'neural' });
  });
});
