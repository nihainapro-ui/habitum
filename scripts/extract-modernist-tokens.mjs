#!/usr/bin/env node
/* Génère styles/modernist-tokens.css par EXTRACTION du système de design
   Modernist livré dans l'archive du prototype.

   Même discipline que `extract-tokens.mjs`, et pour la même raison (D3) : des
   jetons rédigés à la main dérivent de leur source sans que rien ne le signale.
   La vitrine porte le rouge #ec3013, le rayon 0 et les filets de 2 px du
   système Modernist — décision B1, `docs/handoff/07-DECISION-B1.md`. Ces
   valeurs viennent du système, elles ne se recopient pas.

   Ce qui est extrait : le bloc `:root` du système, MOINS `--font-heading` et
   `--font-body`, qui nomment « Archivo » par un `@import` Google Fonts. La
   vitrine sert Archivo depuis son propre domaine (`lib/fonts.ts`, D7) : les
   deux familles sont donc réaffectées à la variable de `next/font`, exactement
   comme `styles/tokens.css` le fait pour Space Grotesk.

   Usage :
     node scripts/extract-modernist-tokens.mjs           écrit le fichier
     node scripts/extract-modernist-tokens.mjs --check   échoue s'il a dérivé
*/
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const RACINE_DS = 'public/prototype/_ds';
const CIBLE = 'styles/modernist-tokens.css';

/* Le dossier du système porte un identifiant : on le cherche, on ne le fige
   pas dans le script. Un seul système Modernist est livré ; s'il y en avait
   deux, mieux vaut échouer que d'en choisir un au hasard. */
const dossiers = readdirSync(RACINE_DS).filter((n) => n.startsWith('modernist-'));
if (dossiers.length !== 1) {
  console.error(`${dossiers.length} système(s) « modernist-* » dans ${RACINE_DS} — il en faut 1.`);
  process.exit(1);
}
const SOURCE = `${RACINE_DS}/${dossiers[0]}/styles.css`;
const feuille = readFileSync(SOURCE, 'utf8');

const bloc = feuille.match(/:root\s*\{([^}]*)\}/);
if (!bloc) throw new Error(`Bloc :root introuvable dans ${SOURCE}`);

/* Les deux familles sont réaffectées : le système les charge par `@import
   url(fonts.googleapis.com)`, ce que la CSP et la promesse produit interdisent. */
const REAFFECTEES = {
  'font-heading': "var(--font-archivo), 'Archivo', system-ui, sans-serif",
  'font-body': "var(--font-archivo), 'Archivo', system-ui, sans-serif",
};

const declarations = [...bloc[1].matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)/gi)].map(
  ([, nom, valeur]) => [nom, REAFFECTEES[nom] ?? valeur.trim()],
);

if (declarations.length === 0) throw new Error(`Aucun jeton extrait de ${SOURCE}`);

const sortie = [
  '/* --------------------------------------------------------------------------',
  '   Habitum — jetons du système Modernist (VITRINE UNIQUEMENT).',
  '',
  '   FICHIER GÉNÉRÉ — ne pas éditer à la main.',
  `   Source      : ${SOURCE}`,
  '   Régénérer   : node scripts/extract-modernist-tokens.mjs',
  '   Vérifier    : npm run check:modernist  (inclus dans npm run verify)',
  '',
  "   Décision B1 : l'application reste sombre (styles/tokens.css) ; la vitrine",
  '   et la documentation sont en Modernist. Les deux registres ne se mélangent',
  '   pas — ce fichier n’est importé que par les layouts racines du groupe',
  '   « site », jamais par celui de l’application.',
  '',
  '   `--font-heading` et `--font-body` sont RÉAFFECTÉES : le système les charge',
  '   depuis fonts.googleapis.com, la vitrine les sert depuis son domaine (D7).',
  '   -------------------------------------------------------------------------- */',
  '',
  ':root {',
  ...declarations.map(([n, v]) => `  --${n}: ${v};`),
  '}',
  '',
].join('\n');

if (process.argv.includes('--check')) {
  let actuel;
  try {
    actuel = readFileSync(CIBLE, 'utf8');
  } catch {
    console.error(`${CIBLE} est absent. Lancer : node scripts/extract-modernist-tokens.mjs`);
    process.exit(1);
  }
  if (actuel !== sortie) {
    console.error(
      `${CIBLE} a dérivé de ${SOURCE}.\n` +
        'Les jetons ne se rédigent pas : lancer `node scripts/extract-modernist-tokens.mjs`.',
    );
    process.exit(1);
  }
  console.log(`OK — ${CIBLE} conforme au système Modernist (${declarations.length} jetons).`);
} else {
  writeFileSync(CIBLE, sortie);
  console.log(`OK — ${CIBLE} régénéré : ${declarations.length} jetons.`);
}
