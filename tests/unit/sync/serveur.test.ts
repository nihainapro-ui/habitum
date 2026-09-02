import { describe, expect, it } from 'vitest';
import {
  accepterLigne,
  doitRafraichir,
  ligneValide,
  RETENTION_JOURS,
  seuilExpiration,
} from '../../../sync-server/src/logique';

const l = (updatedAt: string, blob = 'AAA') => ({ updatedAt, blob });

describe('arbitrage serveur', () => {
  it('accepte une ligne inconnue', () => {
    expect(accepterLigne(undefined, l('2026-09-01T10:00:00.000Z'))).toBe(true);
  });

  it('refuse une ligne périmée', () => {
    /* Sans ce refus, un appareil resté hors ligne une semaine écraserait au
       retour tout ce qui a été fait entre-temps. */
    expect(accepterLigne(l('2026-09-08T00:00:00.000Z'), l('2026-09-01T00:00:00.000Z'))).toBe(false);
  });

  it('applique exactement la même règle que le client', async () => {
    /* Si les deux règles divergent, un appareil pousse en boucle une ligne que
       le serveur refuse, sans que rien ne le signale. */
    const { distanteGagne } = await import('@/lib/sync/merge');
    const cas = [
      [undefined, l('2026-01-01T00:00:00.000Z')],
      [l('2026-01-01T00:00:00.000Z'), l('2026-01-02T00:00:00.000Z')],
      [l('2026-01-02T00:00:00.000Z'), l('2026-01-01T00:00:00.000Z')],
      [l('2026-01-01T00:00:00.000Z', 'A'), l('2026-01-01T00:00:00.000Z', 'Z')],
      [l('2026-01-01T00:00:00.000Z', 'Z'), l('2026-01-01T00:00:00.000Z', 'A')],
    ] as const;

    for (const [stockee, entrante] of cas) {
      expect(accepterLigne(stockee, entrante)).toBe(distanteGagne(stockee, entrante));
    }
  });
});

describe('validation des lignes entrantes', () => {
  /* Le corps JSON d'une requête n'a aucune forme garantie : une ligne peut
     manquer un champ, ou ne pas être un objet du tout. Ces cas doivent être
     ignorés silencieusement (`continue` côté Worker), jamais planter — voir
     le commentaire de `ligneValide` dans sync-server/src/logique.ts. */

  it('rejette une ligne sans kind', () => {
    expect(ligneValide({ id: 'x', updatedAt: '2026-01-01T00:00:00.000Z', blob: 'AAA' })).toBe(
      false,
    );
  });

  it('rejette une ligne sans id', () => {
    expect(ligneValide({ kind: 'x', updatedAt: '2026-01-01T00:00:00.000Z', blob: 'AAA' })).toBe(
      false,
    );
  });

  it('rejette une ligne null', () => {
    expect(ligneValide(null)).toBe(false);
  });

  it('rejette une ligne qui n’est pas un objet', () => {
    expect(ligneValide('AAA')).toBe(false);
    expect(ligneValide(42)).toBe(false);
    expect(ligneValide(undefined)).toBe(false);
  });

  it('accepte une ligne complète', () => {
    expect(
      ligneValide({ kind: 'x', id: 'y', updatedAt: '2026-01-01T00:00:00.000Z', blob: 'AAA' }),
    ).toBe(true);
  });
});

/* --- La route d'effacement -------------------------------------------------

   Le Worker est ici exercé pour de vrai, avec une D1 en toc. C'est le seul
   test du dépôt qui traverse `index.ts` : `logique.ts` couvre l'arbitrage,
   mais le ROUTAGE — quelle méthode fait quoi, quel espace est refusé — n'était
   couvert par rien. Or l'effacement est la seule opération irréversible du
   serveur, et la seule dont une erreur d'aiguillage détruirait des données.

   La doublure ne simule pas SQLite : elle retient les requêtes reçues et leurs
   paramètres. C'est exactement ce qu'on veut vérifier — que `DELETE` porte sur
   l'espace demandé, et sur lui seul. */

interface RequeteVue {
  sql: string;
  params: unknown[];
}

function d1Factice(reponse: unknown = { seq: 0 }, lignes: unknown[] = []) {
  const vues: RequeteVue[] = [];
  const db = {
    prepare(sql: string) {
      const vue: RequeteVue = { sql, params: [] };
      vues.push(vue);
      const st = {
        bind(...p: unknown[]) {
          vue.params = p;
          return st;
        },
        first: async () => reponse,
        all: async () => ({ results: lignes }),
        run: async () => ({}),
      };
      return st;
    },
  };
  return { db, vues };
}

const ESPACE_VALIDE = 'K7M29QPX3RTZ8HNV4WBDK7M29QPX3RTZ';

describe('effacement d’un espace', () => {
  it('efface les lignes de CET espace, et rend un espace neuf', async () => {
    const { default: worker } = await import('../../../sync-server/src/index');
    const { db, vues } = d1Factice();

    const r = await worker.fetch(
      new Request(`https://x/v1/${ESPACE_VALIDE}`, { method: 'DELETE' }),
      { DB: db } as never,
    );

    expect(r.status).toBe(200);
    /* `seq: 0` remet le client à l'état d'un espace vierge : sans cela, il
       garderait un curseur pointant des lignes qui n'existent plus et ne
       redemanderait jamais celles qui viendront après. */
    expect(await r.json()).toEqual({ seq: 0 });

    const suppression = vues.find((v) => v.sql.startsWith('DELETE'));
    expect(suppression).toBeDefined();
    /* LA CLAUSE QUI COMPTE : sans `WHERE espace = ?`, un désappairage viderait
       la table de TOUS les utilisateurs. */
    expect(suppression!.sql).toContain('WHERE espace = ?');
    expect(suppression!.params).toEqual([ESPACE_VALIDE]);
  });

  it('refuse un espace mal formé sans rien effacer', async () => {
    const { default: worker } = await import('../../../sync-server/src/index');
    const { db, vues } = d1Factice();

    const r = await worker.fetch(new Request('https://x/v1/pas-un-espace', { method: 'DELETE' }), {
      DB: db,
    } as never);

    expect(r.status).toBe(400);
    /* Aucune requête ne doit avoir été préparée : le refus est prononcé AVANT
       de toucher à la base. */
    expect(vues).toEqual([]);
  });

  it('annonce l’effacement parmi les méthodes autorisées', async () => {
    /* L'application est servie depuis une autre origine : si `DELETE` manque
       de la liste CORS, le navigateur bloque la requête avant qu'elle parte,
       et l'utilisateur voit une panne réseau au lieu d'un effacement. */
    const { default: worker } = await import('../../../sync-server/src/index');
    const { db } = d1Factice();

    const r = await worker.fetch(
      new Request(`https://x/v1/${ESPACE_VALIDE}`, { method: 'OPTIONS' }),
      { DB: db } as never,
    );

    expect(r.headers.get('access-control-allow-methods')).toContain('DELETE');
  });
});

/* --- Expiration des espaces abandonnés ---------------------------------- */

const JOUR = 86_400_000;
const MAINTENANT = Date.parse('2026-09-02T12:00:00.000Z');

describe('règle d’expiration', () => {
  it('retient six mois', () => {
    expect(RETENTION_JOURS).toBe(180);
    expect(seuilExpiration(MAINTENANT)).toBe(MAINTENANT - 180 * JOUR);
  });

  it('épargne un usage saisonnier', () => {
    /* On décroche l'été, on reprend en septembre. Trois mois de silence ne
       doivent jamais coûter ses données à quelqu'un. */
    const troisMois = MAINTENANT - 90 * JOUR;
    expect(troisMois > seuilExpiration(MAINTENANT)).toBe(true);
  });

  it('ne rafraîchit la marque qu’une fois par jour', () => {
    /* Écrire à chaque lecture doublerait le nombre d'écritures du serveur —
       or c'est le quota que cette fonctionnalité cherche à ménager. */
    expect(doitRafraichir(undefined, MAINTENANT)).toBe(true);
    expect(doitRafraichir(MAINTENANT - 60_000, MAINTENANT)).toBe(false);
    expect(doitRafraichir(MAINTENANT - JOUR, MAINTENANT)).toBe(true);
  });
});

describe('purge', () => {
  it('efface les lignes AVANT la marque, et jamais l’inverse', async () => {
    /* L'ORDRE EST L'INVARIANT. Interrompue entre les deux, la purge laisse un
       espace vide mais marqué : il repassera au tour suivant, sans dommage.
       Dans l'autre sens, elle laisserait des lignes que plus aucune marque ne
       désigne — invisibles pour la purge, donc éternelles. C'est exactement la
       fuite que cette fonctionnalité vient fermer. */
    const { purger } = await import('../../../sync-server/src/index');
    const { db, vues } = d1Factice(undefined, [{ espace: 'MORT' }]);

    const efface = await purger({ DB: db } as never, MAINTENANT);

    expect(efface).toBe(1);
    const ordre = vues.filter((v) => v.sql.startsWith('DELETE')).map((v) => v.sql);
    expect(ordre[0]).toContain('FROM lignes');
    expect(ordre[1]).toContain('FROM espaces');
  });

  it('ne demande que les espaces sous le seuil', async () => {
    const { purger } = await import('../../../sync-server/src/index');
    const { db, vues } = d1Factice(undefined, [{ espace: 'MORT' }]);

    await purger({ DB: db } as never, MAINTENANT);

    /* La sélection porte sur `touche_le`, l'horodatage posé par le SERVEUR —
       jamais sur `updated_at`, qui vient du client et dont l'horloge peut
       être déréglée. */
    const selection = vues.find((v) => v.sql.startsWith('SELECT espace'))!;
    expect(selection.sql).toContain('touche_le < ?');
    expect(selection.params).toEqual([MAINTENANT - 180 * JOUR]);
  });

  it('n’efface rien quand aucun espace n’a expiré', async () => {
    const { purger } = await import('../../../sync-server/src/index');
    /* `all()` de la doublure rend une liste vide : aucun espace sous le seuil. */
    const { db, vues } = d1Factice();

    expect(await purger({ DB: db } as never, MAINTENANT)).toBe(0);
    expect(vues.filter((v) => v.sql.startsWith('DELETE'))).toEqual([]);
  });
});
