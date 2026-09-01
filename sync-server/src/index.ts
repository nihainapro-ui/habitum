import { accepterLigne, ligneValide } from './logique';

/* Interfaces D1 minimales, déclarées ici plutôt que fournies par
 * `@cloudflare/workers-types` : ce paquet n'est PAS ajouté au dépôt — aucune
 * dépendance de plus, aucune nouvelle surface d'approvisionnement, pour une
 * surface réellement employée qui tient en cinq méthodes. Le contrôle de
 * vérité sur la conformité au runtime Cloudflare reste `wrangler deploy`, pas
 * cette déclaration locale ni la compilation TypeScript du dépôt (qui exclut
 * ce dossier — voir `tsconfig.json`). Détails dans `sync-server/README.md`. */
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/* Le Worker. Deux routes, aucune notion de compte.
 *
 * L'AUTHENTIFICATION EST LE PORTEUR DE L'ESPACE : 32 caractères dérivés d'un
 * code de 100 bits. Qui le connaît lit et écrit des octets chiffrés qu'il ne
 * peut de toute façon pas déchiffrer sans la clé — laquelle ne sort jamais de
 * l'appareil. Il n'y a rien d'autre à protéger.
 *
 * AUCUN JOURNAL : ni adresse IP, ni horodatage de requête. Un serveur qui ne
 * peut pas lire les données mais garde qui se connecte quand n'est pas aveugle. */

interface Env {
  DB: D1Database;
}

const ESPACE = /^[0-9A-HJKMNP-TV-Z]{32}$/;
const MAX_LIGNES = 500;

const json = (corps: unknown, statut = 200): Response =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'content-type': 'application/json',
      /* L'application est servie depuis une AUTRE origine (Vercel, ou
         `https://localhost` dans l'APK) : sans CORS, le navigateur bloque
         tout. `*` est acceptable ici — l'espace est le secret, pas l'origine. */
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return json({});

    const url = new URL(req.url);
    const espace = url.pathname.split('/')[2] ?? '';
    if (!ESPACE.test(espace)) return json({ erreur: 'espace' }, 400);

    if (req.method === 'GET') {
      const depuis = Number(url.searchParams.get('depuis') ?? 0) || 0;
      const { results } = await env.DB.prepare(
        'SELECT kind, id, updated_at, seq, blob FROM lignes WHERE espace = ? AND seq > ? ORDER BY seq LIMIT ?',
      )
        .bind(espace, depuis, MAX_LIGNES)
        .all<{ kind: string; id: string; updated_at: string; seq: number; blob: string }>();

      /* Le curseur rendu est le `seq` de la DERNIÈRE ligne servie, pas le
         plus grand `seq` de l'espace : avec la limite, il reste peut-être
         des lignes, et le client doit revenir les chercher. */
      const seq = results.length ? results[results.length - 1]!.seq : depuis;
      return json({
        seq,
        lignes: results.map((r) => ({
          kind: r.kind,
          id: r.id,
          updatedAt: r.updated_at,
          blob: r.blob,
        })),
      });
    }

    if (req.method === 'POST') {
      /* Un corps non-JSON lève au `.json()`. Sans ce filet, l'exception sort
         de `fetch` et la réponse d'erreur du runtime n'a pas les en-têtes
         CORS posés par `json()` — le navigateur ne voit alors qu'une erreur
         opaque, jamais un 400 lisible. */
      let corps: { lignes?: unknown };
      try {
        corps = (await req.json()) as { lignes?: unknown };
      } catch {
        return json({ erreur: 'corps' }, 400);
      }

      const lignes = Array.isArray(corps.lignes) ? corps.lignes : [];
      if (lignes.length > MAX_LIGNES) return json({ erreur: 'trop de lignes' }, 413);

      try {
        /* `seq` attribué à la DERNIÈRE ligne acceptée pendant cette requête —
           c'est ce que la réponse rend. Reste `undefined` si aucune ligne
           n'a été acceptée : dans ce cas la requête ne modifie rien, elle se
           contente de lire le maximum courant plus bas. */
        let dernierSeq: number | undefined;

        for (const brute of lignes) {
          if (!ligneValide(brute)) continue;

          const stockee = await env.DB.prepare(
            'SELECT updated_at AS updatedAt, blob FROM lignes WHERE espace = ? AND kind = ? AND id = ?',
          )
            .bind(espace, brute.kind, brute.id)
            .first<{ updatedAt: string; blob: string }>();

          if (!accepterLigne(stockee ?? undefined, brute)) continue;

          /* Le `seq` naît DANS la même instruction que l'écriture de la
             ligne — jamais réservé à part.
             Un numéro réservé puis écrit ouvre une fenêtre entre les deux
             allers-retours D1 : une requête A réserve 5 puis est préemptée
             avant d'écrire ; une requête B réserve 6 et écrit aussitôt ; un
             GET arrivant dans cet intervalle ne voit que la ligne 6 et avance
             le curseur du client à 6 ; quand la ligne de A s'écrit enfin avec
             `seq = 5`, plus aucun client ne redemandera jamais `seq > 5`.
             Elle est perdue, DÉFINITIVEMENT et SILENCIEUSEMENT — le même
             symptôme que la collision de numéro déjà corrigée, atteint cette
             fois par un décalage d'ORDRE DE VALIDATION plutôt que par une
             course sur la valeur. Aucune réservation préalable ne s'en sort,
             même par blocs : la fenêtre entre réserver et écrire existe dès
             qu'il y a deux allers-retours.
             En calculant `MAX(seq) + 1` à l'intérieur même de l'INSERT,
             SQLite exécute la lecture du maximum et l'écriture comme une
             seule opération sérialisée : impossible qu'un `seq` devienne
             visible avant que la ligne qui le porte le soit — l'ordre des
             `seq` EST l'ordre de validation, sans exception.
             Aucune table de compteur séparée n'existe plus dans le schéma :
             un numéro qui existerait sans ligne pour le porter serait
             justement ce point de rupture. */
          const ecrite = await env.DB.prepare(
            `INSERT INTO lignes (espace, kind, id, updated_at, seq, blob)
             VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM lignes WHERE espace = ?), ?)
             ON CONFLICT (espace, kind, id)
             DO UPDATE SET updated_at = excluded.updated_at, seq = excluded.seq, blob = excluded.blob
             RETURNING seq`,
          )
            .bind(espace, brute.kind, brute.id, brute.updatedAt, espace, brute.blob)
            .first<{ seq: number }>();
          dernierSeq = ecrite!.seq;
        }

        if (dernierSeq !== undefined) return json({ seq: dernierSeq });

        /* Aucune ligne acceptée : rendre le maximum courant SANS rien
           écrire. `depuis` reste la référence du client tant qu'il n'y a
           rien de neuf pour son espace. */
        const actuel = await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM lignes WHERE espace = ?')
          .bind(espace)
          .first<{ seq: number }>();
        return json({ seq: actuel?.seq ?? 0 });
      } catch {
        /* Une erreur D1 inattendue ne doit pas sortir de `fetch` non plus,
           pour la même raison que le `.json()` ci-dessus : sans ce filet, la
           réponse d'erreur du runtime n'aurait pas les en-têtes CORS. */
        return json({ erreur: 'serveur' }, 500);
      }
    }

    return json({ erreur: 'méthode' }, 405);
  },
};
