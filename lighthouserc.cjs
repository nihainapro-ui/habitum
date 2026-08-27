/* Budget de performance — tache 7.7, rendu executable en PRODUCTION le 27 aout 2026.
 *
 * POURQUOI CE FICHIER A CESSE D'ETRE DU JSON. Il codait `http://localhost:3000`
 * en dur : dans ses cinq URL, et jusque dans les motifs de son `assertMatrix`.
 * La verification 10 du plan 8 SS 8.9 — « Lighthouse en production » — n'avait
 * donc AUCUN chemin outille. C'est le meme defaut que celui corrige deux jours
 * plus tot sur les controles de requetes tierces, qui codaient `localhost` de la
 * meme facon : un controle qu'on ne peut pas passer la ou il engage.
 *
 *   npx @lhci/cli autorun                      -> local, comportement inchange
 *   BASE_URL=https://exemple.tld npm run lighthouse:prod
 *
 * Le serveur local n'est demarre QUE si l'on vise la machine locale : viser une
 * production tout en construisant l'application pour la laisser inutilisee
 * ferait payer plusieurs minutes pour rien.
 *
 * Les seuils, eux, ne bougent pas. Le SEO a 100 n'est exige que de la vitrine :
 * `/onboarding` est `noindex` par decision, et Lighthouse sanctionne une page
 * bloquee a l'indexation. Un budget uniforme aurait ete rouge par construction,
 * et on l'aurait desactive au premier echec.
 */

let base = process.env.BASE_URL || 'http://localhost:3000';
while (base.endsWith('/')) base = base.slice(0, -1);

const local = base.startsWith('http://localhost') || base.startsWith('http://127.0.0.1');

/* Echappe les points pour l'insertion dans une expression reguliere. `[.]` fait
   le meme travail qu'un point echappe, sans antislash — donc sans piege de
   double echappement le jour ou quelqu'un edite ce fichier a la main. */
const motif = (s) => s.split('.').join('[.]');

const CHEMINS = ['/', '/fonctionnalites', '/comparatifs/habitnow', '/en', '/onboarding'];

const SEUILS_COMMUNS = {
  'categories:performance': ['error', { minScore: 0.95 }],
  'categories:accessibility': ['error', { minScore: 0.95 }],
  'categories:best-practices': ['error', { minScore: 1 }],
};

module.exports = {
  ci: {
    collect: {
      ...(local
        ? { startServerCommand: 'npm run start', startServerReadyPattern: 'Ready in' }
        : {}),
      url: CHEMINS.map((chemin) => base + chemin),
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    assert: {
      assertMatrix: [
        {
          /* La vitrine : tout est exige, SEO compris. */
          matchingUrlPattern: '^' + motif(base) + '/(?!app|onboarding).*$',
          assertions: { ...SEUILS_COMMUNS, 'categories:seo': ['error', { minScore: 1 }] },
        },
        {
          /* L'application : le SEO n'y est pas asservi, `is-crawlable` est coupe. */
          matchingUrlPattern: '^' + motif(base) + '/(app|onboarding)',
          assertions: { ...SEUILS_COMMUNS, 'is-crawlable': 'off' },
        },
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/rapports' },
  },
};
