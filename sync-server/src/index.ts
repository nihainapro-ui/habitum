import { accepterLigne } from './logique';

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
         compteur de l'espace : avec la limite, il reste peut-être des lignes,
         et le client doit revenir les chercher. */
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
      const corps = (await req.json()) as { lignes?: unknown };
      const lignes = Array.isArray(corps.lignes) ? corps.lignes : [];
      if (lignes.length > MAX_LIGNES) return json({ erreur: 'trop de lignes' }, 413);

      let seq =
        (
          await env.DB.prepare('SELECT seq FROM compteurs WHERE espace = ?')
            .bind(espace)
            .first<{ seq: number }>()
        )?.seq ?? 0;

      for (const brute of lignes as { kind: string; id: string; updatedAt: string; blob: string }[]) {
        if (typeof brute?.blob !== 'string' || typeof brute?.updatedAt !== 'string') continue;

        const stockee = await env.DB.prepare(
          'SELECT updated_at AS updatedAt, blob FROM lignes WHERE espace = ? AND kind = ? AND id = ?',
        )
          .bind(espace, brute.kind, brute.id)
          .first<{ updatedAt: string; blob: string }>();

        if (!accepterLigne(stockee ?? undefined, brute)) continue;

        seq += 1;
        await env.DB.prepare(
          `INSERT INTO lignes (espace, kind, id, updated_at, seq, blob)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (espace, kind, id)
           DO UPDATE SET updated_at = excluded.updated_at, seq = excluded.seq, blob = excluded.blob`,
        )
          .bind(espace, brute.kind, brute.id, brute.updatedAt, seq, brute.blob)
          .run();
      }

      await env.DB.prepare(
        'INSERT INTO compteurs (espace, seq) VALUES (?, ?) ON CONFLICT (espace) DO UPDATE SET seq = excluded.seq',
      )
        .bind(espace, seq)
        .run();

      return json({ seq });
    }

    return json({ erreur: 'méthode' }, 405);
  },
};
