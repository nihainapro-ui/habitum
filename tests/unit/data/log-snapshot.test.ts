import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { logsRepo, metaRepo } from '@/lib/data/repositories';
import {
  loadLogIndexComplet,
  loadLogIndexOuverture,
  memoriserOuverture,
} from '@/lib/data/log-index';
import { ecrireInstantane, lireInstantane, oublierInstantane } from '@/lib/data/log-snapshot';
import { META_KEYS, resetAll, seedEmpty } from '@/lib/data/seed';
import { logKey } from '@/lib/domain';

/* Tâche 5.10 — l'instantané du journal est un CACHE, pas une source de vérité.

   Ce fichier ne mesure pas la vitesse : il vérifie que le raccourci ne ment
   jamais. Une lecture d'ouverture qui rendrait une entrée effacée, ou qui
   raterait une écriture faite à la milliseconde du filigrane, échangerait deux
   secondes contre des chiffres faux — le pire marché possible (G3). */

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  await seedEmpty();
});

const ouvrir = () => loadLogIndexOuverture();

describe('sans instantané', () => {
  it('lit la fenêtre récente et se déclare INCOMPLET', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 3);

    const o = await ouvrir();
    expect(o.complete).toBe(false);
    expect(o.watermark).toBe('');
  });

  it('la relecture complète rend le même index que la table', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 3);
    await logsRepo.setValue('h2', '2020-01-01', 1);

    const { index, watermark } = await loadLogIndexComplet();
    expect(index.get(logKey('h1', '2026-08-05'))).toBe(3);
    expect(index.get(logKey('h2', '2020-01-01'))).toBe(1);
    expect(watermark).not.toBe('');
  });
});

describe('avec instantané', () => {
  it('se déclare COMPLET et rend ce que l’instantané contient', async () => {
    await logsRepo.setValue('h1', '2020-01-01', 7);
    const { index, watermark } = await loadLogIndexComplet();
    await memoriserOuverture(index, watermark);

    const o = await ouvrir();
    expect(o.complete).toBe(true);
    expect(o.aJour).toBe(true);
    /* Une entrée vieille de six ans, hors de toute fenêtre : elle ne peut venir
       que de l'instantané. */
    expect(o.index.get(logKey('h1', '2020-01-01'))).toBe(7);
  });

  it('rattrape ce qui a été écrit APRÈS lui', async () => {
    const { index, watermark } = await loadLogIndexComplet();
    await memoriserOuverture(index, watermark || '2026-01-01T00:00:00.000Z');

    await logsRepo.setValue('h1', '2026-08-05', 5);

    const o = await ouvrir();
    expect(o.index.get(logKey('h1', '2026-08-05'))).toBe(5);
    expect(o.aJour).toBe(false);
  });

  it('RETIRE une entrée effacée depuis — jamais sa valeur d’avant (G9)', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 4);
    const { index, watermark } = await loadLogIndexComplet();
    await memoriserOuverture(index, watermark);

    await logsRepo.tombstone('h1', '2026-08-05');

    const o = await ouvrir();
    expect(o.index.has(logKey('h1', '2026-08-05'))).toBe(false);
  });

  it('ne rate pas une écriture faite à la milliseconde du filigrane', async () => {
    /* Filigrane inclusif : l'écriture porte EXACTEMENT l'horodatage mémorisé.
       Avec un `>` strict, elle serait perdue jusqu'à la prochaine
       reconstruction — c'est-à-dire peut-être jamais. */
    const at = '2026-08-05T10:00:00.000Z';
    await db.logs.put({ habitId: 'h1', date: '2026-08-05', value: 9, updatedAt: at });
    await ecrireInstantane(new Map(), at);

    const o = await ouvrir();
    expect(o.index.get(logKey('h1', '2026-08-05'))).toBe(9);
  });

  it('un instantané mal formé est jeté plutôt que cru', async () => {
    await metaRepo.set(META_KEYS.logSnapshot, { at: 42 });
    expect(await lireInstantane()).toBeNull();
    expect((await ouvrir()).complete).toBe(false);
  });
});

describe('suppressions dures — le seul cas dangereux', () => {
  it('une réinitialisation emporte l’instantané', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 4);
    const { index, watermark } = await loadLogIndexComplet();
    await memoriserOuverture(index, watermark);

    await resetAll();

    /* Sans cet oubli, l'ouverture suivante ressusciterait une entrée d'un
       compte qu'on vient d'effacer : `logs.clear()` ne laisse aucune trace dans
       `updatedAt`, donc le delta ne peut pas la voir. */
    expect(await lireInstantane()).toBeNull();
    expect((await ouvrir()).index.size).toBe(0);
  });

  it('effacer le journal d’une habitude emporte l’instantané', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 4);
    const { index, watermark } = await loadLogIndexComplet();
    await memoriserOuverture(index, watermark);

    await logsRepo.deleteForHabit('h1');

    expect(await lireInstantane()).toBeNull();
    expect((await ouvrir()).index.size).toBe(0);
  });

  it('effacer UNE entrée emporte aussi l’instantané', async () => {
    await logsRepo.setValue('h1', '2026-08-05', 4);
    const { index, watermark } = await loadLogIndexComplet();
    await memoriserOuverture(index, watermark);

    await logsRepo.clear('h1', '2026-08-05');

    expect(await lireInstantane()).toBeNull();
  });
});

describe('memoriserOuverture', () => {
  it('n’enregistre rien sans filigrane — un instantané sans repère est intraçable', async () => {
    await memoriserOuverture(new Map([['h1|2026-08-05', 1]]), '');
    expect(await lireInstantane()).toBeNull();
  });

  it('oublierInstantane efface la clé', async () => {
    await ecrireInstantane(new Map(), '2026-08-05T10:00:00.000Z');
    await oublierInstantane();
    expect(await lireInstantane()).toBeNull();
  });
});
