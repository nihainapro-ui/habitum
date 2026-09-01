import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, habitsRepo, metaRepo } from '@/lib/data';
import { chiffrer, dechiffrer, deriverCles } from '@/lib/sync/crypto';
import { synchroniser, transportMemoire } from '@/lib/sync/engine';
import type { Transport } from '@/lib/sync/transport';
import type { SyncRow } from '@/lib/sync/types';
import type { Cles } from '@/lib/sync/crypto';

const CODE = 'K7M29QPX3RTZ8HNV4WBD';
let cles: Cles;
let transport: Transport;

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

/* Une seule dérivation pour tout le fichier : PBKDF2 à 600 000 itérations
   coûte ~0,3 s, et la répéter à chaque test ferait un fichier de trois minutes. */
async function preparer() {
  cles ??= await deriverCles(CODE);
  transport = transportMemoire();
  await metaRepo.set(META_KEYS.syncCode, CODE);
}

describe('un aller-retour', () => {
  it('envoie ce qui est local et n’en reçoit rien de plus', async () => {
    await preparer();
    await habitsRepo.create({ name: 'Courir', type: 'check' } as never);

    const r = await synchroniser({ transport, cles });

    expect(r.envoyes).toBeGreaterThanOrEqual(1);
    expect(r.recus).toBe(0);
  });

  it('n’envoie plus rien au second passage', async () => {
    /* Le filigrane fait tout le travail : sans lui, chaque synchronisation
       repousserait la base entière, et le palier gratuit fondrait. */
    await preparer();
    await habitsRepo.create({ name: 'Courir', type: 'check' } as never);

    await synchroniser({ transport, cles });
    const second = await synchroniser({ transport, cles });

    expect(second.envoyes).toBe(0);
  });

  it('avance le curseur et note l’heure du succès', async () => {
    await preparer();
    await habitsRepo.create({ name: 'Courir', type: 'check' } as never);
    await synchroniser({ transport, cles });

    expect(await metaRepo.get<number>(META_KEYS.syncCursor)).toBeGreaterThan(0);
    expect(await metaRepo.get<string>(META_KEYS.syncLastAt)).toBeTruthy();
  });
});

describe('deux appareils', () => {
  /* Un seul transport en mémoire, deux bases successives : c'est la façon la
     plus fidèle de simuler deux appareils sans monter deux IndexedDB. */
  it('fait apparaître sur B ce qui a été créé sur A', async () => {
    await preparer();
    const partage = transport;

    await habitsRepo.create({ name: 'Créée sur A', type: 'check' } as never);
    await synchroniser({ transport: partage, cles });

    /* Appareil B : base vierge, même code. */
    db.close();
    await db.delete();
    await db.open();
    await metaRepo.set(META_KEYS.syncCode, CODE);

    const r = await synchroniser({ transport: partage, cles });

    expect(r.recus).toBeGreaterThanOrEqual(1);
    const noms = (await habitsRepo.list()).map((h) => h.name);
    expect(noms).toContain('Créée sur A');
  });

  it('fait disparaître sur B ce qui a été supprimé sur A', async () => {
    await preparer();
    const partage = transport;

    const h = await habitsRepo.create({ name: 'À jeter', type: 'check' } as never);
    await synchroniser({ transport: partage, cles });
    await habitsRepo.softDelete(h.id);
    await synchroniser({ transport: partage, cles });

    db.close();
    await db.delete();
    await db.open();
    await metaRepo.set(META_KEYS.syncCode, CODE);
    await synchroniser({ transport: partage, cles });

    /* Les deux faces d'une suppression reçue : l'habitude disparaît du produit,
       ET la pierre tombale est bien posée. Sans la seconde, B renaîtrait
       ignorant à la prochaine synchronisation et repousserait la version
       d'avant. `list`/`get` masquent les supprimées, `listAll` les voit
       (lib/data/repositories/base.ts). */
    expect((await habitsRepo.list()).map((x) => x.id)).not.toContain(h.id);
    expect((await habitsRepo.listAll()).find((x) => x.id === h.id)?.deletedAt).toBeTruthy();
  });

  it('refuse une version périmée qui ressusciterait une suppression', async () => {
    /* LA COURSE QUE CE TEST REJOUE : B a tiré AVANT que la suppression n'arrive
       et pousse sa version d'avant juste après ; le serveur la lui renvoie au
       tour suivant. Le piège est qu'à ce moment la ligne reçue est parfaitement
       valide — elle déchiffre, elle a le bon genre, le bon identifiant. SEUL
       son horodatage la trahit. Sans le garde-fou de `engine.ts`, elle
       écraserait la pierre tombale et l'habitude reviendrait d'entre les morts.

       Le transport est ici un mannequin plutôt que `transportMemoire` : ce
       dernier arbitre côté serveur et n'émettrait JAMAIS cette ligne. Or c'est
       la défense du CLIENT qu'on veut éprouver, pas celle du serveur — elle
       compte seule le jour où un serveur plus laxiste laisse passer. */
    await preparer();

    const h = await habitsRepo.create({ name: 'Fantôme', type: 'check' } as never);
    const avant = (await habitsRepo.listAll()).find((x) => x.id === h.id)!;
    await habitsRepo.softDelete(h.id);
    const tombale = (await habitsRepo.listAll()).find((x) => x.id === h.id)!;

    /* L'horodatage est ANTIDATÉ explicitement. Création et suppression tombent
       dans la même milliseconde — reprendre `avant.updatedAt` tel quel donnerait
       deux horodatages égaux, où la distante l'emporte délibérément (voir le
       commentaire de `engine.ts`) : le test passerait au vert en n'éprouvant
       rien. Une minute d'écart place la ligne franchement dans le passé, ce
       qu'est vraiment une version d'avant la suppression. */
    const perimee: SyncRow = {
      kind: 'habits',
      id: h.id,
      updatedAt: new Date(Date.parse(tombale.updatedAt) - 60_000).toISOString(),
      blob: await chiffrer(cles.cle, { ...avant, deletedAt: undefined }),
    };
    expect(perimee.updatedAt < tombale.updatedAt).toBe(true);

    let pousse: SyncRow[] = [];
    const laxiste: Transport = {
      async tirer() {
        return { seq: 1, lignes: [perimee] };
      },
      async pousser(_espace, entrantes) {
        pousse = entrantes;
        return { seq: 1 };
      },
    };

    const r = await synchroniser({ transport: laxiste, cles });

    /* Trois assertions, trois choses distinctes. La ligne est écartée... */
    expect(r.recus).toBe(0);
    /* ...la pierre tombale locale est intacte (`get` la masque par
       construction, `listAll` la voit — voir lib/data/repositories/base.ts)... */
    const apres = (await habitsRepo.listAll()).find((x) => x.id === h.id);
    expect(apres?.deletedAt).toBeTruthy();
    expect(await habitsRepo.get(h.id)).toBeUndefined();
    /* ...et B ne se contente pas de se taire : il REPOUSSE la suppression, sans
       quoi le serveur garderait à jamais la version périmée. */
    const renvoyee = pousse.find((x) => x.kind === 'habits' && x.id === h.id);
    expect(renvoyee).toBeDefined();
    expect(await dechiffrer<{ deletedAt?: string }>(cles.cle, renvoyee!.blob)).toHaveProperty(
      'deletedAt',
    );
  });

}, 30_000);

describe('inactif', () => {
  it('ne touche à rien sans code', async () => {
    cles ??= await deriverCles(CODE);
    const t = transportMemoire();
    let appels = 0;
    const compte: Transport = {
      tirer: (...a) => {
        appels += 1;
        return t.tirer(...a);
      },
      pousser: (...a) => {
        appels += 1;
        return t.pousser(...a);
      },
    };

    await habitsRepo.create({ name: 'Seule', type: 'check' } as never);
    await synchroniser({ transport: compte, cles });

    expect(appels).toBe(0);
  }, 30_000);
});
