#!/usr/bin/env node
/* Non-régression visuelle — tâche 8.2.
 *
 *   npm run test:visual           compare aux captures de référence
 *   npm run test:visual:update    régénère le socle (décision explicite)
 *
 * POURQUOI UN SCRIPT plutôt qu'un simple `playwright test --project=visual` :
 * le socle versionné est celui de LINUX, celui que produit `ubuntu-latest` en
 * CI. Le rendu des polices diffère d'un système à l'autre — un même bouton
 * n'occupe pas les mêmes pixels sous Windows, macOS et Linux. Comparer des
 * captures de plateformes différentes produit des écarts qui ne signifient
 * rien, et le harnais devient du bruit qu'on finit par ignorer.
 *
 * Sur Linux, le script exécute Playwright directement.
 * Ailleurs, il le fait tourner dans le CONTENEUR OFFICIEL, à la version exacte
 * de `@playwright/test` : mêmes polices, même moteur, mêmes pixels qu'en CI.
 *
 * Le conteneur monte le dépôt, mais garde `node_modules` et `.next` dans des
 * volumes nommés : les binaires natifs de Windows et de Linux ne sont pas
 * interchangeables, et les écraser l'un par l'autre casserait l'un des deux
 * environnements à chaque exécution.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const VERSION = require('@playwright/test/package.json').version;
const MAJ = process.argv.includes('--update');

const argsPlaywright = ['playwright', 'test', '--project=visual'];
if (MAJ) argsPlaywright.push('--update-snapshots');

const executer = (fichier, args, options = {}) => {
  console.log(`> ${fichier} ${args.join(' ')}`);
  execFileSync(fichier, args, { stdio: 'inherit', ...options });
};

if (process.platform === 'linux') {
  executer('npx', argsPlaywright, { shell: true });
  process.exit(0);
}

console.log(
  `Plateforme ${process.platform} : exécution dans le conteneur officiel ` +
    `mcr.microsoft.com/playwright:v${VERSION}-noble.\n` +
    `Le socle de référence est celui de linux — voir tests/e2e/visual/vues.spec.ts § 3.\n`,
);

try {
  execFileSync('docker', ['info'], { stdio: 'ignore' });
} catch {
  console.error(
    'Docker ne répond pas. Démarrez-le (`docker desktop start`), ou lancez la\n' +
      'non-régression visuelle depuis une machine Linux. Sans conteneur, les\n' +
      'captures seraient prises avec les polices de cette machine et ne seraient\n' +
      'comparables à rien.',
  );
  process.exit(1);
}

/* `-v <dépôt>:/work` puis deux volumes NOMMÉS par-dessus : ils masquent les
   dossiers de l'hôte au lieu de les remplacer. Le dépôt reste modifiable — les
   captures régénérées atterrissent bien dans `tests/e2e/visual/socle/`. */
/* Le conteneur construit DANS le dépôt monté : `next build` y régénère
   `public/sw.js` (Serwist). Ce fichier est ignoré par git, donc rien ne fuit
   dans l'historique — mais il forme une paire avec `.next`, et celui du
   conteneur ne correspond plus au `.next` de l'hôte. Conséquence observée le
   17 août 2026 : les quatre contrôles PWA échouent ensuite en local, le service
   worker refusant de s'enregistrer. Ce n'est pas une régression du produit,
   c'est un artefact de cette commande — d'où le rappel imprimé à la fin. */
executer('docker', [
  'run',
  '--rm',
  '-v',
  `${process.cwd()}:/work`,
  '-v',
  'habitum-node:/work/node_modules',
  '-v',
  'habitum-next:/work/.next',
  '-w',
  '/work',
  '-e',
  'CI=1',
  `mcr.microsoft.com/playwright:v${VERSION}-noble`,
  'bash',
  '-lc',
  `npm ci --no-audit --no-fund && npm run build && npx ${argsPlaywright.join(' ')}`,
]);

console.log(
  [
    '',
    'Rappel : cette exécution a régénéré `public/sw.js` avec la construction du',
    'conteneur. Avant de relancer `npm run test:e2e` en local, refaites',
    '`npm run build` — sinon le service worker et `.next` sont dépareillés, et',
    'les contrôles PWA échouent pour cette raison-là, et pas une autre.',
  ].join(String.fromCharCode(10)),
);
