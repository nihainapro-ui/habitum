import { expect, test } from '@playwright/test';

/* D9 — aucun en-tête de sécurité n'était servi. Tâche T8.5 du backlog.
   Ce test échoue si l'un d'eux disparaît : la sécurité d'en-tête est une
   configuration qu'on oublie de vérifier, pas une qu'on oublie d'écrire. */

const ATTENDUS: Record<string, RegExp> = {
  'content-security-policy': /default-src 'self'/,
  'strict-transport-security': /max-age=\d{7,}/,
  'x-frame-options': /^DENY$/i,
  'x-content-type-options': /^nosniff$/i,
  'referrer-policy': /no-referrer/,
  'permissions-policy': /camera=\(\)/,
};

const ROUTES = ['/app', '/app/today', '/app/habits', '/app/settings'];

for (const route of ROUTES) {
  test(`les en-têtes de sécurité sont servis sur ${route}`, async ({ request }) => {
    const headers = (await request.get(route)).headers();
    for (const [nom, motif] of Object.entries(ATTENDUS)) {
      expect(headers[nom], `en-tête ${nom} absent sur ${route}`).toBeDefined();
      expect(headers[nom]!, `en-tête ${nom} sur ${route}`).toMatch(motif);
    }
  });
}

test("la CSP verrouille ce qui peut l'être aujourd'hui", async ({ request }) => {
  const csp = (await request.get('/app')).headers()['content-security-policy']!;
  expect(csp).not.toMatch(/unsafe-eval/);
  expect(csp).toMatch(/frame-ancestors 'none'/);
  expect(csp).toMatch(/object-src 'none'/);
  expect(csp).toMatch(/base-uri 'self'/);
  expect(csp).toMatch(/form-action 'self'/);
  // La promesse produit : rien ne sort de l'appareil.
  expect(csp).toMatch(/connect-src 'self'/);

  /* LA SEULE ORIGINE EXTERNE TOLÉRÉE EST LE RELAIS DE SYNCHRONISATION, et
     seulement s'il est configuré.

     Ce test disait auparavant « aucune origine tierce, quelle que soit la
     directive ». C'était juste tant que l'application ne parlait à personne ;
     ce serait aujourd'hui un test qui interdit à la fonctionnalité de
     fonctionner. Il est donc resserré plutôt que relâché : l'origine attendue
     est nommée, et toute AUTRE reste un échec.

     C'est la CSP qui a fait échouer la première tentative d'appairage réelle :
     le navigateur bloquait la requête avant qu'elle parte, et l'écran
     annonçait une panne réseau qu'aucun réseau n'expliquait. Aucun test
     unitaire ne pouvait l'attraper — ils ne servent pas d'en-têtes. */
  const relais = (process.env.NEXT_PUBLIC_SYNC_URL ?? '').replace(/\/+$/, '');
  const origines = csp.match(/https?:\/\/[^\s;]+/g) ?? [];

  if (relais) {
    expect(csp).toContain(`connect-src 'self' ${relais}`);
    expect(origines).toEqual([relais]);
  } else {
    /* Déploiement sans relais : la politique ne bouge pas d'un caractère. */
    expect(origines).toEqual([]);
  }

  /* Aucun joker, dans les deux cas. Ouvrir `connect-src` à `https:` rendrait la
     politique décorative — et c'est exactement ce qu'elle est censée
     empêcher. */
  const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';
  expect(connect).not.toContain('*');
  expect(connect).not.toMatch(/\shttps:(?!\/\/)/);
});

/* `script-src 'unsafe-inline'` est une tolérance connue, pas un oubli : sans
   elle, Next.js ne s'hydrate pas (13 scripts bloqués, mesuré le 6 août 2026).
   Ce test échouera le jour où un nonce ou des empreintes seront posés — c'est
   voulu : il faudra alors le resserrer, et non le supprimer. Voir la note de
   next.config.mjs et le défaut D12. */
test('la tolérance script-src est celle attendue, et rien de plus', async ({ request }) => {
  const csp = (await request.get('/app')).headers()['content-security-policy']!;
  const scriptSrc = csp
    .split(';')
    .find((d) => d.trim().startsWith('script-src'))!
    .trim();
  expect(scriptSrc).toBe("script-src 'self' 'unsafe-inline'");
});

/* Les COMMENTAIRES sont retirés avant la recherche — précision ajoutée à la
   phase 6, et elle n'affaiblit pas la règle.

   Le motif interdit est celui que la documentation de Next recommande pour le
   JSON-LD. La vitrine s'en passe (`lib/seo/jsonld.ts`), et trois fichiers
   expliquent en commentaire POURQUOI et comment. Sans ce filtrage, le test
   échouait sur sa propre documentation : il interdisait d'écrire le nom de ce
   qu'il interdit, et la seule façon de le satisfaire aurait été de retirer
   l'explication — c'est-à-dire de rendre la règle plus facile à casser par la
   prochaine personne qui ne saurait plus pourquoi elle existe.

   Seuls sont retirés les blocs `/* ... *\/` et les lignes ENTIÈREMENT
   commentées : jamais une fin de ligne, pour ne pas amputer du code réel
   contenant « // » dans une chaîne. */
const sansCommentaires = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((ligne) => !/^\s*(\/\/|\*)/.test(ligne))
    .join('\n');

test('aucun dangerouslySetInnerHTML dans le code applicatif', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const parcourir = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? parcourir(p) : /\.tsx?$/.test(p) ? [p] : [];
    });
  const fautifs = ['app', 'components', 'lib']
    .flatMap(parcourir)
    .filter((p) => sansCommentaires(readFileSync(p, 'utf8')).includes('dangerouslySetInnerHTML'));
  expect(fautifs, `dangerouslySetInnerHTML trouvé dans : ${fautifs.join(', ')}`).toEqual([]);
});

test("Next n'annonce plus sa présence", async ({ request }) => {
  expect((await request.get('/')).headers()['x-powered-by']).toBeUndefined();
});

test('le prototype reste servi, et noindex', async ({ request }) => {
  const res = await request.get('/prototype/Habitum.dc.html');
  expect(res.status()).toBe(200);
  expect(res.headers()['x-robots-tag']).toContain('noindex');
});
