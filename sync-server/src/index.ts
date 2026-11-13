import {
  accepterLigne,
  doitRafraichir,
  ligneValide,
  MAX_CORPS,
  MAX_ECRITURES,
  MAX_LIGNES,
  seuilExpiration,
} from './logique';

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

/* Le Worker. Trois routes, aucune notion de compte.
 *
 * L'AUTHENTIFICATION EST LE PORTEUR DE L'ESPACE : 32 caractères dérivés d'un
 * code de 100 bits. Qui le connaît lit et écrit des octets chiffrés qu'il ne
 * peut de toute façon pas déchiffrer sans la clé — laquelle ne sort jamais de
 * l'appareil. Il n'y a rien d'autre à protéger.
 *
 * AUCUN JOURNAL : ni adresse IP, ni horodatage de requête. Un serveur qui ne
 * peut pas lire les données mais garde qui se connecte quand n'est pas aveugle. */

/** Le limiteur de débit de Cloudflare (`[[ratelimits]]` de wrangler.toml).
 *  Compteurs en mémoire, par emplacement, approximatifs — assez pour arrêter
 *  ce qui martèle, sans rien écrire nulle part. */
interface Limiteur {
  limit(o: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  DB: D1Database;
  /** FACULTATIF : sans lui le Worker fonctionne, sans limite de débit. Un
   *  déploiement qui oublierait la liaison ne doit pas tomber pour autant. */
  LIMITE?: Limiteur;
}

const ESPACE = /^[0-9A-HJKMNP-TV-Z]{32}$/;

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
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    },
  });

/** Note que cet espace vient de servir.
 *
 *  Appelé sur TOUTE requête utile — lecture comprise. Une lecture prouve
 *  qu'un appareil s'en sert encore, même si rien ne change : un téléphone qui
 *  ne fait que recevoir maintient son espace en vie, comme il se doit.
 *
 *  L'écriture est SAUTÉE si la marque a moins d'un jour (`doitRafraichir`).
 *  Sans cette retenue, chaque lecture coûterait une écriture — et le quota
 *  d'écritures est précisément ce que la purge cherche à ménager. */
async function marquer(env: Env, espace: string, maintenant: number): Promise<void> {
  const vu = await env.DB.prepare('SELECT touche_le AS toucheLe FROM espaces WHERE espace = ?')
    .bind(espace)
    .first<{ toucheLe: number }>();

  if (!doitRafraichir(vu?.toucheLe, maintenant)) return;

  await env.DB.prepare(
    `INSERT INTO espaces (espace, touche_le) VALUES (?, ?)
     ON CONFLICT (espace) DO UPDATE SET touche_le = excluded.touche_le`,
  )
    .bind(espace, maintenant)
    .run();
}

/** Efface les espaces dont plus aucun appareil n'a donné signe depuis six mois.
 *
 *  L'ORDRE COMPTE : les lignes d'abord, la marque ensuite. Interrompue entre
 *  les deux, la purge laisse un espace vide mais toujours marqué — il
 *  repassera au prochain tour, sans dommage. Dans l'autre sens, elle
 *  laisserait des lignes que plus aucune marque ne désigne : invisibles pour
 *  la purge, elles resteraient pour toujours. C'est exactement la fuite qu'on
 *  vient fermer. */
export async function purger(env: Env, maintenant: number): Promise<number> {
  const seuil = seuilExpiration(maintenant);

  const { results } = await env.DB.prepare('SELECT espace FROM espaces WHERE touche_le < ?')
    .bind(seuil)
    .all<{ espace: string }>();

  for (const { espace } of results) {
    await env.DB.prepare('DELETE FROM lignes WHERE espace = ?').bind(espace).run();
    await env.DB.prepare('DELETE FROM espaces WHERE espace = ?').bind(espace).run();
  }

  return results.length;
}

export default {
  /* La purge tourne SEULE, sur minuterie (`[triggers]` de wrangler.toml), et
     jamais au fil d'une requête d'utilisateur : personne ne doit attendre le
     ménage d'un autre. */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    await purger(env, Date.now());
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return json({});

    const url = new URL(req.url);
    const espace = url.pathname.split('/')[2] ?? '';
    if (!ESPACE.test(espace)) return json({ erreur: 'espace' }, 400);

    /* LA CLÉ EST L'ESPACE, JAMAIS L'ADRESSE IP. Ce serveur ne regarde pas qui
       appelle — c'est sa promesse — et la documentation de Cloudflare
       déconseille d'ailleurs l'adresse, que des milliers de gens partagent
       derrière un même opérateur mobile. Un limiteur en panne ne doit pas
       couper le service : son échec vaut un oui. */
    if (env.LIMITE) {
      const feu = await env.LIMITE.limit({ key: espace }).catch(() => ({ success: true }));
      if (!feu.success) return json({ erreur: 'limite' }, 429);
    }

    if (req.method === 'GET') {
      await marquer(env, espace, Date.now());
      const depuis = Number(url.searchParams.get('depuis') ?? 0) || 0;
      /* UNE LIGNE DE PLUS QUE LA PAGE : c'est elle qui dit s'il en reste. Sans
         elle, une page exactement pleine obligerait le client à revenir pour
         une page vide — ou, pire, à supposer qu'il n'y a plus rien. */
      const { results: lues } = await env.DB.prepare(
        'SELECT kind, id, updated_at, seq, blob FROM lignes WHERE espace = ? AND seq > ? ORDER BY seq LIMIT ?',
      )
        .bind(espace, depuis, MAX_LIGNES + 1)
        .all<{ kind: string; id: string; updated_at: string; seq: number; blob: string }>();
      const encore = lues.length > MAX_LIGNES;
      const results = encore ? lues.slice(0, MAX_LIGNES) : lues;

      /* PAGE VIDE : on rend aussi la TÊTE de l'espace. Un client dont le
         curseur la dépasse comprend que l'espace a été vidé — effacé ailleurs,
         ou purgé — et repart de zéro. Sans elle, il attendrait sans fin des
         numéros que l'espace, reparti de 1, mettra des mois à atteindre. */
      if (!results.length) {
        const tete = await env.DB.prepare(
          'SELECT COALESCE(MAX(seq), 0) AS seq FROM lignes WHERE espace = ?',
        )
          .bind(espace)
          .first<{ seq: number }>();
        return json({ seq: depuis, lignes: [], encore: false, tete: tete?.seq ?? 0 });
      }

      /* Le curseur rendu est le `seq` de la DERNIÈRE ligne servie, pas le
         plus grand `seq` de l'espace : avec la limite, il reste peut-être
         des lignes, et le client doit revenir les chercher. */
      const seq = results[results.length - 1]!.seq;
      return json({
        seq,
        encore,
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
      /* LA TAILLE SE JUGE AVANT L'ANALYSE. L'en-tête d'abord — il évite de
         lire un corps qu'on va refuser —, le texte ensuite, parce qu'un
         en-tête se ment ou s'omet. */
      if (Number(req.headers.get('content-length') ?? 0) > MAX_CORPS) {
        return json({ erreur: 'trop gros' }, 413);
      }
      let corps: { lignes?: unknown };
      try {
        const texte = await req.text();
        if (texte.length > MAX_CORPS) return json({ erreur: 'trop gros' }, 413);
        corps = JSON.parse(texte) as { lignes?: unknown };
      } catch {
        return json({ erreur: 'corps' }, 400);
      }
      if (typeof corps !== 'object' || corps === null) return json({ erreur: 'corps' }, 400);

      const lignes = Array.isArray(corps.lignes) ? corps.lignes : [];
      if (lignes.length > MAX_LIGNES) return json({ erreur: 'trop de lignes' }, 413);

      try {
        await marquer(env, espace, Date.now());

        /* L'espace a-t-il épuisé ses écritures ? `seq` en est le compte ; le
           relire coûte une ligne d'index. 507 — « plus de place » — et non
           429 : attendre n'y changera rien. */
        const compte = await env.DB.prepare(
          'SELECT COALESCE(MAX(seq), 0) AS seq FROM lignes WHERE espace = ?',
        )
          .bind(espace)
          .first<{ seq: number }>();
        if ((compte?.seq ?? 0) >= MAX_ECRITURES) return json({ erreur: 'plein' }, 507);

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
        return json({ seq: compte?.seq ?? 0 });
      } catch {
        /* Une erreur D1 inattendue ne doit pas sortir de `fetch` non plus,
           pour la même raison que le `.json()` ci-dessus : sans ce filet, la
           réponse d'erreur du runtime n'aurait pas les en-têtes CORS. */
        return json({ erreur: 'serveur' }, 500);
      }
    }

    if (req.method === 'DELETE') {
      /* EFFACEMENT D'UN ESPACE. Sans cette route, rien de ce qui a été relayé
         ne peut jamais disparaître : désappairer un appareil le rend muet mais
         laisse les octets ici, indéfiniment. Pour un produit qui met la
         confidentialité en avant, « vous ne pouvez pas reprendre ce qui est
         parti » n'est pas une position tenable.

         L'autorisation est la même que pour lire et écrire : connaître
         l'espace. C'est cohérent — qui le connaît peut déjà tout écraser
         ligne à ligne par des POST plus récents ; refuser l'effacement en
         bloc ne protégerait personne, cela rendrait seulement la reprise
         impossible à son légitime propriétaire. */
      try {
        await env.DB.prepare('DELETE FROM lignes WHERE espace = ?').bind(espace).run();
        /* La marque part AVEC les lignes : la laisser derrière ferait
           réapparaître un espace vide dans la purge pendant six mois. */
        await env.DB.prepare('DELETE FROM espaces WHERE espace = ?').bind(espace).run();
        /* `seq: 0` remet le client à l'état d'un espace neuf : le prochain
           appareil qui tire ne reçoit rien, sans cas particulier. */
        return json({ seq: 0 });
      } catch {
        return json({ erreur: 'serveur' }, 500);
      }
    }

    return json({ erreur: 'méthode' }, 405);
  },
};
