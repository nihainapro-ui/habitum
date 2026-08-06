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

const ROUTES = ['/', '/today', '/habits', '/settings'];

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
  const csp = (await request.get('/')).headers()['content-security-policy']!;
  expect(csp).not.toMatch(/unsafe-eval/);
  expect(csp).toMatch(/frame-ancestors 'none'/);
  expect(csp).toMatch(/object-src 'none'/);
  expect(csp).toMatch(/base-uri 'self'/);
  expect(csp).toMatch(/form-action 'self'/);
  // La promesse produit : rien ne sort de l'appareil.
  expect(csp).toMatch(/connect-src 'self'/);
  // Aucune origine tierce, quelle que soit la directive.
  expect(csp).not.toMatch(/https?:\/\//);
});

/* `script-src 'unsafe-inline'` est une tolérance connue, pas un oubli : sans
   elle, Next.js ne s'hydrate pas (13 scripts bloqués, mesuré le 6 août 2026).
   Ce test échouera le jour où un nonce ou des empreintes seront posés — c'est
   voulu : il faudra alors le resserrer, et non le supprimer. Voir la note de
   next.config.mjs et le défaut D12. */
test('la tolérance script-src est celle attendue, et rien de plus', async ({ request }) => {
  const csp = (await request.get('/')).headers()['content-security-policy']!;
  const scriptSrc = csp
    .split(';')
    .find((d) => d.trim().startsWith('script-src'))!
    .trim();
  expect(scriptSrc).toBe("script-src 'self' 'unsafe-inline'");
});

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
    .filter((p) => readFileSync(p, 'utf8').includes('dangerouslySetInnerHTML'));
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
