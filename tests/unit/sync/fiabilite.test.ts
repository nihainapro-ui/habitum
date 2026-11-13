import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/data/db';
import { META_KEYS, habitsRepo, logsRepo, metaRepo, notesRepo } from '@/lib/data';
import { chiffrer, deriverCles, type Cles } from '@/lib/sync/crypto';
import { LOT_LIGNES, synchroniser, transportMemoire } from '@/lib/sync/engine';
import type { Transport } from '@/lib/sync/transport';
import type { SyncRow } from '@/lib/sync/types';

/* ============================================================================
   Phase 1 — la synchronisation ne perd plus de lignes (12 novembre 2026).

   Chaque test ci-dessous rejoue UN défaut de l'audit, tel qu'il se produisait :
   aucun ne levait d'erreur, tous laissaient deux appareils se croire à jour
   avec des bases différentes. C'est pour cela qu'ils ont chacun le leur.
   ========================================================================= */

const CODE = 'K7M29QPX3RTZ8HNV4WBD';
const ESPACE_TEST = 'X';
let cles: Cles;

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
  cles ??= await deriverCles(CODE);
  await metaRepo.set(META_KEYS.syncCode, CODE);
}, 30_000);

/** Passe à « l'autre appareil » : base vierge, même code. */
async function changerDAppareil(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
  await metaRepo.set(META_KEYS.syncCode, CODE);
}

/** Crée une habitude, puis laisse passer une milliseconde franche. Le filigrane
 *  est INCLUSIF (`>=`) : une ligne écrite dans la milliseconde même où part la
 *  synchronisation est renvoyée au passage suivant — sans dommage, mais les
 *  comptes de ces tests seraient alors à une unité près, au hasard de l'horloge. */
const habitude = async (name: string) => {
  const h = await habitsRepo.create({ name, type: 'check' } as never);
  await new Promise((r) => setTimeout(r, 3));
  return h;
};

describe('tirage paginé', () => {
  it('reçoit TOUT en un passage, même au-delà d’une page', async () => {
    /* Avant : une page, puis plus rien jusqu'au passage suivant. Un appareil
       neuf affichait les 500 premières lignes et se disait synchronisé. */
    const transport = transportMemoire({ page: 5 });
    for (let i = 0; i < 12; i++) await habitude(`H${i}`);
    await synchroniser({ transport, cles });

    await changerDAppareil();
    const r = await synchroniser({ transport, cles });

    expect((await habitsRepo.list()).length).toBe(12);
    expect(r.recus).toBeGreaterThanOrEqual(12);
  });

  it('s’en remet à la taille de la page face à un relais qui ne dit pas « encore »', async () => {
    /* Le relais déployé avant le 12 novembre ne rend pas `encore`. Le client
       doit rester juste contre lui : c'est lui qui sera en production le
       premier. Une page pleine (500) vaut alors « il en reste peut-être ». */
    const pleine: SyncRow[] = [];
    for (let i = 0; i < 500; i++) {
      pleine.push({
        kind: 'logs',
        id: `h|2020-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`,
        updatedAt: '2026-01-01T00:00:00.000Z',
        blob: 'illisible',
      });
    }
    const depuisVus: number[] = [];
    const ancien: Transport = {
      async tirer(_e, depuis) {
        depuisVus.push(depuis);
        return depuis === 0 ? { seq: 500, lignes: pleine } : { seq: depuis, lignes: [] };
      },
      pousser: async () => ({ seq: 500 }),
      effacer: async () => {},
    };

    await synchroniser({ transport: ancien, cles });

    expect(depuisVus).toEqual([0, 500]);
  });
});

describe('envoi par lots', () => {
  it('découpe un gros envoi au lieu de se heurter au plafond du relais', async () => {
    /* Avant : 450 lignes locales partaient d'un bloc. Au-delà de 500, le relais
       répondait 413 — à chaque passage, pour toujours. */
    const lignes = Array.from({ length: 450 }, (_, i) => ({
      habitId: 'h1',
      date: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      value: i,
      updatedAt: new Date().toISOString(),
    }));
    /* Clé primaire [habitId+date] : on varie l'habitude pour 450 lignes distinctes. */
    await logsRepo.bulkPut(lignes.map((l, i) => ({ ...l, habitId: `h${i}` })));

    const base = transportMemoire({ maxLignes: LOT_LIGNES });
    const tailles: number[] = [];
    const transport: Transport = {
      ...base,
      pousser: (e, l) => {
        tailles.push(l.length);
        return base.pousser(e, l);
      },
    };

    const r = await synchroniser({ transport, cles });

    expect(r.envoyes).toBe(450);
    expect(tailles.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...tailles)).toBeLessThanOrEqual(LOT_LIGNES);
  });

  it('écarte et COMPTE une ligne trop grosse, sans bloquer les autres', async () => {
    await habitude('Normale');
    await notesRepo.create({ kind: 'journal', date: '2026-01-01', body: 'x'.repeat(1_600_000) });

    const transport = transportMemoire();
    const r = await synchroniser({ transport, cles });

    expect(r.ecartees).toBe(1);
    expect(r.envoyes).toBeGreaterThanOrEqual(1);
    const { lignes } = await transport.tirer(ESPACE_TEST, 0);
    expect(lignes.some((l) => l.kind === 'habits')).toBe(true);
    expect(lignes.some((l) => l.kind === 'notes')).toBe(false);
  });
});

describe('curseur', () => {
  it('ne saute pas ce qu’un autre appareil écrit entre notre tirage et notre envoi', async () => {
    /* LE DÉFAUT : le curseur avançait jusqu'au `seq` de notre propre envoi.
       La ligne de l'autre appareil, écrite juste avant, portait un `seq`
       inférieur — et n'était plus jamais redemandée. */
    const base = transportMemoire();
    const etrangere: SyncRow = {
      kind: 'habits',
      id: 'venue-d-ailleurs',
      updatedAt: '2026-11-01T10:00:00.000Z',
      blob: await chiffrer(cles.cle, {
        id: 'venue-d-ailleurs',
        name: 'Écrite ailleurs',
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-01T10:00:00.000Z',
      }),
    };
    let glissee = false;
    const transport: Transport = {
      ...base,
      async pousser(e, l) {
        if (!glissee) {
          glissee = true;
          await base.pousser(e, [etrangere]);
        }
        return base.pousser(e, l);
      },
    };

    await habitude('La mienne');
    await synchroniser({ transport, cles });
    await synchroniser({ transport, cles });

    expect((await habitsRepo.list()).map((h) => h.name)).toContain('Écrite ailleurs');
  });

  it('ne compte pas comme reçu l’écho de ses propres envois', async () => {
    /* Le curseur ne suivant plus l'envoi, nos lignes nous reviennent. Les
       compter ferait recharger tout l'état de l'interface à chaque passage. */
    const transport = transportMemoire();
    await habitude('Courir');
    await synchroniser({ transport, cles });

    const second = await synchroniser({ transport, cles });

    expect(second.recus).toBe(0);
    expect(second.envoyes).toBe(0);
  });
});

describe('filigrane', () => {
  it('n’oublie pas une saisie faite PENDANT l’envoi', async () => {
    /* LE DÉFAUT : le filigrane était posé à la fin de l'aller-retour. Une
       habitude créée pendant l'envoi avait un horodatage antérieur : jamais
       relue, jamais envoyée. */
    const base = transportMemoire();
    let cree = false;
    const transport: Transport = {
      ...base,
      async pousser(e, l) {
        const rendu = await base.pousser(e, l);
        if (!cree) {
          cree = true;
          await new Promise((r) => setTimeout(r, 5));
          await habitude('Saisie pendant l’envoi');
          await new Promise((r) => setTimeout(r, 5));
        }
        return rendu;
      },
    };

    await habitude('Première');
    await synchroniser({ transport, cles });
    const second = await synchroniser({ transport, cles });

    expect(second.envoyes).toBe(1);
  });

  it('ne bouge pas quand l’envoi échoue : tout repart au passage suivant', async () => {
    const base = transportMemoire();
    let panne = true;
    const transport: Transport = {
      ...base,
      pousser: (e, l) => (panne ? Promise.reject(new Error('coupure')) : base.pousser(e, l)),
    };

    await habitude('À ne pas perdre');
    await expect(synchroniser({ transport, cles })).rejects.toThrow('coupure');

    panne = false;
    const r = await synchroniser({ transport, cles });
    expect(r.envoyes).toBeGreaterThanOrEqual(1);
  });
});

describe('espace vidé sur le relais', () => {
  it('repart de zéro et renvoie tout', async () => {
    /* Effacé depuis un autre appareil, ou purgé après six mois : le relais
       repart de `seq` 1. Avant, cet appareil gardait son curseur et son
       filigrane — il ne recevait plus rien et ne renvoyait que le neuf, et un
       troisième appareil appairé ensuite n'obtenait qu'une base partielle. */
    const transport = transportMemoire();
    await habitude('Ancienne');
    await synchroniser({ transport, cles });
    await synchroniser({ transport, cles });

    await transport.effacer(ESPACE_TEST);
    const r = await synchroniser({ transport, cles });

    expect(r.envoyes).toBeGreaterThanOrEqual(1);
    const { lignes } = await transport.tirer(ESPACE_TEST, 0);
    expect(lignes.some((l) => l.kind === 'habits')).toBe(true);
  });
});

describe('journal reçu', () => {
  it('oublie l’instantané d’ouverture, qui ne le verrait pas', async () => {
    /* Une ligne de journal reçue garde l'horodatage de l'appareil qui l'a
       saisie. S'il précède le filigrane de l'instantané, l'ouverture
       (instantané + delta) ne la lit jamais : en base, absente de l'écran. */
    const transport = transportMemoire();
    await logsRepo.putRaw({
      habitId: 'h1',
      date: '2026-10-01',
      value: 3,
      updatedAt: '2026-10-01T08:00:00.000Z',
    });
    await synchroniser({ transport, cles });

    await changerDAppareil();
    await metaRepo.set(META_KEYS.logSnapshot, { at: '2026-11-01T00:00:00.000Z', entries: {} });
    await synchroniser({ transport, cles });

    expect(await logsRepo.get('h1', '2026-10-01')).toBeDefined();
    expect(await metaRepo.get(META_KEYS.logSnapshot)).toBeUndefined();
  });
});
