import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import worker from '../../../sync-server/src/index';
import {
  ligneValide,
  MAX_BLOB,
  MAX_CORPS,
  MAX_ECRITURES,
  MAX_ID,
  MAX_LIGNES,
  REQUETES_PAR_MINUTE,
} from '../../../sync-server/src/logique';
import { LIGNE_MAX_CARACTERES, LOT_CARACTERES, LOT_LIGNES } from '@/lib/sync/engine';
import { PAGE_TIRAGE, SYNC_KINDS } from '@/lib/sync/types';

/* ============================================================================
   Phase 1 — les limites du relais (12 novembre 2026).

   Deux familles de contrôles : ce que le relais REFUSE désormais, et — plus
   important — que ces refus ne touchent jamais ce que le client envoie pour
   de bon. Une limite posée trop bas ne protège pas le relais : elle casse la
   synchronisation de quelqu'un, en silence.
   ========================================================================= */

const ESPACE = 'K7M29QPX3RTZ8HNV4WBDK7M29QPX3RTZ';
const URL_ESPACE = `https://x/v1/${ESPACE}`;

interface Vue {
  sql: string;
  params: unknown[];
}

/** D1 en toc : retient les requêtes, rend ce qu'on lui dit. */
function d1(first: unknown = { seq: 0 }, all: unknown[] = []) {
  const vues: Vue[] = [];
  const db = {
    prepare(sql: string) {
      const vue: Vue = { sql, params: [] };
      vues.push(vue);
      const st = {
        bind(...p: unknown[]) {
          vue.params = p;
          return st;
        },
        first: async () => first,
        all: async () => ({ results: all }),
        run: async () => ({}),
      };
      return st;
    },
  };
  return { db, vues };
}

const ligne = (surcharge: Record<string, unknown> = {}) => ({
  kind: 'habits',
  id: 'h1',
  updatedAt: '2026-11-12T10:00:00.000Z',
  blob: 'AAAA',
  ...surcharge,
});

const poster = (corps: string, env: unknown, entetes: Record<string, string> = {}) =>
  worker.fetch(
    new Request(URL_ESPACE, { method: 'POST', body: corps, headers: entetes }),
    env as never,
  );

describe('ce que le client envoie passe toujours', () => {
  it('chaque genre du produit est un genre recevable', () => {
    /* Le relais ne connaît pas la liste, seulement la FORME d'un genre. Si un
       genre du produit n'y entrait pas, toutes ses lignes seraient ignorées. */
    for (const kind of SYNC_KINDS) expect(ligneValide(ligne({ kind }))).toBe(true);
  });

  it('les plafonds du client tiennent sous ceux du relais', () => {
    expect(LOT_LIGNES).toBeLessThanOrEqual(MAX_LIGNES);
    expect(LIGNE_MAX_CARACTERES).toBeLessThanOrEqual(MAX_BLOB);
    /* Un lot plein, sa plus grosse ligne, et l'enrobage JSON de 200 lignes. */
    expect(LOT_CARACTERES + LIGNE_MAX_CARACTERES + LOT_LIGNES * 400).toBeLessThan(MAX_CORPS);
    /* La page que le client suppose est celle que le relais sert. */
    expect(PAGE_TIRAGE).toBe(MAX_LIGNES);
  });

  it('accepte les identifiants et horodatages que l’application produit', () => {
    expect(ligneValide(ligne({ kind: 'logs', id: `${crypto.randomUUID()}|2026-11-12` }))).toBe(
      true,
    );
    expect(ligneValide(ligne({ updatedAt: new Date().toISOString() }))).toBe(true);
  });
});

describe('ce que le relais refuse', () => {
  it('une ligne démesurée, un identifiant sans fin, un genre fantaisiste', () => {
    expect(ligneValide(ligne({ blob: 'A'.repeat(MAX_BLOB + 1) }))).toBe(false);
    expect(ligneValide(ligne({ id: 'x'.repeat(MAX_ID + 1) }))).toBe(false);
    expect(ligneValide(ligne({ kind: 'habits; DROP' }))).toBe(false);
    expect(ligneValide(ligne({ kind: 'x'.repeat(33) }))).toBe(false);
  });

  it('un horodatage qui n’en est pas un', () => {
    /* L'arbitrage compare des chaînes : « ~ » gagnerait tous les arbitrages à
       venir et figerait la ligne pour tous les appareils, pour toujours. */
    expect(ligneValide(ligne({ updatedAt: '~' }))).toBe(false);
    expect(ligneValide(ligne({ updatedAt: '9999' }))).toBe(false);
  });

  it('un corps trop gros — annoncé ou non — sans toucher à la base', async () => {
    const { db, vues } = d1();

    const annonce = await poster('{}', { DB: db }, { 'content-length': String(MAX_CORPS + 1) });
    expect(annonce.status).toBe(413);

    const reel = await poster(JSON.stringify({ lignes: [], bourre: 'x'.repeat(MAX_CORPS) }), {
      DB: db,
    });
    expect(reel.status).toBe(413);
    expect(vues).toEqual([]);
  });

  it('un corps qui n’est pas un objet', async () => {
    const { db } = d1();
    expect((await poster('null', { DB: db })).status).toBe(400);
    expect((await poster('pas du json', { DB: db })).status).toBe(400);
  });

  it('un espace qui a épuisé ses écritures : 507, et rien n’est écrit', async () => {
    const { db, vues } = d1({ seq: MAX_ECRITURES });

    const r = await poster(JSON.stringify({ lignes: [ligne()] }), { DB: db });

    expect(r.status).toBe(507);
    expect(vues.some((v) => v.sql.includes('INSERT INTO lignes'))).toBe(false);
  });
});

describe('limite de débit', () => {
  it('répond 429 quand le limiteur dit non, AVANT de toucher à la base', async () => {
    const { db, vues } = d1();
    const cles: string[] = [];
    const LIMITE = {
      limit: async ({ key }: { key: string }) => {
        cles.push(key);
        return { success: false };
      },
    };

    const r = await worker.fetch(new Request(URL_ESPACE), { DB: db, LIMITE } as never);

    expect(r.status).toBe(429);
    expect(vues).toEqual([]);
    /* LA CLÉ EST L'ESPACE. Ce serveur promet de ne pas regarder qui appelle :
       une adresse IP ici serait cette promesse rompue. */
    expect(cles).toEqual([ESPACE]);
    /* Sans CORS, le navigateur ne verrait qu'une panne réseau, pas un 429. */
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('un limiteur en panne ne coupe pas le service', async () => {
    const { db } = d1();
    const LIMITE = { limit: async () => Promise.reject(new Error('indisponible')) };

    const r = await worker.fetch(new Request(URL_ESPACE), { DB: db, LIMITE } as never);

    expect(r.status).toBe(200);
  });

  it('fonctionne sans limiteur branché', async () => {
    const { db } = d1();
    expect((await worker.fetch(new Request(URL_ESPACE), { DB: db } as never)).status).toBe(200);
  });

  it('wrangler.toml déclare la liaison que le code lit, au débit que le code documente', () => {
    const toml = readFileSync('sync-server/wrangler.toml', 'utf8');
    expect(toml).toMatch(/\[\[ratelimits\]\]\s*\nname = "LIMITE"/);
    expect(toml).toContain(`limit = ${REQUETES_PAR_MINUTE}`);
    expect(toml).toContain('period = 60');
  });
});

describe('lecture paginée', () => {
  const stockee = (seq: number) => ({
    kind: 'habits',
    id: `h${seq}`,
    updated_at: '2026-11-12T10:00:00.000Z',
    seq,
    blob: 'AAAA',
  });

  it('dit « encore » quand il reste des lignes, et ne sert que la page', async () => {
    /* Le relais lit UNE ligne de plus que la page : c'est elle qui répond. */
    const lues = Array.from({ length: MAX_LIGNES + 1 }, (_, i) => stockee(i + 1));
    const { db, vues } = d1({ seq: 0 }, lues);

    const r = await worker.fetch(new Request(`${URL_ESPACE}?depuis=0`), { DB: db } as never);
    const corps = (await r.json()) as { seq: number; lignes: unknown[]; encore: boolean };

    expect(corps.lignes).toHaveLength(MAX_LIGNES);
    expect(corps.encore).toBe(true);
    /* Le curseur est celui de la dernière ligne SERVIE, pas de la ligne témoin. */
    expect(corps.seq).toBe(MAX_LIGNES);
    expect(vues.find((v) => v.sql.includes('ORDER BY seq'))!.params).toEqual([
      ESPACE,
      0,
      MAX_LIGNES + 1,
    ]);
  });

  it('dit « plus rien » sur une dernière page', async () => {
    const { db } = d1({ seq: 0 }, [stockee(1), stockee(2)]);

    const r = await worker.fetch(new Request(`${URL_ESPACE}?depuis=0`), { DB: db } as never);
    const corps = (await r.json()) as { encore: boolean; tete?: number };

    expect(corps.encore).toBe(false);
    expect(corps.tete).toBeUndefined();
  });

  it('rend la tête de l’espace sur une page vide', async () => {
    /* C'est elle qui apprend à un client que l'espace a été vidé : sa tête
       (3) est sous le curseur qu'il présente (900). */
    const { db } = d1({ seq: 3 }, []);

    const r = await worker.fetch(new Request(`${URL_ESPACE}?depuis=900`), { DB: db } as never);

    expect(await r.json()).toEqual({ seq: 900, lignes: [], encore: false, tete: 3 });
  });
});
